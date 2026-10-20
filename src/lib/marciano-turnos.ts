import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { barberos, clients, servicios, turnos } from "@/db/schema";
import type { TurnoEstado } from "@/lib/types";

export const MARCIANO_SELF_MANAGEMENT_HOURS = 11;

export type MarcianoTurnoItem = {
  id: string;
  fecha: string;
  horaInicio: string;
  duracionMinutos: number;
  estado: TurnoEstado;
  clienteNombre: string;
  clienteTelefonoRaw: string | null;
  servicioId: string | null;
  servicioNombre: string | null;
  barberoNombre: string;
  notaCliente: string | null;
  motivoCancelacion: string | null;
  precioEsperado: string | null;
  updatedAt: Date;
  startsAt: Date;
  canManage: boolean;
  manageMessage: string | null;
};

export function buildTurnoStartAt(fecha: string, horaInicio: string) {
  const normalizedHora = horaInicio.length === 5 ? `${horaInicio}:00` : horaInicio;
  return new Date(`${fecha}T${normalizedHora}-03:00`);
}

export function getMarcianoTurnoManagement(turno: {
  estado: TurnoEstado;
  fecha: string;
  horaInicio: string;
}) {
  if (turno.estado === "completado" || turno.estado === "cancelado") {
    return {
      canManage: false,
      manageMessage: "Este turno ya no admite cambios desde el portal.",
    };
  }

  const startsAt = buildTurnoStartAt(turno.fecha, turno.horaInicio);
  const remainingMs = startsAt.getTime() - Date.now();
  const cutoffMs = MARCIANO_SELF_MANAGEMENT_HOURS * 60 * 60 * 1000;

  if (remainingMs < cutoffMs) {
    return {
      canManage: false,
      manageMessage: `La autogestion cierra ${MARCIANO_SELF_MANAGEMENT_HOURS} horas antes del turno.`,
    };
  }

  return {
    canManage: true,
    manageMessage: null,
  };
}

export async function getMarcianoTurnosList(clientId: string) {
  const rows = await db
    .select({
      id: turnos.id,
      fecha: turnos.fecha,
      horaInicio: turnos.horaInicio,
      duracionMinutos: turnos.duracionMinutos,
      estado: turnos.estado,
      clienteNombre: turnos.clienteNombre,
      clienteTelefonoRaw: turnos.clienteTelefonoRaw,
      servicioId: turnos.servicioId,
      servicioNombre: servicios.nombre,
      barberoNombre: barberos.nombre,
      notaCliente: turnos.notaCliente,
      motivoCancelacion: turnos.motivoCancelacion,
      precioEsperado: turnos.precioEsperado,
      updatedAt: turnos.updatedAt,
    })
    .from(turnos)
    .innerJoin(barberos, eq(barberos.id, turnos.barberoId))
    .leftJoin(servicios, eq(servicios.id, turnos.servicioId))
    .where(eq(turnos.clientId, clientId))
    .orderBy(asc(turnos.fecha), asc(turnos.horaInicio));

  return rows.map((row) => {
    const startsAt = buildTurnoStartAt(row.fecha, row.horaInicio);
    const manage = getMarcianoTurnoManagement({
      estado: row.estado as TurnoEstado,
      fecha: row.fecha,
      horaInicio: row.horaInicio,
    });

    return {
      ...row,
      estado: row.estado as TurnoEstado,
      startsAt,
      canManage: manage.canManage,
      manageMessage: manage.manageMessage,
    } satisfies MarcianoTurnoItem;
  });
}

export async function getMarcianoTurnoById(clientId: string, turnoId: string) {
  const [turno] = await db
    .select({
      id: turnos.id,
      barberoId: turnos.barberoId,
      fecha: turnos.fecha,
      horaInicio: turnos.horaInicio,
      duracionMinutos: turnos.duracionMinutos,
      estado: turnos.estado,
      clienteNombre: turnos.clienteNombre,
      clienteTelefonoRaw: turnos.clienteTelefonoRaw,
      clientId: turnos.clientId,
      servicioId: turnos.servicioId,
      servicioNombre: servicios.nombre,
      notaCliente: turnos.notaCliente,
      motivoCancelacion: turnos.motivoCancelacion,
      precioEsperado: turnos.precioEsperado,
      updatedAt: turnos.updatedAt,
      barberoNombre: barberos.nombre,
    })
    .from(turnos)
    .innerJoin(barberos, eq(barberos.id, turnos.barberoId))
    .leftJoin(servicios, eq(servicios.id, turnos.servicioId))
    .where(and(eq(turnos.id, turnoId), eq(turnos.clientId, clientId)))
    .limit(1);

  if (!turno) {
    return null;
  }

  const startsAt = buildTurnoStartAt(turno.fecha, turno.horaInicio);
  const manage = getMarcianoTurnoManagement({
    estado: turno.estado as TurnoEstado,
    fecha: turno.fecha,
    horaInicio: turno.horaInicio,
  });

  return {
    ...turno,
    estado: turno.estado as TurnoEstado,
    startsAt,
    canManage: manage.canManage,
    manageMessage: manage.manageMessage,
  };
}

export async function getMarcianoUpcomingTurno(clientId: string) {
  const turnosList = await getMarcianoTurnosList(clientId);
  const now = new Date();
  return (
    turnosList.find(
      (turno) =>
        (turno.estado === "pendiente" || turno.estado === "confirmado") &&
        turno.startsAt.getTime() >= now.getTime()
    ) ?? null
  );
}

export function splitMarcianoTurnos(turnosList: MarcianoTurnoItem[]) {
  const now = new Date();

  const proximos = turnosList.filter(
    (turno) =>
      (turno.estado === "pendiente" || turno.estado === "confirmado") &&
      turno.startsAt.getTime() >= now.getTime()
  );

  const historial = turnosList
    .filter((turno) => !proximos.some((proximo) => proximo.id === turno.id))
    .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime())
    .slice(0, 8);

  return { proximos, historial };
}

// Reprogramar desde el portal: el turno viejo tiene que ser del Marciano logueado y todavía admitir cambios.
export async function getTurnoAReprogramar(
  userId: string,
  turnoId: string
): Promise<{ ok: true; turnoId: string } | { ok: false; message: string }> {
  const [client] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.userId, userId), eq(clients.esMarciano, true)))
    .limit(1);
  const turno = client ? await getMarcianoTurnoById(client.id, turnoId) : null;
  if (!turno) return { ok: false, message: "No encontramos el turno que querés mover." };
  if (!turno.canManage) {
    return { ok: false, message: turno.manageMessage ?? "Ese turno ya no admite cambios desde el portal." };
  }
  return { ok: true, turnoId: turno.id };
}

export async function cancelarTurnoReprogramado(turnoId: string) {
  await db
    .update(turnos)
    .set({ estado: "cancelado", motivoCancelacion: "Reprogramado por Marciano desde el portal", updatedAt: new Date() })
    .where(and(eq(turnos.id, turnoId), inArray(turnos.estado, ["pendiente", "confirmado"])));
}
