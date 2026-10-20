"use server";

import { and, eq, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { atenciones, barberoDiaEspecial, barberoHorarioSemanal, barberos, cierresCaja, mediosPago, pantallaEvents, servicios, turnos } from "@/db/schema";
import { DIAS_SEMANA } from "@/lib/horario";
import { handleClienteLlego } from "@/lib/music-engine";
import { calculateAtencionCommission } from "@/lib/finance/commission";
import { notifyTurnoStatusChange } from "@/lib/turno-notifications";
import { canManageTurnoForBarbero, getTurnosActorContext } from "@/lib/turnos-access";
import {
  findClientByPhone,
  getBarberoAgendaProfile,
  getFechaHoyArgentina,
  isFechaCerrada,
  isHorarioLibre,
} from "@/lib/turnos";
import { getHoraAhoraArgentina, syncMarcianoCorteUsoForAtencionChange } from "@/lib/caja-atencion";

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
    allowed: canManageTurnoForBarbero(actor, turno.barberoId),
  };
}

export async function confirmarTurnoAction(
  turnoId: string,
  _prevState: TurnoActionState
): Promise<TurnoActionState> {
  const { actor, turno, allowed } = await getManagedTurno(turnoId);
  if (!turno) {
    return { error: "Turno no encontrado." };
  }
  if (!allowed) {
    return { error: "Solo podés gestionar tus propios turnos." };
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

  if (actor?.userId) {
    void notifyTurnoStatusChange({
      turnoId,
      eventType: "turno_confirmado",
      createdByUserId: actor.userId,
    });
  }

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

  const { actor, turno, allowed } = await getManagedTurno(turnoId);
  if (!turno) {
    return { error: "Turno no encontrado." };
  }
  if (!allowed) {
    return { error: "Solo podés gestionar tus propios turnos." };
  }
  if (turno.estado === "cancelado" || turno.estado === "completado") {
    return { error: "Ese turno ya no puede rechazarse." };
  }

  await db
    .update(turnos)
    .set({ estado: "cancelado", motivoCancelacion: motivo, updatedAt: new Date() })
    .where(eq(turnos.id, turnoId));

  if (actor?.userId) {
    void notifyTurnoStatusChange({
      turnoId,
      eventType: "turno_cancelado",
      createdByUserId: actor.userId,
      motivoCancelacion: motivo,
    });
  }

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
    return { error: "Necesitás iniciar sesión para avisar la llegada." };
  }
  if (!allowed) {
    return { error: "Solo podés gestionar tus propios turnos." };
  }
  if (turno.estado !== "confirmado") {
    return { error: "Solo podés avisar llegada en turnos confirmados." };
  }

  const cancion = turno.sugerenciaCancion?.trim();
  if (!cancion) {
    return { error: "Ese turno no tiene sugerencia de canción." };
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
      return { success: "La llegada entró a Jam y ya participa de la cola compartida." };
    }

    if (result.kind === "blocked_by_manual_dj") {
      return { success: "DJ está activo. La canción quedó como propuesta para no pisar al operador." };
    }

    if (result.kind === "waiting_for_recovery") {
      return { success: `La llegada quedó visible, pero Música espera recuperación: ${result.reason}` };
    }

    if (result.kind === "missing_track_uri") {
      return {
        success:
          "La llegada quedó registrada, pero falta vincular la track de Spotify para sonar automático.",
      };
    }

    return { success: "La llegada quedó como propuesta en Música." };
  } catch (error) {
    console.error("Error procesando llegada en turnos:", error);
    return { error: "No pude procesar la llegada ni hablar con Música. Intentá de nuevo." };
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
    return { error: "Tenés que iniciar sesión para crear turnos." };
  }
  if (!canManageTurnoForBarbero(actor, barberoId)) {
    return { error: "Solo podés crear turnos para tu propia agenda." };
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
  const servicioId = String(formData.get("servicioId") ?? "").trim() || null;
  const precioEsperadoRaw = String(formData.get("precioEsperado") ?? "").trim();
  const precioEsperado = precioEsperadoRaw && Number(precioEsperadoRaw) > 0
    ? String(Number(precioEsperadoRaw))
    : null;

  // Con servicio elegido, el turno dura lo que dura el servicio (un corte y barba de 60 tiene que
  // bloquear también la media hora siguiente); sin servicio, lo que dura el hueco.
  let duracionTurno = duracionMinutos;
  if (servicioId) {
    const [servicio] = await db
      .select({ id: servicios.id, duracionMinutos: servicios.duracionMinutos })
      .from(servicios)
      .where(and(eq(servicios.id, servicioId), eq(servicios.activo, true)))
      .limit(1);
    if (!servicio) {
      return { error: "El servicio seleccionado no existe o no está activo." };
    }
    duracionTurno = servicio.duracionMinutos;
  }

  const [libre, clientMatch] = await Promise.all([
    isHorarioLibre(barberoId, fecha, horaNormalizada, duracionTurno),
    findClientByPhone(clienteTelefonoRaw || null),
  ]);

  if (!libre) {
    return {
      error:
        duracionTurno > duracionMinutos
          ? "Ese servicio no entra en ese horario: se pisa con el turno siguiente o con el cierre."
          : "Ese horario ya no está libre.",
    };
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
      duracionMinutos: duracionTurno,
      servicioId: servicioId ?? null,
      precioEsperado: precioEsperado ?? null,
      estado: "confirmado",
      esMarcianoSnapshot: clientMatch?.esMarciano ?? false,
      prioridadAbsoluta: clientMatch?.esMarciano ?? false,
    });
  } catch (error) {
    console.error("Error creando turno rapido:", error);
    return { error: "No se pudo guardar el turno rápido." };
  }

  revalidatePath("/turnos");
  revalidatePath("/hoy");
  revalidatePath("/turnos/disponibilidad");
  return { success: true };
}

export async function cobrarYCompletarTurnoAction(
  turnoId: string,
  _prevState: TurnoActionState,
  formData: FormData
): Promise<TurnoActionState> {
  const actor = await getTurnosActorContext();
  if (!actor) {
    return { error: "Necesitás iniciar sesión." };
  }

  const medioPagoId = String(formData.get("medioPagoId") ?? "").trim();
  const precioCobradoRaw = String(formData.get("precioCobrado") ?? "").trim();
  const servicioIdForm = String(formData.get("servicioId") ?? "").trim() || null;

  if (!medioPagoId) {
    return { error: "Elegí un medio de pago para continuar." };
  }
  const precioCobrado = Number(precioCobradoRaw);
  if (!precioCobradoRaw || precioCobrado <= 0) {
    return { error: "El precio cobrado debe ser mayor a cero." };
  }

  try {
    await db.transaction(async (tx) => {
      const [turno] = await tx
        .select()
        .from(turnos)
        .where(eq(turnos.id, turnoId))
        .limit(1);

      if (!turno) throw new Error("Turno no encontrado.");
      if (actor.barberoId !== turno.barberoId) {
        throw new Error("Solo el barbero del turno puede cobrarlo.");
      }
      if (turno.estado !== "confirmado") {
        throw new Error(
          turno.estado === "completado"
            ? "Este turno ya fue cobrado."
            : "Solo se pueden cobrar turnos confirmados."
        );
      }

      const [cierre] = await tx
        .select({ id: cierresCaja.id })
        .from(cierresCaja)
        .where(eq(cierresCaja.fecha, turno.fecha))
        .limit(1);

      if (cierre) {
        throw new Error(
          "Ese día ya fue cerrado. Registrá la atención manualmente en caja si corresponde."
        );
      }

      const resolvedServicioId = servicioIdForm ?? turno.servicioId;
      if (!resolvedServicioId) {
        throw new Error("Este turno no tiene servicio asignado. Elegí un servicio antes de cobrar.");
      }
      if (!turno.barberoId) {
        throw new Error("Este turno no tiene barbero asignado.");
      }

      const [barbero] = await tx
        .select({ porcentajeComision: barberos.porcentajeComision })
        .from(barberos)
        .where(eq(barberos.id, turno.barberoId))
        .limit(1);

      const [medioPago] = await tx
        .select({ comisionPorcentaje: mediosPago.comisionPorcentaje })
        .from(mediosPago)
        .where(eq(mediosPago.id, medioPagoId))
        .limit(1);

      const [servicio] = await tx
        .select({ precioBase: servicios.precioBase })
        .from(servicios)
        .where(eq(servicios.id, resolvedServicioId))
        .limit(1);

      if (!barbero) throw new Error("Barbero no encontrado.");
      if (!medioPago) throw new Error("Medio de pago no encontrado.");
      if (!servicio) throw new Error("Servicio no encontrado.");

      const servicePrecioBase = servicio.precioBase ?? String(precioCobrado);
      const commission = calculateAtencionCommission({
        precioCobrado,
        comisionMedioPagoPct: Number(medioPago.comisionPorcentaje ?? 0),
        comisionBarberoPct: Number(barbero.porcentajeComision ?? 0),
        servicioPrecioBase: Number(servicePrecioBase),
      });

      await tx.insert(atenciones).values({
        barberoId: turno.barberoId,
        clientId: turno.clientId ?? null,
        servicioId: resolvedServicioId,
        fecha: turno.fecha,
        hora: getHoraAhoraArgentina(),
        precioBase: servicePrecioBase,
        precioCobrado: String(precioCobrado),
        medioPagoId,
        comisionMedioPagoPct: String(commission.comisionMedioPagoPct),
        comisionMedioPagoMonto: String(commission.comisionMedioPagoMonto.toFixed(2)),
        montoNeto: String(commission.montoNeto.toFixed(2)),
        comisionBarberoPct: String(commission.comisionBarberoPct),
        comisionBarberoMonto: String(commission.comisionBarberoMonto.toFixed(2)),
        anulado: false,
      });

      await syncMarcianoCorteUsoForAtencionChange({
        tx,
        fecha: turno.fecha,
        previousClientId: null,
        nextClientId: turno.clientId ?? null,
      });

      await tx
        .update(turnos)
        .set({ estado: "completado", updatedAt: new Date() })
        .where(eq(turnos.id, turnoId));
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "No se pudo registrar el cobro.";
    return { error: message };
  }

  revalidatePath("/turnos");
  revalidatePath("/hoy");
  revalidatePath("/caja");
  return {};
}

function revalidarAgenda(publicSlug?: string | null) {
  revalidatePath("/turnos");
  revalidatePath("/hoy");
  revalidatePath("/turnos/disponibilidad");
  if (publicSlug) revalidatePath(`/reservar/${publicSlug}`);
}

const HORA_REGEX = /^\d{2}:\d{2}$/;

/**
 * Guarda el horario semanal completo de un barbero (reemplaza al anterior).
 * El formulario manda, por cada día 0–6, `activo_<dia>` y hasta dos rangos `desde_<dia>_<n>` / `hasta_<dia>_<n>`.
 */
export async function guardarHorarioSemanalAction(
  barberoId: string,
  _prevState: TurnoActionState,
  formData: FormData
): Promise<TurnoActionState> {
  const actor = await getTurnosActorContext();
  if (!actor) return { error: "Necesitás iniciar sesión." };
  if (!canManageTurnoForBarbero(actor, barberoId)) {
    return { error: "Solo podés cambiar tu propio horario." };
  }

  const filas: { barberoId: string; diaSemana: number; desde: string; hasta: string }[] = [];
  for (let dia = 0; dia <= 6; dia++) {
    if (formData.get(`activo_${dia}`) !== "on") continue;

    const rangos: { desde: string; hasta: string }[] = [];
    for (const n of [1, 2]) {
      const desde = String(formData.get(`desde_${dia}_${n}`) ?? "").trim();
      const hasta = String(formData.get(`hasta_${dia}_${n}`) ?? "").trim();
      if (!desde && !hasta) continue;
      if (!HORA_REGEX.test(desde) || !HORA_REGEX.test(hasta) || hasta <= desde) {
        return { error: `${DIAS_SEMANA[dia]}: el horario tiene que terminar después de empezar.` };
      }
      rangos.push({ desde, hasta });
    }

    if (rangos.length === 0) {
      return { error: `${DIAS_SEMANA[dia]} está prendido pero no tiene horario.` };
    }
    const [primero, segundo] = rangos.sort((a, b) => a.desde.localeCompare(b.desde));
    if (primero && segundo && segundo.desde < primero.hasta) {
      return { error: `${DIAS_SEMANA[dia]}: los dos horarios se pisan.` };
    }
    for (const rango of rangos) filas.push({ barberoId, diaSemana: dia, ...rango });
  }

  try {
    await db.transaction(async (tx) => {
      await tx.delete(barberoHorarioSemanal).where(eq(barberoHorarioSemanal.barberoId, barberoId));
      if (filas.length > 0) await tx.insert(barberoHorarioSemanal).values(filas);
    });
  } catch (error) {
    console.error("Error guardando horario semanal:", error);
    return { error: "No pude guardar el horario. Probá de nuevo." };
  }

  const agendaBarbero = await getBarberoAgendaProfile(barberoId);
  revalidarAgenda(agendaBarbero?.publicSlug);
  return {
    success: filas.length === 0 ? "Guardado: no trabajás ningún día." : "Horario guardado.",
  };
}

/** "No vengo" u "Otro horario" para una fecha. Con barberoId null (solo admin) vale para todo el local. */
export async function agregarDiaEspecialAction(
  barberoId: string | null,
  _prevState: TurnoActionState,
  formData: FormData
): Promise<TurnoActionState> {
  const actor = await getTurnosActorContext();
  if (!actor) return { error: "Necesitás iniciar sesión." };
  if (barberoId === null ? !actor.isAdmin : !canManageTurnoForBarbero(actor, barberoId)) {
    return { error: "No podés cambiar ese horario." };
  }

  const fecha = String(formData.get("fecha") ?? "").trim();
  const tipo = String(formData.get("tipo") ?? "cerrado");
  const desde = String(formData.get("desde") ?? "").trim();
  const hasta = String(formData.get("hasta") ?? "").trim();
  const nota = String(formData.get("nota") ?? "").trim() || null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { error: "Elegí la fecha." };
  if (fecha < getFechaHoyArgentina()) return { error: "Esa fecha ya pasó." };
  const cerrado = tipo !== "otro";
  if (!cerrado && (!HORA_REGEX.test(desde) || !HORA_REGEX.test(hasta) || hasta <= desde)) {
    return { error: "El horario tiene que terminar después de empezar." };
  }

  try {
    await db.transaction(async (tx) => {
      // Un día especial por fecha: el nuevo reemplaza al anterior.
      await tx
        .delete(barberoDiaEspecial)
        .where(
          and(
            eq(barberoDiaEspecial.fecha, fecha),
            barberoId === null ? isNull(barberoDiaEspecial.barberoId) : eq(barberoDiaEspecial.barberoId, barberoId)
          )
        );
      await tx.insert(barberoDiaEspecial).values({
        barberoId,
        fecha,
        cerrado,
        desde: cerrado ? null : desde,
        hasta: cerrado ? null : hasta,
        nota,
        createdByUserId: actor.userId,
      });
    });
  } catch (error) {
    console.error("Error guardando día especial:", error);
    return { error: "No pude guardar ese día. Probá de nuevo." };
  }

  const agendaBarbero = barberoId ? await getBarberoAgendaProfile(barberoId) : null;
  revalidarAgenda(agendaBarbero?.publicSlug);
  if (barberoId === null) revalidatePath("/reservar", "layout");
  return { success: "Listo, ese día quedó cargado." };
}

export async function quitarDiaEspecialAction(id: string): Promise<void> {
  const actor = await getTurnosActorContext();
  if (!actor) return;

  const [dia] = await db.select().from(barberoDiaEspecial).where(eq(barberoDiaEspecial.id, id)).limit(1);
  if (!dia) return;
  if (dia.barberoId === null ? !actor.isAdmin : !canManageTurnoForBarbero(actor, dia.barberoId)) return;

  await db.delete(barberoDiaEspecial).where(eq(barberoDiaEspecial.id, id));
  const agendaBarbero = dia.barberoId ? await getBarberoAgendaProfile(dia.barberoId) : null;
  revalidarAgenda(agendaBarbero?.publicSlug);
}
