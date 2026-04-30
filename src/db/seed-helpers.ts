export function workingDaysOfMonth(year: number, month: number): string[] {
  const days: string[] = [];
  const daysInMonth = new Date(year, month, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(year, month - 1, d).getDay();
    if (dow !== 0 && dow !== 6) {
      days.push(
        `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`
      );
    }
  }
  return days;
}

export function pickRandom<T>(arr: readonly T[]): T {
  if (arr.length === 0) throw new Error("pickRandom: empty array");
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export type AtencionFinancials = {
  comisionMedioPagoPct: string;
  comisionMedioPagoMonto: string;
  montoNeto: string;
  comisionBarberoPct: string | null;
  comisionBarberoMonto: string | null;
};

export function calcAtencionFinancials(
  precioCobrado: number,
  precioBase: number,
  medioPagoComisionPct: number,
  barberoComisionPct: number | null
): AtencionFinancials {
  const comisionMP = (precioCobrado * medioPagoComisionPct) / 100;
  const neto = precioCobrado - comisionMP;
  // Commission is capped at precioBase to exclude tips — mirrors caja-atencion.ts:173
  const baseParaComision = Math.min(precioCobrado, precioBase);
  const comisionBarbero =
    barberoComisionPct != null
      ? (baseParaComision * barberoComisionPct) / 100
      : null;

  return {
    comisionMedioPagoPct: medioPagoComisionPct.toFixed(2),
    comisionMedioPagoMonto: comisionMP.toFixed(2),
    montoNeto: neto.toFixed(2),
    comisionBarberoPct: comisionBarbero != null ? barberoComisionPct!.toFixed(2) : null,
    comisionBarberoMonto: comisionBarbero != null ? comisionBarbero.toFixed(2) : null,
  };
}
