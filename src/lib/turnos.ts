import { createHash } from "node:crypto";
import { and, count, desc, eq, gte, inArray, isNotNull, isNull, lte, ne, or } from "drizzle-orm";
import { db } from "@/db";
import {
  barberoDiaEspecial,
  barberoHorarioSemanal,
  barberos,
  cierresCaja,
  clients,
  productos,
  servicios,
  turnos,
  turnosExtras,
  turnosReservaIntentos,
} from "@/db/schema";
import {
  DIAS_RESERVA_ADELANTE,
  PASO_TURNOS_MIN,
  armarHorarioId,
  calcularTurnosLibres,
  horaAMinutos,
  rangosDelDia,
  sumarDias,
} from "@/lib/horario";

export const TURNO_DURACIONES = [45, 60] as const;

function formatFechaArgentina(date: Date): string {
  return date.toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

function getFechaArgentina(daysFromToday = 0): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysFromToday);
  return formatFechaArgentina(date);
}

export function getFechaHoyArgentina(): string {
  return getFechaArgentina();
}

export function getFechaMananaArgentina(): string {
  return getFechaArgentina(1);
}

export function getFechaLimiteReservaArgentina(): string {
  return getFechaArgentina(DIAS_RESERVA_ADELANTE);
}

/** Reserva pública y portal: desde mañana y hasta DIAS_RESERVA_ADELANTE días. */
export function canReserveOnPublicFecha(fecha: string): boolean {
  return fecha >= getFechaMananaArgentina() && fecha <= getFechaLimiteReservaArgentina();
}

function minutoActualArgentina(): number {
  const hora = new Date().toLocaleTimeString("en-GB", {
    timeZone: "America/Argentina/Buenos_Aires",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return horaAMinutos(hora);
}

export function normalizeHora(hora: string): string {
  return hora.slice(0, 5);
}

export async function resolvePublicBarberoBySlug(slug: string) {
  const normalizedSlug = slug.trim().toLowerCase();

  const [barbero] = await db
    .select({
      id: barberos.id,
      nombre: barberos.nombre,
      rol: barberos.rol,
      activo: barberos.activo,
      publicSlug: barberos.publicSlug,
      publicReservaActiva: barberos.publicReservaActiva,
      publicReservaPasswordHash: barberos.publicReservaPasswordHash,
    })
    .from(barberos)
    .where(
      and(
        eq(barberos.publicSlug, normalizedSlug),
        eq(barberos.publicReservaActiva, true),
        eq(barberos.activo, true)
      )
    )
    .limit(1);

  return barbero ?? null;
}

export async function getBarberoAgendaProfile(barberoId: string) {
  const [barbero] = await db
    .select({
      id: barberos.id,
      nombre: barberos.nombre,
      rol: barberos.rol,
      activo: barberos.activo,
      publicSlug: barberos.publicSlug,
      publicReservaActiva: barberos.publicReservaActiva,
    })
    .from(barberos)
    .where(and(eq(barberos.id, barberoId), eq(barberos.activo, true)))
    .limit(1);

  return barbero ?? null;
}

export async function getBarberosPublicosReserva() {
  return db
    .select({
      id: barberos.id,
      nombre: barberos.nombre,
      rol: barberos.rol,
      publicSlug: barberos.publicSlug,
      publicReservaActiva: barberos.publicReservaActiva,
      publicReservaPasswordHash: barberos.publicReservaPasswordHash,
    })
    .from(barberos)
    .where(
      and(
        eq(barberos.publicReservaActiva, true),
        eq(barberos.activo, true),
        isNotNull(barberos.publicSlug)
      )
    )
    .orderBy(barberos.nombre);
}

export async function isFechaCerrada(fecha: string): Promise<boolean> {
  const [cierre] = await db
    .select({ id: cierresCaja.id })
    .from(cierresCaja)
    .where(eq(cierresCaja.fecha, fecha))
    .limit(1);

  return !!cierre;
}

type Agenda = Awaited<ReturnType<typeof cargarAgenda>>;

/** Todo lo que hace falta para calcular turnos libres de esos barberos entre dos fechas, en 4 consultas. */
// `ignorarTurnoId`: al mover un turno, el lugar que ocupa hoy no cuenta como tomado.
async function cargarAgenda(barberoIds: string[], desde: string, hasta: string, ignorarTurnoId?: string) {
  if (barberoIds.length === 0) {
    return { semanal: [], especiales: [], tomados: [], cerradas: new Set<string>() };
  }

  const [semanal, especiales, tomados, cierres] = await Promise.all([
    db
      .select({
        barberoId: barberoHorarioSemanal.barberoId,
        diaSemana: barberoHorarioSemanal.diaSemana,
        desde: barberoHorarioSemanal.desde,
        hasta: barberoHorarioSemanal.hasta,
      })
      .from(barberoHorarioSemanal)
      .where(inArray(barberoHorarioSemanal.barberoId, barberoIds)),
    db
      .select({
        barberoId: barberoDiaEspecial.barberoId,
        fecha: barberoDiaEspecial.fecha,
        cerrado: barberoDiaEspecial.cerrado,
        desde: barberoDiaEspecial.desde,
        hasta: barberoDiaEspecial.hasta,
      })
      .from(barberoDiaEspecial)
      .where(
        and(
          gte(barberoDiaEspecial.fecha, desde),
          lte(barberoDiaEspecial.fecha, hasta),
          or(isNull(barberoDiaEspecial.barberoId), inArray(barberoDiaEspecial.barberoId, barberoIds))
        )
      ),
    db
      .select({
        barberoId: turnos.barberoId,
        fecha: turnos.fecha,
        horaInicio: turnos.horaInicio,
        duracionMinutos: turnos.duracionMinutos,
      })
      .from(turnos)
      .where(
        and(
          inArray(turnos.barberoId, barberoIds),
          gte(turnos.fecha, desde),
          lte(turnos.fecha, hasta),
          inArray(turnos.estado, ["pendiente", "confirmado"]),
          ignorarTurnoId ? ne(turnos.id, ignorarTurnoId) : undefined
        )
      ),
    db
      .select({ fecha: cierresCaja.fecha })
      .from(cierresCaja)
      .where(and(gte(cierresCaja.fecha, desde), lte(cierresCaja.fecha, hasta))),
  ]);

  return { semanal, especiales, tomados, cerradas: new Set(cierres.map((c) => c.fecha)) };
}

/** Horas libres de un barbero un día. Un día pasado o con la caja cerrada no tiene turnos. */
function libresDelDia(agenda: Agenda, barberoId: string, fecha: string, duracionMinutos: number): string[] {
  const hoy = getFechaHoyArgentina();
  if (fecha < hoy || agenda.cerradas.has(fecha)) return [];

  const rangos = rangosDelDia({
    fecha,
    semanal: agenda.semanal.filter((fila) => fila.barberoId === barberoId),
    especiales: agenda.especiales.filter(
      (e) => e.fecha === fecha && (e.barberoId === null || e.barberoId === barberoId)
    ),
  });

  return calcularTurnosLibres({
    rangos,
    tomados: agenda.tomados.filter((t) => t.barberoId === barberoId && t.fecha === fecha),
    duracionMinutos,
    noAntesDe: fecha === hoy ? minutoActualArgentina() : undefined,
  });
}

export async function getTurnosDisponibles(
  barberoId: string,
  fecha: string,
  duracionMinutos?: number
) {
  const duracion = duracionMinutos ?? PASO_TURNOS_MIN;
  const agenda = await cargarAgenda([barberoId], fecha, fecha);

  return libresDelDia(agenda, barberoId, fecha, duracion).map((hora) => ({
    id: armarHorarioId(fecha, hora),
    fecha,
    horaInicio: hora,
    duracionMinutos: duracion,
  }));
}

/** El primer día con lugar desde `desdeFecha` (incluido), dentro de los días que se puede reservar. */
export async function getProximoDiaConLugar(
  barberoId: string,
  desdeFecha: string,
  duracionMinutos: number
): Promise<string | null> {
  const hasta = getFechaLimiteReservaArgentina();
  if (desdeFecha > hasta) return null;

  const agenda = await cargarAgenda([barberoId], desdeFecha, hasta);
  for (let fecha = desdeFecha; fecha <= hasta; fecha = sumarDias(fecha, 1)) {
    if (libresDelDia(agenda, barberoId, fecha, duracionMinutos).length > 0) return fecha;
  }
  return null;
}

/** Verificación justo antes de guardar un turno: ¿ese arranque sigue libre para esa duración? */
export async function isHorarioLibre(
  barberoId: string,
  fecha: string,
  hora: string,
  duracionMinutos: number,
  ignorarTurnoId?: string
): Promise<boolean> {
  const agenda = await cargarAgenda([barberoId], fecha, fecha, ignorarTurnoId);
  return libresDelDia(agenda, barberoId, fecha, duracionMinutos).includes(hora.slice(0, 5));
}

/** Horas a las que se puede mover un turno ese día: mismo barbero, misma duración, sin contarse a sí mismo. */
export async function getHorasParaMover(
  turno: { id: string; barberoId: string; duracionMinutos: number },
  fecha: string
): Promise<string[]> {
  const agenda = await cargarAgenda([turno.barberoId], fecha, fecha, turno.id);
  return libresDelDia(agenda, turno.barberoId, fecha, turno.duracionMinutos);
}

export async function getServiciosPublicos() {
  return db
    .select({
      id: servicios.id,
      nombre: servicios.nombre,
      precioBase: servicios.precioBase,
      duracionMinutos: servicios.duracionMinutos,
    })
    .from(servicios)
    .where(eq(servicios.activo, true))
    .orderBy(servicios.nombre);
}

export async function getProductosExtrasActivos() {
  return db
    .select({
      id: productos.id,
      nombre: productos.nombre,
    })
    .from(productos)
    .where(eq(productos.activo, true));
}

export async function findClientByPhone(rawPhone: string | null | undefined) {
  if (!rawPhone) {
    return null;
  }

  const { normalizePhone } = await import("@/lib/phone");
  const normalized = normalizePhone(rawPhone);
  if (!normalized) {
    return null;
  }

  const [client] = await db
    .select({
      id: clients.id,
      esMarciano: clients.esMarciano,
    })
    .from(clients)
    .where(eq(clients.phoneNormalized, normalized))
    .limit(1);

  return client
    ? {
        clientId: client.id,
        esMarciano: client.esMarciano,
        phoneNormalized: normalized,
      }
    : {
        clientId: null,
        esMarciano: false,
        phoneNormalized: normalized,
      };
}

export async function enforcePublicReservaRateLimit(ip: string | null) {
  const ipHash = createHash("sha256").update(ip ?? "unknown").digest("hex");
  const windowStart = new Date(Date.now() - 60 * 60 * 1000);

  const [existing] = await db
    .select({ count: count() })
    .from(turnosReservaIntentos)
    .where(and(eq(turnosReservaIntentos.ipHash, ipHash), gte(turnosReservaIntentos.createdAt, windowStart)));

  if ((existing?.count ?? 0) >= 5) {
    return { allowed: false, ipHash };
  }

  await db.insert(turnosReservaIntentos).values({ ipHash });
  return { allowed: true, ipHash };
}

export async function getTurnosVisibleList(
  fecha: string,
  estado?: string,
  barberoId?: string
) {
  const rows = await db
    .select({
      id: turnos.id,
      barberoId: turnos.barberoId,
      barberoNombre: barberos.nombre,
      clienteNombre: turnos.clienteNombre,
      clienteTelefonoRaw: turnos.clienteTelefonoRaw,
      fecha: turnos.fecha,
      horaInicio: turnos.horaInicio,
      duracionMinutos: turnos.duracionMinutos,
      servicioNombre: servicios.nombre,
      precioEsperado: turnos.precioEsperado,
      estado: turnos.estado,
      notaCliente: turnos.notaCliente,
      sugerenciaCancion: turnos.sugerenciaCancion,
      spotifyTrackUri: turnos.spotifyTrackUri,
      motivoCancelacion: turnos.motivoCancelacion,
      esMarcianoSnapshot: turnos.esMarcianoSnapshot,
      prioridadAbsoluta: turnos.prioridadAbsoluta,
    })
    .from(turnos)
    .innerJoin(barberos, eq(barberos.id, turnos.barberoId))
    .leftJoin(servicios, eq(servicios.id, turnos.servicioId))
    .where(
      and(
        eq(turnos.fecha, fecha),
        estado ? eq(turnos.estado, estado) : undefined,
        barberoId ? eq(turnos.barberoId, barberoId) : undefined
      )
    )
    .orderBy(turnos.horaInicio);

  const ids = rows.map((row) => row.id);
  const extras =
    ids.length === 0
      ? []
      : await db
          .select({
            turnoId: turnosExtras.turnoId,
            id: turnosExtras.id,
            nombre: productos.nombre,
            cantidad: turnosExtras.cantidad,
          })
          .from(turnosExtras)
          .innerJoin(productos, eq(productos.id, turnosExtras.productoId))
          .where(inArray(turnosExtras.turnoId, ids));

  const extrasByTurno = new Map<string, Array<{ id: string; nombre: string; cantidad: number }>>();
  for (const extra of extras) {
    const current = extrasByTurno.get(extra.turnoId) ?? [];
    current.push({
      id: extra.id,
      nombre: extra.nombre,
      cantidad: extra.cantidad,
    });
    extrasByTurno.set(extra.turnoId, current);
  }

  return rows.map((row) => ({
    ...row,
    horaInicio: normalizeHora(row.horaInicio),
    estado: row.estado as "pendiente" | "confirmado" | "completado" | "cancelado",
    extras: extrasByTurno.get(row.id) ?? [],
  }));
}

export async function getBarberosActivosTurnos() {
  return db
    .select({
      id: barberos.id,
      nombre: barberos.nombre,
    })
    .from(barberos)
    .where(eq(barberos.activo, true))
    .orderBy(barberos.nombre);
}

/** Huecos libres de un día para "Tomar" en /turnos, de a PASO_TURNOS_MIN, para uno o todos los barberos activos. */
export async function getDisponibilidadLibrePorFecha(fecha: string, barberoId?: string) {
  const activos = await db
    .select({ id: barberos.id, nombre: barberos.nombre })
    .from(barberos)
    .where(and(eq(barberos.activo, true), barberoId ? eq(barberos.id, barberoId) : undefined))
    .orderBy(barberos.nombre);

  const agenda = await cargarAgenda(
    activos.map((b) => b.id),
    fecha,
    fecha
  );

  return activos
    .flatMap((barbero) =>
      libresDelDia(agenda, barbero.id, fecha, PASO_TURNOS_MIN).map((hora) => ({
        id: `${barbero.id}:${armarHorarioId(fecha, hora)}`,
        barberoId: barbero.id,
        barberoNombre: barbero.nombre,
        fecha,
        horaInicio: hora,
        duracionMinutos: PASO_TURNOS_MIN,
      }))
    )
    .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
}

/** Horario semanal y próximos días especiales (del barbero y del local), para la pantalla "Mi horario". */
export async function getHorarioBarbero(barberoId: string) {
  const hoy = getFechaHoyArgentina();
  const [semanal, especiales] = await Promise.all([
    db
      .select({
        diaSemana: barberoHorarioSemanal.diaSemana,
        desde: barberoHorarioSemanal.desde,
        hasta: barberoHorarioSemanal.hasta,
      })
      .from(barberoHorarioSemanal)
      .where(eq(barberoHorarioSemanal.barberoId, barberoId))
      .orderBy(barberoHorarioSemanal.diaSemana, barberoHorarioSemanal.desde),
    db
      .select({
        id: barberoDiaEspecial.id,
        barberoId: barberoDiaEspecial.barberoId,
        fecha: barberoDiaEspecial.fecha,
        cerrado: barberoDiaEspecial.cerrado,
        desde: barberoDiaEspecial.desde,
        hasta: barberoDiaEspecial.hasta,
        nota: barberoDiaEspecial.nota,
      })
      .from(barberoDiaEspecial)
      .where(
        and(
          gte(barberoDiaEspecial.fecha, hoy),
          or(isNull(barberoDiaEspecial.barberoId), eq(barberoDiaEspecial.barberoId, barberoId))
        )
      )
      .orderBy(barberoDiaEspecial.fecha),
  ]);

  return {
    semanal: semanal.map((f) => ({ ...f, desde: f.desde.slice(0, 5), hasta: f.hasta.slice(0, 5) })),
    especiales: especiales.map((e) => ({
      ...e,
      desde: e.desde?.slice(0, 5) ?? null,
      hasta: e.hasta?.slice(0, 5) ?? null,
    })),
  };
}


export async function getCancelacionesStats(
  fromFecha: string,
  toFecha: string,
  barberoId?: string
) {
  const [cancelados, totalRow] = await Promise.all([
    db
      .select({
        motivoCancelacion: turnos.motivoCancelacion,
        cantidad: count(),
      })
      .from(turnos)
      .where(
        and(
          eq(turnos.estado, "cancelado"),
          gte(turnos.fecha, fromFecha),
          lte(turnos.fecha, toFecha),
          barberoId ? eq(turnos.barberoId, barberoId) : undefined
        )
      )
      .groupBy(turnos.motivoCancelacion),
    db
      .select({ total: count() })
      .from(turnos)
      .where(
        and(
          gte(turnos.fecha, fromFecha),
          lte(turnos.fecha, toFecha),
          barberoId ? eq(turnos.barberoId, barberoId) : undefined
        )
      ),
  ]);

  return {
    cancelados: cancelados.map((row) => ({
      motivo: row.motivoCancelacion ?? "Sin motivo registrado",
      cantidad: row.cantidad,
    })),
    totalTurnos: totalRow[0]?.total ?? 0,
  };
}
