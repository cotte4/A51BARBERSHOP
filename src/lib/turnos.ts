import { createHash } from "node:crypto";
import { and, count, desc, eq, gte, inArray, isNotNull, lt, lte } from "drizzle-orm";
import { db } from "@/db";
import {
  barberos,
  cierresCaja,
  clients,
  productos,
  servicios,
  turnos,
  turnosDisponibilidad,
  turnosExtras,
  turnosReservaIntentos,
} from "@/db/schema";

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

export function canReserveOnPublicFecha(fecha: string): boolean {
  return fecha >= getFechaMananaArgentina();
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

function timeToMinutes(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export async function getTurnosDisponibles(
  barberoId: string,
  fecha: string,
  duracionMinutos?: number
) {
  if (await isFechaCerrada(fecha)) {
    return [];
  }

  const [slots, ocupados] = await Promise.all([
    db
      .select({
        id: turnosDisponibilidad.id,
        fecha: turnosDisponibilidad.fecha,
        horaInicio: turnosDisponibilidad.horaInicio,
        duracionMinutos: turnosDisponibilidad.duracionMinutos,
      })
      .from(turnosDisponibilidad)
      .where(and(eq(turnosDisponibilidad.barberoId, barberoId), eq(turnosDisponibilidad.fecha, fecha))),
    db
      .select({
        horaInicio: turnos.horaInicio,
      })
      .from(turnos)
      .where(
        and(
          eq(turnos.barberoId, barberoId),
          eq(turnos.fecha, fecha),
          inArray(turnos.estado, ["pendiente", "confirmado"])
        )
      ),
  ]);

  const ocupadas = new Set(ocupados.map((slot) => normalizeHora(slot.horaInicio)));

  const todosOrdenados = slots
    .map((slot) => ({ ...slot, horaInicio: normalizeHora(slot.horaInicio) }))
    .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));

  if (!duracionMinutos) {
    return todosOrdenados.filter((slot) => !ocupadas.has(slot.horaInicio));
  }

  // Para cada slot libre, verificar si slots consecutivos libres cubren la duración del servicio
  const disponibles: typeof todosOrdenados = [];

  for (let i = 0; i < todosOrdenados.length; i++) {
    const startSlot = todosOrdenados[i];
    if (ocupadas.has(startSlot.horaInicio)) continue;

    const startMin = timeToMinutes(startSlot.horaInicio);
    const requiredEnd = startMin + duracionMinutos;
    let coveredUntil = startMin;

    for (let j = i; j < todosOrdenados.length; j++) {
      const slot = todosOrdenados[j];
      const slotStart = timeToMinutes(slot.horaInicio);

      if (slotStart > coveredUntil) break; // hay un hueco — no se puede encadenar
      if (ocupadas.has(slot.horaInicio)) break; // slot tomado

      coveredUntil = Math.max(coveredUntil, slotStart + slot.duracionMinutos);

      if (coveredUntil >= requiredEnd) {
        disponibles.push(startSlot);
        break;
      }
    }
  }

  return disponibles;
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

export async function getTurnosAdminList(fecha: string, estado?: string) {
  return getTurnosVisibleList(fecha, estado);
}

export async function getDisponibilidadAdminList(barberoId: string, fromFecha: string) {
  return db
    .select({
      id: turnosDisponibilidad.id,
      fecha: turnosDisponibilidad.fecha,
      horaInicio: turnosDisponibilidad.horaInicio,
      duracionMinutos: turnosDisponibilidad.duracionMinutos,
    })
    .from(turnosDisponibilidad)
    .where(and(eq(turnosDisponibilidad.barberoId, barberoId), gte(turnosDisponibilidad.fecha, fromFecha)))
    .orderBy(turnosDisponibilidad.fecha, turnosDisponibilidad.horaInicio);
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

export async function getDisponibilidadLibrePorFecha(fecha: string, barberoId?: string) {
  if (await isFechaCerrada(fecha)) {
    return [];
  }

  const [slots, ocupados] = await Promise.all([
    db
      .select({
        id: turnosDisponibilidad.id,
        barberoId: turnosDisponibilidad.barberoId,
        barberoNombre: barberos.nombre,
        fecha: turnosDisponibilidad.fecha,
        horaInicio: turnosDisponibilidad.horaInicio,
        duracionMinutos: turnosDisponibilidad.duracionMinutos,
      })
      .from(turnosDisponibilidad)
      .innerJoin(barberos, eq(barberos.id, turnosDisponibilidad.barberoId))
      .where(
        and(
          eq(turnosDisponibilidad.fecha, fecha),
          eq(barberos.activo, true),
          barberoId ? eq(turnosDisponibilidad.barberoId, barberoId) : undefined
        )
      )
      .orderBy(turnosDisponibilidad.horaInicio, barberos.nombre),
    db
      .select({
        barberoId: turnos.barberoId,
        horaInicio: turnos.horaInicio,
      })
      .from(turnos)
      .where(
        and(
          eq(turnos.fecha, fecha),
          barberoId ? eq(turnos.barberoId, barberoId) : undefined,
          inArray(turnos.estado, ["pendiente", "confirmado"])
        )
      ),
  ]);

  const ocupadas = new Set(
    ocupados.map((slot) => `${slot.barberoId}:${normalizeHora(slot.horaInicio)}`)
  );

  return slots
    .filter((slot) => !ocupadas.has(`${slot.barberoId}:${normalizeHora(slot.horaInicio)}`))
    .map((slot) => ({
      ...slot,
      horaInicio: normalizeHora(slot.horaInicio),
    }));
}

export async function getTurnosOcupadosDesde(barberoId: string, fromFecha: string) {
  return db
    .select({
      id: turnos.id,
      fecha: turnos.fecha,
      horaInicio: turnos.horaInicio,
      estado: turnos.estado,
    })
    .from(turnos)
    .where(
      and(
        eq(turnos.barberoId, barberoId),
        gte(turnos.fecha, fromFecha),
        inArray(turnos.estado, ["confirmado", "completado"])
      )
    )
    .orderBy(desc(turnos.fecha), desc(turnos.horaInicio));
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
