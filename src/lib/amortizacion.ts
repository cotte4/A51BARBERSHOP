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
 * Devuelve string "Mes YYYY" (ej: "Abril 2027").
 *
 * @param fechaInicio - fecha en formato "YYYY-MM-DD"
 * @param cuotasPagadas - cantidad de cuotas ya registradas
 * @param cantidadCuotas - total de cuotas pactadas
 */
export function calcularFechaCancelacion(
  fechaInicio: string,
  cuotasPagadas: number,
  cantidadCuotas: number
): string {
  const cuotasRestantes = cantidadCuotas - cuotasPagadas;
  const [year, month, day] = fechaInicio.split("-").map(Number);
  // Fecha de la última cuota = fechaInicio + (cantidadCuotas - 1) meses
  // Equivalentemente: fecha del primer pago + (cuotasRestantes - 1) meses adelante
  const fechaBase = new Date(year, month - 1, day);
  // La fecha de cancelación es siempre la de la última cuota: fechaInicio + (cantidadCuotas - 1) meses
  const mesesHastaFin = cantidadCuotas - 1;
  fechaBase.setMonth(fechaBase.getMonth() + mesesHastaFin);

  return fechaBase.toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
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
