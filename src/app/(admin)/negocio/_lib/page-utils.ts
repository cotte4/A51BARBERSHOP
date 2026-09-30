export function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  return Number(value);
}

export { formatARS } from "@/lib/format";

export function getFechaHoyArgentina(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

export function formatHeaderDate(fecha: string): string {
  const formatted = new Date(`${fecha}T12:00:00`).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone: "America/Argentina/Buenos_Aires",
  });

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function getBepProgress(actual: number, target: number): number {
  if (target <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((actual / target) * 100)));
}

export function getBepPips(progress: number): number {
  return Math.max(0, Math.min(5, Math.round((progress / 100) * 5)));
}
