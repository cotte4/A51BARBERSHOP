export function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  return Number(value);
}

export function formatARS(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

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

export function getInitials(nombre: string): string {
  const parts = nombre.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function addMonthsToDate(fecha: string, months: number): Date {
  const [year, month, day] = fecha.split("-").map(Number);
  const result = new Date(Date.UTC(year, month - 1, day, 12));
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}

export function formatShortDate(date: Date): string {
  return date.toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function getDueLabel(date: Date, today: string): string {
  const base = new Date(`${today}T12:00:00Z`);
  const diffDays = Math.round((date.getTime() - base.getTime()) / 86400000);

  if (diffDays < 0) {
    const overdue = Math.abs(diffDays);
    return `Vencida hace ${overdue} dia${overdue === 1 ? "" : "s"}`;
  }

  if (diffDays === 0) {
    return "Vence hoy";
  }

  if (diffDays === 1) {
    return "Vence manana";
  }

  return `Vence en ${diffDays} dias`;
}

export function getBepProgress(actual: number, target: number): number {
  if (target <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((actual / target) * 100)));
}

export function getBepPips(progress: number): number {
  return Math.max(0, Math.min(5, Math.round((progress / 100) * 5)));
}
