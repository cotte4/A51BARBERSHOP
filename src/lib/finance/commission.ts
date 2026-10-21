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
  /** Lo cobrado por encima del precio de lista: es entero del barbero. */
  propinaBarbero: number;
  comisionBarberoMonto: number;
};

function normalizePct(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return value;
}

// Lo que le toca al barbero (Was, 2026-10-21):
// - su porcentaje sobre el precio de lista (o lo cobrado, si fue menos);
// - más todo lo cobrado por encima del precio de lista: la propina es suya;
// - menos la comisión de MP o tarjeta, que la absorbe él y no el local.
// Así lo del local queda en precioCobrado - comisionBarbero - comisionMedioPago = precio de lista × (1 - %).
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
  const propinaBarbero = Math.max(0, precioCobrado - precioBase);
  const comisionBarberoMonto = Math.max(
    0,
    (baseParaComisionBarbero * comisionBarberoPct) / 100 + propinaBarbero - comisionMedioPagoMonto
  );

  return {
    precioCobrado,
    comisionMedioPagoPct,
    comisionMedioPagoMonto,
    montoNeto,
    comisionBarberoPct,
    baseParaComisionBarbero,
    propinaBarbero,
    comisionBarberoMonto,
  };
}
