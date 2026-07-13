/**
 * Lógica de amortización alemana para el módulo Memas.
 *
 * Fórmula:
 *   capitalFijo = deudaUsd / cantidadCuotas
 *   interes_N   = saldo_N × (tasaAnual / 12)
 *   cuotaTotal_N = capitalFijo + interes_N
 *   saldo_N+1   = saldo_N - capitalFijo
 */

export interface CuotaCronograma {
  numeroCuota: number;
  saldoInicial: number;
  capital: number;
  interes: number;
  cuotaTotal: number;
  saldoFinal: number;
}

/**
 * Genera el cronograma completo de amortización alemana.
 * Todas las cifras en USD.
 */
export function generarCronograma(
  deudaUsd: number,
  tasaAnual: number,
  cantidadCuotas: number
): CuotaCronograma[] {
  const tasaMensual = tasaAnual / 12;
  const capitalFijo = deudaUsd / cantidadCuotas;
  let saldo = deudaUsd;
  const cronograma: CuotaCronograma[] = [];

  for (let i = 1; i <= cantidadCuotas; i++) {
    const interes = saldo * tasaMensual;
    const cuotaTotal = capitalFijo + interes;
    const saldoFinal = Math.max(0, saldo - capitalFijo);

    cronograma.push({
      numeroCuota: i,
      saldoInicial: saldo,
      capital: capitalFijo,
      interes,
      cuotaTotal,
      saldoFinal,
    });

    saldo = saldoFinal;
  }

  return cronograma;
}

/**
 * Devuelve la próxima cuota esperada según cuántas ya se pagaron.
 * Si todas las cuotas están pagadas, devuelve null.
 */
export function calcularCuotaSiguiente(
  cronograma: CuotaCronograma[],
  cuotasPagadas: number
): CuotaCronograma | null {
  if (cuotasPagadas >= cronograma.length) return null;
  return cronograma[cuotasPagadas]; // índice 0 = cuota 1
}

/**
 * Calcula la fecha proyectada de cancelación completa.
 * Devuelve string "Mes YYYY" (ej: "abril de 2027").
 *
 * Proyecta desde el último pago real (una cuota por mes hacia adelante);
 * si todavía no hubo pagos, proyecta desde hoy. Así la fecha acompaña la
 * realidad de los pagos en vez de asumir que arrancaron en `fechaInicio`.
 *
 * @param fechaUltimoPago - fecha "YYYY-MM-DD" del último pago registrado, o null
 * @param cuotasPagadas - cantidad de cuotas ya registradas
 * @param cantidadCuotas - total de cuotas pactadas
 */
export function calcularFechaCancelacion(
  fechaUltimoPago: string | null | undefined,
  cuotasPagadas: number,
  cantidadCuotas: number
): string {
  const cuotasRestantes = Math.max(0, cantidadCuotas - cuotasPagadas);
  const base = fechaUltimoPago ?? new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
  const [year, month, day] = base.split("-").map(Number);
  const fechaBase = new Date(Date.UTC(year, month - 1, day, 12));
  fechaBase.setUTCMonth(fechaBase.getUTCMonth() + cuotasRestantes);

  return fechaBase.toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Saldo real de la deuda en USD.
 *
 * Usa el cache `saldo_pendiente` cuando es coherente (0 < saldo ≤ deuda);
 * si viene nulo o corrupto (p. ej. un valor legacy en ARS), cae al saldo
 * teórico del cronograma para esa altura del plan.
 */
export function calcularSaldoReal(
  saldoCache: number | null | undefined,
  deudaUsd: number,
  saldoTeorico: number
): number {
  if (saldoCache == null) return saldoTeorico;
  const saldo = Number(saldoCache);
  if (Number.isFinite(saldo) && saldo >= 0 && saldo <= deudaUsd) {
    return saldo;
  }
  return saldoTeorico;
}

/**
 * Convierte el monto ingresado a USD. El préstamo se descuenta siempre en USD;
 * si la persona pagó en ARS, se convierte con el TC del día. En USD es passthrough.
 */
export function convertirMontoAUsd(
  montoIngresado: number,
  moneda: "USD" | "ARS",
  tcDia: number
): number {
  return moneda === "ARS" ? montoIngresado / tcDia : montoIngresado;
}

export interface PagoFlexibleInput {
  /** Saldo real de la deuda hoy (USD) */
  saldoPendiente: number;
  /** Capital ya amortizado dentro de la cuota corriente (pagos parciales previos) */
  capitalYaPagado: number;
  /** Interés ya pagado dentro de la cuota corriente */
  interesYaPagado: number;
  /** Capital objetivo de la cuota corriente según cronograma */
  capitalCuota: number;
  /** Tasa anual (ej. 0.10) */
  tasaAnual: number;
  /** Monto del pago (USD) */
  montoPagadoUsd: number;
}

export interface PagoFlexibleResult {
  interesPagado: number;
  capitalPagado: number;
  nuevoSaldo: number;
  cuotaCompletada: boolean;
  pagadoCompleto: boolean;
}

/**
 * Aplica un pago flexible ("pagá lo que puedas") sobre la cuota corriente.
 *
 * El interés de la cuota se calcula UNA vez sobre el saldo al inicio de la
 * cuota (saldo actual + capital ya amortizado dentro de ella). Cada pago
 * cubre primero el interés pendiente y el resto amortiza capital. La cuota
 * queda completada cuando su capital objetivo está cubierto o la deuda
 * entera quedó saldada.
 */
export function aplicarPagoFlexible(input: PagoFlexibleInput): PagoFlexibleResult {
  const saldoInicioCuota = input.saldoPendiente + input.capitalYaPagado;
  const interesCuotaTotal = saldoInicioCuota * (input.tasaAnual / 12);
  const interesPendiente = Math.max(0, interesCuotaTotal - input.interesYaPagado);

  const interesPagado = Math.min(input.montoPagadoUsd, interesPendiente);
  const capitalPagado = Math.min(
    input.montoPagadoUsd - interesPagado,
    input.saldoPendiente
  );

  const nuevoSaldo = Math.max(0, input.saldoPendiente - capitalPagado);
  const pagadoCompleto = nuevoSaldo <= 0.01;
  const capitalObjetivo = Math.min(input.capitalCuota, saldoInicioCuota);
  const cuotaCompletada =
    pagadoCompleto || input.capitalYaPagado + capitalPagado + 0.01 >= capitalObjetivo;

  return { interesPagado, capitalPagado, nuevoSaldo, cuotaCompletada, pagadoCompleto };
}

/**
 * Calcula el porcentaje de avance de pago (0–100).
 *
 * @param capitalPagadoAcumulado - suma de capitalPagado de todas las cuotas registradas
 * @param deudaUsd - deuda original en USD
 */
export function calcularPorcentajeAvance(
  capitalPagadoAcumulado: number,
  deudaUsd: number
): number {
  if (deudaUsd <= 0) return 100;
  return Math.min(100, Math.max(0, (capitalPagadoAcumulado / deudaUsd) * 100));
}

/**
 * Formatea un valor numérico como "u$d X,XX".
 */
export function formatUSD(val: number): string {
  return (
    "u$d " +
    val.toLocaleString("es-AR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}
