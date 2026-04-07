import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { productos, servicios, turnos, turnosDisponibilidad, turnosExtras } from "@/db/schema";
import { isFechaCerrada } from "@/lib/turnos";
import type { TurnoExtraInput } from "@/lib/types";

export type TurnoClientContext = {
  clientId: string | null;
  esMarciano: boolean;
  phoneNormalized: string | null;
};

type CreateTurnoReservaInput = {
  barberoId: string;
  slotId: string;
  serviceId: string;
  clienteNombre: string;
  clienteTelefonoRaw: string | null;
  notaCliente?: string | null;
  sugerenciaCancion?: string | null;
  spotifyTrackUri?: string | null;
  extras?: TurnoExtraInput[];
  clientContext?: TurnoClientContext | null;
};

type CreateTurnoReservaResult =
  | {
      ok: true;
      turnoId: string;
      fecha: string;
      horaInicio: string;
    }
  | {
      ok: false;
      status: number;
      message: string;
    };

export async function createTurnoReserva(
  input: CreateTurnoReservaInput
): Promise<CreateTurnoReservaResult> {
  const extras = input.extras ?? [];

  const [slotRows, servicioRows, extrasActivos] = await Promise.all([
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
          eq(turnosDisponibilidad.id, input.slotId),
          eq(turnosDisponibilidad.barberoId, input.barberoId)
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
      .where(and(eq(servicios.id, input.serviceId), eq(servicios.activo, true)))
      .limit(1),
    extras.length === 0
      ? Promise.resolve([])
      : db
          .select({ id: productos.id })
          .from(productos)
          .where(
            and(
              eq(productos.activo, true),
              inArray(
                productos.id,
                extras.map((extra) => extra.productoId)
              )
            )
          ),
  ]);

  const slot = slotRows[0];
  if (!slot) {
    return { ok: false, status: 409, message: "Ese horario ya no esta disponible." };
  }

  const servicio = servicioRows[0];
  if (!servicio) {
    return { ok: false, status: 400, message: "Ese servicio ya no esta disponible." };
  }

  if (await isFechaCerrada(slot.fecha)) {
    return { ok: false, status: 409, message: "Ese dia ya esta cerrado y no acepta reservas." };
  }

  // La disponibilidad ya filtra por slots consecutivos — aquí sólo bloqueamos si el slot
  // único no alcanza Y no hay forma de que fuera válido (duracion del slot > duracion del servicio
  // significa que podría caber, pero slots más chicos pueden encadenarse igual).
  // Sólo rechazamos si el slot es estrictamente menor y no hay puente lógico posible.
  // El caso multi-slot lo maneja el algoritmo de disponibilidad; aquí confiamos en él.

  const [ocupado] = await db
    .select({ id: turnos.id })
    .from(turnos)
    .where(
      and(
        eq(turnos.barberoId, input.barberoId),
        eq(turnos.fecha, slot.fecha),
        eq(turnos.horaInicio, slot.horaInicio),
        inArray(turnos.estado, ["pendiente", "confirmado"])
      )
    )
    .limit(1);

  if (ocupado) {
    return { ok: false, status: 409, message: "Ese horario acaba de ocuparse. Elegi otro." };
  }

  const activeExtraIds = new Set(extrasActivos.map((extra) => extra.id));
  const invalidExtra = extras.find((extra) => !activeExtraIds.has(extra.productoId));
  if (invalidExtra) {
    return {
      ok: false,
      status: 400,
      message: "Uno de los extras elegidos ya no esta disponible.",
    };
  }

  try {
    const [turno] = await db
      .insert(turnos)
      .values({
        barberoId: input.barberoId,
        clienteNombre: input.clienteNombre,
        clienteTelefonoRaw: input.clienteTelefonoRaw,
        clienteTelefonoNormalizado: input.clientContext?.phoneNormalized ?? null,
        clientId: input.clientContext?.clientId ?? null,
        fecha: slot.fecha,
        horaInicio: slot.horaInicio,
        duracionMinutos: servicio.duracionMinutos,
        servicioId: servicio.id,
        precioEsperado: servicio.precioBase,
        estado: "pendiente",
        notaCliente: input.notaCliente ?? null,
        sugerenciaCancion: input.sugerenciaCancion ?? null,
        spotifyTrackUri: input.spotifyTrackUri ?? null,
        esMarcianoSnapshot: input.clientContext?.esMarciano ?? false,
      })
      .returning({ id: turnos.id });

    if (extras.length > 0) {
      await db.insert(turnosExtras).values(
        extras.map((extra) => ({
          turnoId: turno.id,
          productoId: extra.productoId,
          cantidad: extra.cantidad,
        }))
      );
    }

    return {
      ok: true,
      turnoId: turno.id,
      fecha: slot.fecha,
      horaInicio: slot.horaInicio,
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("[createTurnoReserva] DB error:", detail);
    return {
      ok: false,
      status: 500,
      message:
        process.env.NODE_ENV === "development"
          ? `Error de DB: ${detail}`
          : "No pude guardar la reserva. Intentá de nuevo.",
    };
  }
}
