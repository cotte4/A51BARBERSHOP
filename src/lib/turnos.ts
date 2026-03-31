import { createHash } from "node:crypto";
import { and, count, desc, eq, gte, inArray, lt } from "drizzle-orm";
import { db } from "@/db";
import {
  barberos,
  cierresCaja,
  clients,
  productos,
  turnos,
  turnosDisponibilidad,
  turnosExtras,
  turnosReservaIntentos,
} from "@/db/schema";

export const TURNO_DURACIONES = [45, 60] as const;
export const PUBLIC_RESERVA_SLUG = "pinky";

export function getFechaHoyArgentina(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

export function normalizeHora(hora: string): string {
  return hora.slice(0, 5);
}

export async function resolvePublicBarberoBySlug(slug: string) {
  if (slug !== PUBLIC_RESERVA_SLUG) {
    return null;
  }

  const [barbero] = await db
    .select({
      id: barberos.id,
      nombre: barberos.nombre,
      rol: barberos.rol,
      activo: barberos.activo,
    })
    .from(barberos)
    .where(and(eq(barberos.rol, "admin"), eq(barberos.activo, true)))
    .limit(1);

  return barbero ?? null;
}

export async function isFechaCerrada(fecha: string): Promise<boolean> {
  const [cierre] = await db
    .select({ id: cierresCaja.id })
    .from(cierresCaja)
    .where(eq(cierresCaja.fecha, fecha))
    .limit(1);

  return !!cierre;
}

export async function getTurnosDisponibles(barberoId: string, fecha: string) {
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

  return slots
    .filter((slot) => !ocupadas.has(normalizeHora(slot.horaInicio)))
    .sort((a, b) => normalizeHora(a.horaInicio).localeCompare(normalizeHora(b.horaInicio)))
    .map((slot) => ({
      ...slot,
      horaInicio: normalizeHora(slot.horaInicio),
    }));
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
      estado: turnos.estado,
      notaCliente: turnos.notaCliente,
      sugerenciaCancion: turnos.sugerenciaCancion,
      motivoCancelacion: turnos.motivoCancelacion,
      esMarcianoSnapshot: turnos.esMarcianoSnapshot,
    })
    .from(turnos)
    .innerJoin(barberos, eq(barberos.id, turnos.barberoId))
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
