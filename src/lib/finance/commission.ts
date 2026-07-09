type AtencionCommissionInput = {
  precioCobrado: number;
  comisionMedioPagoPct: number;
  comisionBarberoPct: number;
  servicioPrecioBase?: number | null;
};

export type AtencionCommissionBreakdown = {
  precioCobrado: number;
  comisionMedioPagoPct: number;
  comisionMedioPagoMonto: number;
  montoNeto: number;
  comisionBarberoPct: number;
  baseParaComisionBarbero: number;
  comisionBarberoMonto: number;
};

function normalizePct(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return value;
}

export function calculateAtencionCommission(
  input: AtencionCommissionInput
): AtencionCommissionBreakdown {
  const precioCobrado = Number.isFinite(input.precioCobrado) ? input.precioCobrado : 0;
  const comisionMedioPagoPct = normalizePct(input.comisionMedioPagoPct);
  const comisionBarberoPct = normalizePct(input.comisionBarberoPct);

  const comisionMedioPagoMonto = (precioCobrado * comisionMedioPagoPct) / 100;
  const montoNeto = precioCobrado - comisionMedioPagoMonto;

  const precioBase =
    input.servicioPrecioBase != null && Number.isFinite(input.servicioPrecioBase)
      ? input.servicioPrecioBase
      : precioCobrado;
  const baseParaComisionBarbero = Math.min(precioCobrado, precioBase);
  const comisionBarberoMonto = (baseParaComisionBarbero * comisionBarberoPct) / 100;

  return {
    precioCobrado,
    comisionMedioPagoPct,
    comisionMedioPagoMonto,
    montoNeto,
    comisionBarberoPct,
    baseParaComisionBarbero,
    comisionBarberoMonto,
  };
}
