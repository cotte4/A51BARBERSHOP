export type TurnoInterval = {
  horaInicio: string;
  duracionMinutos: number;
};

export function normalizeHora(hora: string): string {
  return hora.slice(0, 5);
}

export function timeToMinutes(hora: string): number {
  const [hours, minutes] = normalizeHora(hora).split(":").map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

export function intervalsOverlap(
  firstStart: string,
  firstDuration: number,
  secondStart: string,
  secondDuration: number
): boolean {
  const firstStartMinutes = timeToMinutes(firstStart);
  const secondStartMinutes = timeToMinutes(secondStart);
  const firstEndMinutes = firstStartMinutes + firstDuration;
  const secondEndMinutes = secondStartMinutes + secondDuration;

  return firstStartMinutes < secondEndMinutes && secondStartMinutes < firstEndMinutes;
}

export function overlapsTurnoInterval(
  horaInicio: string,
  duracionMinutos: number,
  occupied: TurnoInterval[]
): boolean {
  return occupied.some((turno) =>
    intervalsOverlap(horaInicio, duracionMinutos, turno.horaInicio, turno.duracionMinutos)
  );
}
