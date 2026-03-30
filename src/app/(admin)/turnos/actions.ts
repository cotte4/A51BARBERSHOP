"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { turnos, turnosDisponibilidad } from "@/db/schema";
import { requireAdminSession } from "@/lib/admin-action";
import {
  TURNO_DURACIONES,
  findClientByPhone,
  getFechaHoyArgentina,
  isFechaCerrada,
} from "@/lib/turnos";

export type TurnoActionState = {
  error?: string;
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

async function loadTurno(turnoId: string) {
  const [turno] = await db.select().from(turnos).where(eq(turnos.id, turnoId)).limit(1);
  return turno ?? null;
}

export async function confirmarTurnoAction(
  turnoId: string,
  prevState: TurnoActionState
): Promise<TurnoActionState> {
  if (!(await requireAdminSession())) {
    return { error: "Solo el admin puede gestionar turnos." };
  }

  const turno = await loadTurno(turnoId);
  if (!turno) {
    return { error: "Turno no encontrado." };
  }
  if (turno.estado !== "pendiente") {
    return { error: "Solo se pueden confirmar turnos pendientes." };
  }

  await db
    .update(turnos)
    .set({ estado: "confirmado", updatedAt: new Date(), motivoCancelacion: null })
    .where(eq(turnos.id, turnoId));

  revalidatePath("/turnos");
  revalidatePath("/turnos/disponibilidad");
  return {};
}

export async function rechazarTurnoAction(
  turnoId: string,
  prevState: TurnoActionState,
  formData: FormData
): Promise<TurnoActionState> {
  if (!(await requireAdminSession())) {
    return { error: "Solo el admin puede gestionar turnos." };
  }

  const motivo = String(formData.get("motivoCancelacion") ?? "").trim();
  if (!motivo) {
    return { error: "El motivo de rechazo es obligatorio." };
  }

  const turno = await loadTurno(turnoId);
  if (!turno) {
    return { error: "Turno no encontrado." };
  }
  if (turno.estado === "cancelado" || turno.estado === "completado") {
    return { error: "Ese turno ya no puede rechazarse." };
  }

  await db
    .update(turnos)
    .set({ estado: "cancelado", motivoCancelacion: motivo, updatedAt: new Date() })
    .where(eq(turnos.id, turnoId));

  revalidatePath("/turnos");
  revalidatePath("/turnos/disponibilidad");
  return {};
}

export async function completarTurnoAction(
  turnoId: string,
  prevState: TurnoActionState
): Promise<TurnoActionState> {
  if (!(await requireAdminSession())) {
    return { error: "Solo el admin puede gestionar turnos." };
  }

  const turno = await loadTurno(turnoId);
  if (!turno) {
    return { error: "Turno no encontrado." };
  }
  if (turno.estado !== "confirmado") {
    return { error: "Solo se pueden completar turnos confirmados." };
  }

  await db
    .update(turnos)
    .set({ estado: "completado", updatedAt: new Date() })
    .where(eq(turnos.id, turnoId));

  revalidatePath("/turnos");
  revalidatePath("/turnos/disponibilidad");
  return {};
}

export async function crearDisponibilidadAction(
  barberoId: string,
  prevState: TurnoActionState,
  formData: FormData
): Promise<TurnoActionState> {
  if (!(await requireAdminSession())) {
    return { error: "Solo el admin puede gestionar disponibilidad." };
  }

  const fecha = String(formData.get("fecha") ?? "");
  const horaInicio = normalizeTimeInput(String(formData.get("horaInicio") ?? ""));
  const duracionMinutos = Number(formData.get("duracionMinutos") ?? 0);

  if (!fecha || !horaInicio || !TURNO_DURACIONES.includes(duracionMinutos as 45 | 60)) {
    return { error: "CompletÃ¡ fecha, hora y duraciÃ³n vÃ¡lidas." };
  }
  if (fecha < getFechaHoyArgentina()) {
    return { error: "No podÃ©s crear disponibilidad en fechas pasadas." };
  }
  if (await isFechaCerrada(fecha)) {
    return { error: "Ese dÃ­a ya tiene cierre y no admite nuevos turnos." };
  }

  try {
    await db.insert(turnosDisponibilidad).values({
      barberoId,
      fecha,
      horaInicio,
      duracionMinutos,
    });
  } catch (error) {
    console.error("Error creando disponibilidad:", error);
    return { error: "Ese slot ya existe o no pudo guardarse." };
  }

  revalidatePath("/turnos/disponibilidad");
  revalidatePath("/reservar/pinky");
  return {};
}

export async function eliminarDisponibilidadAction(slotId: string): Promise<void> {
  if (!(await requireAdminSession())) {
    return;
  }

  const [slot] = await db.select().from(turnosDisponibilidad).where(eq(turnosDisponibilidad.id, slotId)).limit(1);
  if (!slot) {
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

  revalidatePath("/turnos/disponibilidad");
  revalidatePath("/reservar/pinky");
}

export async function crearTurnoRapidoAction(
  barberoId: string,
  fecha: string,
  horaInicio: string,
  duracionMinutos: number,
  prevState: QuickTurnoCreateState,
  formData: FormData
): Promise<QuickTurnoCreateState> {
  if (!(await requireAdminSession())) {
    return { error: "Solo el admin puede crear turnos rápidos." };
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
    return { error: "No podés cargar turnos en fechas pasadas." };
  }

  if (await isFechaCerrada(fecha)) {
    return { error: "Ese día ya fue cerrado y no admite nuevos turnos." };
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
    return { error: "Ese hueco libre ya no está disponible." };
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
    });
  } catch (error) {
    console.error("Error creando turno rápido:", error);
    return { error: "No se pudo guardar el turno rápido." };
  }

  revalidatePath("/turnos");
  revalidatePath("/turnos/disponibilidad");
  return { success: true };
}
