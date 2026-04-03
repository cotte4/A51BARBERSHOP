import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { productos, servicios, turnos, turnosDisponibilidad, turnosExtras } from "@/db/schema";
import {
  enforcePublicReservaRateLimit,
  findClientByPhone,
  isFechaCerrada,
  resolvePublicBarberoBySlug,
} from "@/lib/turnos";

const extraSchema = z.object({
  productoId: z.string().uuid(),
  cantidad: z.number().int().positive(),
});

const reservaSchema = z.object({
  slug: z.string().min(1),
  slotId: z.string().uuid(),
  serviceId: z.string().uuid(),
  clienteNombre: z.string().trim().min(2),
  clienteTelefonoRaw: z.string().trim().optional().or(z.literal("")),
  notaCliente: z.string().trim().optional().or(z.literal("")),
  sugerenciaCancion: z.string().trim().optional().or(z.literal("")),
  spotifyTrackUri: z.string().trim().regex(/^spotify:track:[A-Za-z0-9]+$/).optional().or(z.literal("")),
  extras: z.array(extraSchema).default([]),
});

function getRequestIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (!forwarded) {
    return null;
  }
  return forwarded.split(",")[0]?.trim() ?? null;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = reservaSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Datos de reserva inválidos." }, { status: 400 });
  }

  const barbero = await resolvePublicBarberoBySlug(parsed.data.slug);
  if (!barbero) {
    return Response.json({ error: "Slug inválido." }, { status: 404 });
  }

  const rateLimit = await enforcePublicReservaRateLimit(getRequestIp(request));
  if (!rateLimit.allowed) {
    return Response.json({ error: "Llegaste al límite de reservas por hora. Intentá más tarde." }, { status: 429 });
  }

  const [slot, servicio, extrasActivos, clientMatch] = await Promise.all([
    db
      .select({
        id: turnosDisponibilidad.id,
        fecha: turnosDisponibilidad.fecha,
        horaInicio: turnosDisponibilidad.horaInicio,
        duracionMinutos: turnosDisponibilidad.duracionMinutos,
      })
      .from(turnosDisponibilidad)
      .where(
        and(
          eq(turnosDisponibilidad.id, parsed.data.slotId),
          eq(turnosDisponibilidad.barberoId, barbero.id)
        )
      )
      .limit(1),
    db
      .select({
        id: servicios.id,
        precioBase: servicios.precioBase,
        duracionMinutos: servicios.duracionMinutos,
      })
      .from(servicios)
      .where(
        and(eq(servicios.id, parsed.data.serviceId), eq(servicios.activo, true))
      )
      .limit(1),
    parsed.data.extras.length === 0
      ? Promise.resolve([])
      : db
          .select({ id: productos.id })
          .from(productos)
          .where(
            and(
              eq(productos.activo, true),
              inArray(
                productos.id,
                parsed.data.extras.map((extra) => extra.productoId)
              )
            )
          ),
    findClientByPhone(parsed.data.clienteTelefonoRaw ?? null),
  ]);

  if (!slot[0]) {
    return Response.json({ error: "Ese horario ya no está disponible." }, { status: 409 });
  }

  if (!servicio[0]) {
    return Response.json({ error: "Ese servicio ya no está disponible." }, { status: 400 });
  }

  if (await isFechaCerrada(slot[0].fecha)) {
    return Response.json({ error: "Ese día ya está cerrado y no acepta reservas." }, { status: 409 });
  }

  if (slot[0].duracionMinutos < servicio[0].duracionMinutos) {
    return Response.json({ error: "Ese horario no alcanza para la duración del servicio." }, { status: 409 });
  }

  const [ocupado] = await db
    .select({ id: turnos.id })
    .from(turnos)
    .where(
      and(
        eq(turnos.barberoId, barbero.id),
        eq(turnos.fecha, slot[0].fecha),
        eq(turnos.horaInicio, slot[0].horaInicio),
        inArray(turnos.estado, ["pendiente", "confirmado"])
      )
    )
    .limit(1);

  if (ocupado) {
    return Response.json({ error: "Ese horario acaba de ocuparse. Elegí otro." }, { status: 409 });
  }

  const activeExtraIds = new Set(extrasActivos.map((extra) => extra.id));
  const invalidExtra = parsed.data.extras.find((extra) => !activeExtraIds.has(extra.productoId));
  if (invalidExtra) {
    return Response.json({ error: "Uno de los extras elegidos ya no está disponible." }, { status: 400 });
  }

  try {
    const [turno] = await db
      .insert(turnos)
      .values({
        barberoId: barbero.id,
        clienteNombre: parsed.data.clienteNombre,
        clienteTelefonoRaw: parsed.data.clienteTelefonoRaw || null,
        clienteTelefonoNormalizado: clientMatch?.phoneNormalized ?? null,
        clientId: clientMatch?.clientId ?? null,
        fecha: slot[0].fecha,
        horaInicio: slot[0].horaInicio,
        duracionMinutos: servicio[0].duracionMinutos,
        servicioId: servicio[0].id,
        precioEsperado: servicio[0].precioBase,
        estado: "pendiente",
        notaCliente: parsed.data.notaCliente || null,
        sugerenciaCancion: parsed.data.sugerenciaCancion || null,
        spotifyTrackUri: parsed.data.spotifyTrackUri || null,
        esMarcianoSnapshot: clientMatch?.esMarciano ?? false,
      })
      .returning({ id: turnos.id });

    if (parsed.data.extras.length > 0) {
      await db.insert(turnosExtras).values(
        parsed.data.extras.map((extra) => ({
          turnoId: turno.id,
          productoId: extra.productoId,
          cantidad: extra.cantidad,
        }))
      );
    }
  } catch (error) {
    console.error("Error creando turno público:", error);
    return Response.json({ error: "No pude guardar la reserva. Intentá de nuevo." }, { status: 500 });
  }

  return Response.json({ ok: true });
}
