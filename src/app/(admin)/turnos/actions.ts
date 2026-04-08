"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { pantallaEvents, turnos, turnosDisponibilidad } from "@/db/schema";
import { handleClienteLlego } from "@/lib/music-engine";
import { getTurnosActorContext } from "@/lib/turnos-access";
import {
  TURNO_DURACIONES,
  findClientByPhone,
  getBarberoAgendaProfile,
  getFechaHoyArgentina,
  isFechaCerrada,
} from "@/lib/turnos";

export type TurnoActionState = {
  error?: string;
  success?: string;
};

export type QuickTurnoCreateState = {
  error?: string;
  fieldErrors?: {
    clienteNombre?: string;
  };
  success?: boolean;
};

function normalizeTimeInput(value: string): string {
  return value.length === 5 ? `${value}:00` : value;
}

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(value: number): string {
  const hours = Math.floor(value / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (value % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}:00`;
}

async function loadTurno(turnoId: string) {
  const [turno] = await db.select().from(turnos).where(eq(turnos.id, turnoId)).limit(1);
  return turno ?? null;
}

async function getManagedTurno(turnoId: string) {
  const actor = await getTurnosActorContext();
  if (!actor) {
    return { actor: null, turno: null, allowed: false };
  }

  const turno = await loadTurno(turnoId);
  if (!turno) {
    return { actor, turno: null, allowed: false };
  }

  return {
    actor,
    turno,
    allowed: actor.isAdmin || actor.barberoId === turno.barberoId,
  };
}

export async function confirmarTurnoAction(
  turnoId: string,
  _prevState: TurnoActionState
): Promise<TurnoActionState> {
  const { turno, allowed } = await getManagedTurno(turnoId);
  if (!turno) {
    return { error: "Turno no encontrado." };
  }
  if (!allowed) {
    return { error: "Solo podes gestionar tus propios turnos." };
  }
  if (turno.estado !== "pendiente") {
    return { error: "Solo se pueden confirmar turnos pendientes." };
  }

  await db
    .update(turnos)
    .set({
      estado: "confirmado",
      updatedAt: new Date(),
      motivoCancelacion: null,
      prioridadAbsoluta: turno.esMarcianoSnapshot,
    })
    .where(eq(turnos.id, turnoId));

  revalidatePath("/turnos");
  revalidatePath("/hoy");
  revalidatePath("/turnos/disponibilidad");
  return {};
}

export async function rechazarTurnoAction(
  turnoId: string,
  _prevState: TurnoActionState,
  formData: FormData
): Promise<TurnoActionState> {
  const motivo = String(formData.get("motivoCancelacion") ?? "").trim();
  if (!motivo) {
    return { error: "El motivo de rechazo es obligatorio." };
  }

  const { turno, allowed } = await getManagedTurno(turnoId);
  if (!turno) {
    return { error: "Turno no encontrado." };
  }
  if (!allowed) {
    return { error: "Solo podes gestionar tus propios turnos." };
  }
  if (turno.estado === "cancelado" || turno.estado === "completado") {
    return { error: "Ese turno ya no puede rechazarse." };
  }

  await db
    .update(turnos)
    .set({ estado: "cancelado", motivoCancelacion: motivo, updatedAt: new Date() })
    .where(eq(turnos.id, turnoId));

  revalidatePath("/turnos");
  revalidatePath("/hoy");
  revalidatePath("/turnos/disponibilidad");
  return {};
}

export async function completarTurnoAction(
  turnoId: string,
  _prevState: TurnoActionState
): Promise<TurnoActionState> {
  const { turno, allowed } = await getManagedTurno(turnoId);
  if (!turno) {
    return { error: "Turno no encontrado." };
  }
  if (!allowed) {
    return { error: "Solo podes gestionar tus propios turnos." };
  }
  if (turno.estado !== "confirmado") {
    return { error: "Solo se pueden completar turnos confirmados." };
  }

  await db
    .update(turnos)
    .set({ estado: "completado", updatedAt: new Date() })
    .where(eq(turnos.id, turnoId));

  revalidatePath("/turnos");
  revalidatePath("/hoy");
  revalidatePath("/turnos/disponibilidad");
  return {};
}

export async function clienteLlegoAction(
  turnoId: string,
  _prevState: TurnoActionState
): Promise<TurnoActionState> {
  const { actor, turno, allowed } = await getManagedTurno(turnoId);
  if (!turno) {
    return { error: "Turno no encontrado." };
  }
  if (!actor) {
    return { error: "Necesitas iniciar sesion para avisar la llegada." };
  }
  if (!allowed) {
    return { error: "Solo podes gestionar tus propios turnos." };
  }
  if (turno.estado !== "confirmado") {
    return { error: "Solo podes avisar llegada en turnos confirmados." };
  }

  const cancion = turno.sugerenciaCancion?.trim();
  if (!cancion) {
    return { error: "Ese turno no tiene sugerencia de cancion." };
  }

  try {
    await db.insert(pantallaEvents).values({
      turnoId,
      cancion,
      clienteNombre: turno.clienteNombre,
    });

    const result = await handleClienteLlego({
      turnoId,
      clienteNombre: turno.clienteNombre,
      cancion,
      spotifyTrackUri: turno.spotifyTrackUri ?? null,
      barberoId: turno.barberoId,
      triggeredByUserId: actor.userId,
      triggeredByBarberoId: actor.barberoId,
    });

    revalidatePath("/turnos");
    revalidatePath("/musica");
    revalidatePath("/configuracion/musica");

    if (result.kind === "playback_started") {
      return { success: "Suena ahora en el local. La llegada ya disparo reproduccion real." };
    }

    if (result.kind === "queued_in_jam") {
      return { success: "La llegada entro a Jam y ya participa de la cola compartida." };
    }

    if (result.kind === "blocked_by_manual_dj") {
      return { success: "DJ esta activo. La cancion quedo como propuesta para no pisar al operador." };
    }

    if (result.kind === "waiting_for_recovery") {
      return { success: `La llegada quedo visible, pero Musica espera recuperacion: ${result.reason}` };
    }

    if (result.kind === "missing_track_uri") {
      return {
        success:
          "La llegada quedo registrada, pero falta vincular la track de Spotify para sonar automatico.",
      };
    }

    return { success: "La llegada quedo como propuesta en Musica." };
  } catch (error) {
    console.error("Error procesando llegada en turnos:", error);
    return { error: "No pude procesar la llegada ni hablar con Musica. Intenta de nuevo." };
  }
}

export async function crearDisponibilidadAction(
  barberoId: string,
  _prevState: TurnoActionState,
  formData: FormData
): Promise<TurnoActionState> {
  const actor = await getTurnosActorContext();
  if (!actor) {
    return { error: "Necesitas iniciar sesion para gestionar disponibilidad." };
  }
  if (!actor.isAdmin && actor.barberoId !== barberoId) {
    return { error: "Solo podes gestionar tu propia disponibilidad." };
  }

  const fecha = String(formData.get("fecha") ?? "");
  const horaInicio = normalizeTimeInput(String(formData.get("horaInicio") ?? ""));
  const horaFinRaw = String(formData.get("horaFin") ?? "").trim();
  const horaFin = horaFinRaw ? normalizeTimeInput(horaFinRaw) : "";
  const duracionMinutos = Number(formData.get("duracionMinutos") ?? 0);

  if (!fecha || !horaInicio || !TURNO_DURACIONES.includes(duracionMinutos as 45 | 60)) {
    return { error: "Completa fecha, hora y duracion validas." };
  }
  if (fecha < getFechaHoyArgentina()) {
    return { error: "No podes crear disponibilidad en fechas pasadas." };
  }
  if (await isFechaCerrada(fecha)) {
    return { error: "Ese dia ya tiene cierre y no admite nuevos turnos." };
  }

  const startMinutes = timeToMinutes(horaInicio);
  const endMinutes = horaFin ? timeToMinutes(horaFin) : startMinutes + duracionMinutos;

  if (endMinutes <= startMinutes) {
    return { error: "La hora de fin debe ser posterior al inicio." };
  }

  const generatedSlots = [];
  for (let cursor = startMinutes; cursor + duracionMinutos <= endMinutes; cursor += duracionMinutos) {
    generatedSlots.push({
      barberoId,
      fecha,
      horaInicio: minutesToTime(cursor),
      duracionMinutos,
    });
  }

  if (generatedSlots.length === 0) {
    return { error: "Ese rango no alcanza para generar ningun slot con el intervalo elegido." };
  }

  let createdCount = 0;

  try {
    for (const slot of generatedSlots) {
      const existing = await db
        .select({ id: turnosDisponibilidad.id })
        .from(turnosDisponibilidad)
        .where(
          and(
            eq(turnosDisponibilidad.barberoId, slot.barberoId),
            eq(turnosDisponibilidad.fecha, slot.fecha),
            eq(turnosDisponibilidad.horaInicio, slot.horaInicio)
          )
        )
        .limit(1);

      if (existing[0]) {
        continue;
      }

      await db.insert(turnosDisponibilidad).values(slot);
      createdCount += 1;
    }
  } catch (error) {
    console.error("Error creando disponibilidad:", error);
    return { error: "No pude guardar la jornada. Intenta de nuevo." };
  }

  if (createdCount === 0) {
    return { error: "Ese rango ya estaba cargado completo." };
  }

  const agendaBarbero = await getBarberoAgendaProfile(barberoId);

  revalidatePath("/turnos");
  revalidatePath("/hoy");
  revalidatePath("/turnos/disponibilidad");
  if (agendaBarbero?.publicSlug) {
    revalidatePath(`/reservar/${agendaBarbero.publicSlug}`);
  }
  return {
    success:
      createdCount === 1
        ? "Se agrego 1 slot."
        : `Se generaron ${createdCount} slots para la jornada.`,
  };
}

export async function eliminarDisponibilidadAction(slotId: string): Promise<void> {
  const actor = await getTurnosActorContext();
  if (!actor) {
    return;
  }

  const [slot] = await db
    .select()
    .from(turnosDisponibilidad)
    .where(eq(turnosDisponibilidad.id, slotId))
    .limit(1);
  if (!slot) {
    return;
  }
  if (!actor.isAdmin && actor.barberoId !== slot.barberoId) {
    return;
  }

  const [ocupado] = await db
    .select({ id: turnos.id })
    .from(turnos)
    .where(
      and(
        eq(turnos.barberoId, slot.barberoId),
        eq(turnos.fecha, slot.fecha),
        eq(turnos.horaInicio, slot.horaInicio),
        inArray(turnos.estado, ["confirmado", "completado"])
      )
    )
    .limit(1);

  if (ocupado) {
    return;
  }

  await db.delete(turnosDisponibilidad).where(eq(turnosDisponibilidad.id, slotId));

  const agendaBarbero = await getBarberoAgendaProfile(slot.barberoId);

  revalidatePath("/turnos");
  revalidatePath("/hoy");
  revalidatePath("/turnos/disponibilidad");
  if (agendaBarbero?.publicSlug) {
    revalidatePath(`/reservar/${agendaBarbero.publicSlug}`);
  }
}

export async function crearTurnoRapidoAction(
  barberoId: string,
  fecha: string,
  horaInicio: string,
  duracionMinutos: number,
  _prevState: QuickTurnoCreateState,
  formData: FormData
): Promise<QuickTurnoCreateState> {
  const actor = await getTurnosActorContext();
  if (!actor) {
    return { error: "Debes iniciar sesion para crear turnos." };
  }
  if (!actor.isAdmin && actor.barberoId !== barberoId) {
    return { error: "Solo podes crear turnos para tu propia agenda." };
  }

  const clienteNombre = String(formData.get("clienteNombre") ?? "").trim();
  const clienteTelefonoRaw = String(formData.get("clienteTelefonoRaw") ?? "").trim();

  if (!clienteNombre) {
    return {
      fieldErrors: {
        clienteNombre: "El nombre del cliente es obligatorio.",
      },
    };
  }

  if (fecha < getFechaHoyArgentina()) {
    return { error: "No podes cargar turnos en fechas pasadas." };
  }

  if (await isFechaCerrada(fecha)) {
    return { error: "Ese dia ya fue cerrado y no admite nuevos turnos." };
  }

  const horaNormalizada = normalizeTimeInput(horaInicio);

  const [slotDisponible, ocupado, clientMatch] = await Promise.all([
    db
      .select({ id: turnosDisponibilidad.id })
      .from(turnosDisponibilidad)
      .where(
        and(
          eq(turnosDisponibilidad.barberoId, barberoId),
          eq(turnosDisponibilidad.fecha, fecha),
          eq(turnosDisponibilidad.horaInicio, horaNormalizada),
          eq(turnosDisponibilidad.duracionMinutos, duracionMinutos)
        )
      )
      .limit(1),
    db
      .select({ id: turnos.id })
      .from(turnos)
      .where(
        and(
          eq(turnos.barberoId, barberoId),
          eq(turnos.fecha, fecha),
          eq(turnos.horaInicio, horaNormalizada),
          inArray(turnos.estado, ["pendiente", "confirmado"])
        )
      )
      .limit(1),
    findClientByPhone(clienteTelefonoRaw || null),
  ]);

  if (!slotDisponible[0]) {
    return { error: "Ese hueco libre ya no esta disponible." };
  }

  if (ocupado[0]) {
    return { error: "Ese horario acaba de ocuparse." };
  }

  try {
    await db.insert(turnos).values({
      barberoId,
      clienteNombre,
      clienteTelefonoRaw: clienteTelefonoRaw || null,
      clienteTelefonoNormalizado: clientMatch?.phoneNormalized ?? null,
      clientId: clientMatch?.clientId ?? null,
      fecha,
      horaInicio: horaNormalizada,
      duracionMinutos,
      estado: "confirmado",
      esMarcianoSnapshot: clientMatch?.esMarciano ?? false,
      prioridadAbsoluta: clientMatch?.esMarciano ?? false,
    });
  } catch (error) {
    console.error("Error creando turno rapido:", error);
    return { error: "No se pudo guardar el turno rapido." };
  }

  revalidatePath("/turnos");
  revalidatePath("/hoy");
  revalidatePath("/turnos/disponibilidad");
  return { success: true };
}
