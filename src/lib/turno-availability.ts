export type AvailabilitySlot = {
  horaInicio: string;
  duracionMinutos: number;
};

export type OccupiedTurno = {
  horaInicio: string;
  duracionMinutos: number;
};

type TimeRange = {
  start: number;
  end: number;
};

export function normalizeHora(hora: string): string {
  return hora.slice(0, 5);
}

function timeToMinutes(hora: string): number {
  const [h, m] = normalizeHora(hora).split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function toTimeRange(item: AvailabilitySlot | OccupiedTurno): TimeRange {
  const start = timeToMinutes(item.horaInicio);
  return {
    start,
    end: start + item.duracionMinutos,
  };
}

function rangesOverlap(a: TimeRange, b: TimeRange): boolean {
  return a.start < b.end && b.start < a.end;
}

export function hasOverlappingTurno(
  horaInicio: string,
  duracionMinutos: number,
  ocupados: OccupiedTurno[]
): boolean {
  const target = toTimeRange({ horaInicio, duracionMinutos });
  return ocupados.some((ocupado) => rangesOverlap(target, toTimeRange(ocupado)));
}

export function isAvailabilityCovered(
  horaInicio: string,
  duracionMinutos: number,
  slots: AvailabilitySlot[]
): boolean {
  const start = timeToMinutes(horaInicio);
  const requiredEnd = start + duracionMinutos;
  let coveredUntil = start;

  const orderedSlots = slots
    .map((slot) => ({
      ...slot,
      horaInicio: normalizeHora(slot.horaInicio),
    }))
    .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));

  for (const slot of orderedSlots) {
    const slotStart = timeToMinutes(slot.horaInicio);
    if (slotStart < start) {
      continue;
    }
    if (slotStart > coveredUntil) {
      break;
    }

    coveredUntil = Math.max(coveredUntil, slotStart + slot.duracionMinutos);
    if (coveredUntil >= requiredEnd) {
      return true;
    }
  }

  return false;
}

export function filterAvailableSlotsForTurnos<TSlot extends AvailabilitySlot>(
  slots: TSlot[],
  ocupados: OccupiedTurno[],
  duracionMinutos?: number
): TSlot[] {
  const normalizedSlots = slots
    .map((slot) => ({
      ...slot,
      horaInicio: normalizeHora(slot.horaInicio),
    }))
    .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));

  return normalizedSlots.filter((slot) => {
    const requiredDuration = duracionMinutos ?? slot.duracionMinutos;
    return (
      !hasOverlappingTurno(slot.horaInicio, requiredDuration, ocupados) &&
      isAvailabilityCovered(slot.horaInicio, requiredDuration, normalizedSlots)
    );
  });
}
