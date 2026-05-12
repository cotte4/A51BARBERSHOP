import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { productos, servicios, turnos, turnosDisponibilidad, turnosExtras } from "@/db/schema";
import { canReserveOnPublicFecha, isFechaCerrada } from "@/lib/turnos";
import {
  normalizeHora,
  overlapsTurnoInterval,
  timeToMinutes,
  type TurnoInterval,
} from "@/lib/turno-intervals";
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

  if (!canReserveOnPublicFecha(slot.fecha)) {
    return {
      ok: false,
      status: 409,
      message: "La reserva publica solo acepta turnos desde manana en adelante.",
    };
  }

  const servicio = servicioRows[0];
  if (!servicio) {
    return { ok: false, status: 400, message: "Ese servicio ya no esta disponible." };
  }

  if (await isFechaCerrada(slot.fecha)) {
    return { ok: false, status: 409, message: "Ese dia ya esta cerrado y no acepta reservas." };
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
    return await db.transaction(async (tx): Promise<CreateTurnoReservaResult> => {
      const lockedSlots = await tx
        .select({
          id: turnosDisponibilidad.id,
          fecha: turnosDisponibilidad.fecha,
          horaInicio: turnosDisponibilidad.horaInicio,
          duracionMinutos: turnosDisponibilidad.duracionMinutos,
        })
        .from(turnosDisponibilidad)
        .where(
          and(
            eq(turnosDisponibilidad.barberoId, input.barberoId),
            eq(turnosDisponibilidad.fecha, slot.fecha)
          )
        )
        .orderBy(turnosDisponibilidad.horaInicio)
        .for("update");

      const lockedSlot = lockedSlots.find((candidate) => candidate.id === slot.id);
      if (!lockedSlot) {
        return { ok: false, status: 409, message: "Ese horario ya no esta disponible." };
      }

      const ocupados = await tx
        .select({
          horaInicio: turnos.horaInicio,
          duracionMinutos: turnos.duracionMinutos,
        })
        .from(turnos)
        .where(
          and(
            eq(turnos.barberoId, input.barberoId),
            eq(turnos.fecha, lockedSlot.fecha),
            inArray(turnos.estado, ["pendiente", "confirmado"])
          )
        )
        .for("update");

      const ocupadosActivos: TurnoInterval[] = ocupados.map((turno) => ({
        horaInicio: normalizeHora(turno.horaInicio),
        duracionMinutos: turno.duracionMinutos,
      }));

      if (overlapsTurnoInterval(lockedSlot.horaInicio, servicio.duracionMinutos, ocupadosActivos)) {
        return { ok: false, status: 409, message: "Ese horario acaba de ocuparse. Elegi otro." };
      }

      const slotsOrdenados = lockedSlots
        .map((candidate) => ({ ...candidate, horaInicio: normalizeHora(candidate.horaInicio) }))
        .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
      const startIndex = slotsOrdenados.findIndex((candidate) => candidate.id === lockedSlot.id);
      const startMin = timeToMinutes(lockedSlot.horaInicio);
      const requiredEnd = startMin + servicio.duracionMinutos;
      let coveredUntil = startMin;

      for (let i = startIndex; i >= 0 && i < slotsOrdenados.length; i++) {
        const candidate = slotsOrdenados[i];
        const candidateStart = timeToMinutes(candidate.horaInicio);
        if (candidateStart > coveredUntil) break;

        const usableDuration = Math.min(candidate.duracionMinutos, requiredEnd - candidateStart);
        if (overlapsTurnoInterval(candidate.horaInicio, usableDuration, ocupadosActivos)) break;

        coveredUntil = Math.max(coveredUntil, candidateStart + candidate.duracionMinutos);
        if (coveredUntil >= requiredEnd) break;
      }

      if (coveredUntil < requiredEnd) {
        return { ok: false, status: 409, message: "Ese horario ya no esta disponible." };
      }

      const [turno] = await tx
        .insert(turnos)
        .values({
          barberoId: input.barberoId,
          clienteNombre: input.clienteNombre,
          clienteTelefonoRaw: input.clienteTelefonoRaw,
          clienteTelefonoNormalizado: input.clientContext?.phoneNormalized ?? null,
          clientId: input.clientContext?.clientId ?? null,
          fecha: lockedSlot.fecha,
          horaInicio: lockedSlot.horaInicio,
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
        await tx.insert(turnosExtras).values(
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
        fecha: lockedSlot.fecha,
        horaInicio: lockedSlot.horaInicio,
      };
    });
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
