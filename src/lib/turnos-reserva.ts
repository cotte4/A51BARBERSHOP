import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { productos, servicios, turnos, turnosExtras } from "@/db/schema";
import { leerHorarioId } from "@/lib/horario";
import { canReserveOnPublicFecha, isHorarioLibre } from "@/lib/turnos";
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

  // El horario llega como "fecha|hora" (src/lib/horario.ts): se vuelve a calcular acá, justo antes
  // de guardar, porque entre que el cliente lo vio y lo confirmó otro pudo haberlo tomado.
  const slot = leerHorarioId(input.slotId);
  if (!slot) {
    return { ok: false, status: 400, message: "Ese horario no es valido. Elegi otro." };
  }

  if (!canReserveOnPublicFecha(slot.fecha)) {
    return {
      ok: false,
      status: 409,
      message: "Los turnos se reservan desde mañana y hasta 30 dias adelante.",
    };
  }

  const [servicioRows, extrasActivos] = await Promise.all([
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

  const servicio = servicioRows[0];
  if (!servicio) {
    return { ok: false, status: 400, message: "Ese servicio ya no esta disponible." };
  }

  if (!(await isHorarioLibre(input.barberoId, slot.fecha, slot.hora, servicio.duracionMinutos))) {
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
        horaInicio: slot.hora,
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
      horaInicio: slot.hora,
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
