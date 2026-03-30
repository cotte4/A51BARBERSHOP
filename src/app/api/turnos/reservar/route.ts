import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { productos, turnos, turnosDisponibilidad, turnosExtras } from "@/db/schema";
import { TURNO_DURACIONES, enforcePublicReservaRateLimit, findClientByPhone, isFechaCerrada, resolvePublicBarberoBySlug } from "@/lib/turnos";

const extraSchema = z.object({
  productoId: z.string().uuid(),
  cantidad: z.number().int().positive(),
});

const reservaSchema = z.object({
  slug: z.string().min(1),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  horaInicio: z.string().regex(/^\d{2}:\d{2}$/),
  duracionMinutos: z.union([z.literal(45), z.literal(60)]),
  clienteNombre: z.string().trim().min(2),
  clienteTelefonoRaw: z.string().trim().optional().or(z.literal("")),
  notaCliente: z.string().trim().optional().or(z.literal("")),
  sugerenciaCancion: z.string().trim().optional().or(z.literal("")),
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
    return Response.json({ error: "Datos de reserva invÃ¡lidos." }, { status: 400 });
  }

  const barbero = await resolvePublicBarberoBySlug(parsed.data.slug);
  if (!barbero) {
    return Response.json({ error: "Slug invÃ¡lido." }, { status: 404 });
  }

  const rateLimit = await enforcePublicReservaRateLimit(getRequestIp(request));
  if (!rateLimit.allowed) {
    return Response.json({ error: "Llegaste al lÃ­mite de reservas por hora. IntentÃ¡ mÃ¡s tarde." }, { status: 429 });
  }

  if (await isFechaCerrada(parsed.data.fecha)) {
    return Response.json({ error: "Ese dÃ­a ya estÃ¡ cerrado y no acepta reservas." }, { status: 409 });
  }

  const horaInicio = `${parsed.data.horaInicio}:00`;

  const [slot, ocupacionExistente, extrasActivos, clientMatch] = await Promise.all([
    db
      .select({ id: turnosDisponibilidad.id })
      .from(turnosDisponibilidad)
      .where(
        and(
          eq(turnosDisponibilidad.barberoId, barbero.id),
          eq(turnosDisponibilidad.fecha, parsed.data.fecha),
          eq(turnosDisponibilidad.horaInicio, horaInicio),
          eq(turnosDisponibilidad.duracionMinutos, parsed.data.duracionMinutos)
        )
      )
      .limit(1),
    db
      .select({ id: turnos.id })
      .from(turnos)
      .where(
        and(
          eq(turnos.barberoId, barbero.id),
          eq(turnos.fecha, parsed.data.fecha),
          eq(turnos.horaInicio, horaInicio),
          inArray(turnos.estado, ["pendiente", "confirmado"])
        )
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
    return Response.json({ error: "Ese horario ya no estÃ¡ disponible." }, { status: 409 });
  }
  if (ocupacionExistente[0]) {
    return Response.json({ error: "Ese horario acaba de ocuparse. ElegÃ­ otro." }, { status: 409 });
  }

  const activeExtraIds = new Set(extrasActivos.map((extra) => extra.id));
  const invalidExtra = parsed.data.extras.find((extra) => !activeExtraIds.has(extra.productoId));
  if (invalidExtra) {
    return Response.json({ error: "Uno de los extras elegidos ya no estÃ¡ disponible." }, { status: 400 });
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
        fecha: parsed.data.fecha,
        horaInicio,
        duracionMinutos: parsed.data.duracionMinutos,
        estado: "pendiente",
        notaCliente: parsed.data.notaCliente || null,
        sugerenciaCancion: parsed.data.sugerenciaCancion || null,
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
    console.error("Error creando turno pÃºblico:", error);
    return Response.json({ error: "No pude guardar la reserva. IntentÃ¡ de nuevo." }, { status: 500 });
  }

  return Response.json({ ok: true });
}
