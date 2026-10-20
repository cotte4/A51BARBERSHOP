// Cálculo de turnos libres a partir del horario semanal del barbero, sus días especiales y los turnos
// ya tomados. Puro (sin base): lo usan la reserva pública, el portal Marciano y "Tomar" en /turnos.
// Reemplaza a las filas de turnos_disponibilidad, que se cargaban a mano por fecha y se vencían.

/** Cada cuántos minutos puede arrancar un turno. */
export const PASO_TURNOS_MIN = 30;
/** Hasta cuántos días adelante se puede reservar. */
export const DIAS_RESERVA_ADELANTE = 30;

export const DIAS_SEMANA = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"] as const;

export type Rango = { desde: string; hasta: string };
export type HorarioSemanalFila = { diaSemana: number; desde: string; hasta: string };
export type DiaEspecialFila = {
  /** null = vale para todo el local. */
  barberoId: string | null;
  cerrado: boolean;
  desde: string | null;
  hasta: string | null;
};
export type TurnoTomado = { horaInicio: string; duracionMinutos: number };

export function horaAMinutos(hora: string): number {
  const [h, m] = hora.slice(0, 5).split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function minutosAHora(minutos: number): string {
  const h = Math.floor(minutos / 60).toString().padStart(2, "0");
  const m = (minutos % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

/** Día de la semana de una fecha "YYYY-MM-DD" (0 = domingo), sin depender de la zona horaria. */
export function diaSemanaDeFecha(fecha: string): number {
  const [y, m, d] = fecha.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!)).getUTCDay();
}

/** Suma días a una fecha "YYYY-MM-DD". */
export function sumarDias(fecha: string, dias: number): string {
  const [y, m, d] = fecha.split("-").map(Number);
  const date = new Date(Date.UTC(y!, m! - 1, d! + dias));
  return date.toISOString().slice(0, 10);
}

function rangosDe(filas: { desde: string | null; hasta: string | null }[]): Rango[] {
  return filas
    .filter((f): f is { desde: string; hasta: string } => Boolean(f.desde && f.hasta))
    .map((f) => ({ desde: f.desde.slice(0, 5), hasta: f.hasta.slice(0, 5) }))
    .sort((a, b) => a.desde.localeCompare(b.desde));
}

/**
 * Qué rangos trabaja el barbero ese día. Gana lo más específico:
 * día especial del barbero > día especial del local > horario semanal.
 * Un "cerrado" del local cierra a todos, aunque el barbero tenga otro horario cargado.
 */
export function rangosDelDia(params: {
  fecha: string;
  semanal: HorarioSemanalFila[];
  especiales: DiaEspecialFila[];
}): Rango[] {
  const delLocal = params.especiales.filter((e) => e.barberoId === null);
  const delBarbero = params.especiales.filter((e) => e.barberoId !== null);

  if (delLocal.some((e) => e.cerrado)) return [];
  if (delBarbero.length > 0) {
    return delBarbero.some((e) => e.cerrado) ? [] : rangosDe(delBarbero);
  }
  if (delLocal.length > 0) return rangosDe(delLocal);

  const dia = diaSemanaDeFecha(params.fecha);
  return rangosDe(params.semanal.filter((f) => f.diaSemana === dia));
}

/**
 * Horas de arranque libres ("HH:MM") para un turno de `duracionMinutos`.
 * Un arranque vale si el turno entero entra en un rango y no se pisa con ningún turno tomado:
 * se compara por intervalo, así un turno de 60 min a las 11:00 también bloquea las 11:30.
 */
export function calcularTurnosLibres(params: {
  rangos: Rango[];
  tomados: TurnoTomado[];
  duracionMinutos: number;
  paso?: number;
  /** Minuto del día desde el que se puede arrancar (para hoy: la hora actual). */
  noAntesDe?: number;
}): string[] {
  const paso = params.paso ?? PASO_TURNOS_MIN;
  const ocupados = params.tomados.map((t) => {
    const inicio = horaAMinutos(t.horaInicio);
    return { inicio, fin: inicio + t.duracionMinutos };
  });

  const libres: string[] = [];
  for (const rango of params.rangos) {
    const fin = horaAMinutos(rango.hasta);
    for (let inicio = horaAMinutos(rango.desde); inicio + params.duracionMinutos <= fin; inicio += paso) {
      if (params.noAntesDe !== undefined && inicio < params.noAntesDe) continue;
      const finTurno = inicio + params.duracionMinutos;
      const pisa = ocupados.some((o) => inicio < o.fin && o.inicio < finTurno);
      if (!pisa) libres.push(minutosAHora(inicio));
    }
  }
  return [...new Set(libres)].sort();
}

/** El id de un horario libre es "fecha|hora": ya no hay una fila de la que tomar el id. */
export function armarHorarioId(fecha: string, hora: string): string {
  return `${fecha}|${hora.slice(0, 5)}`;
}

export function leerHorarioId(id: string): { fecha: string; hora: string } | null {
  const match = /^(\d{4}-\d{2}-\d{2})\|(\d{2}:\d{2})$/.exec(id);
  return match ? { fecha: match[1]!, hora: match[2]! } : null;
}
