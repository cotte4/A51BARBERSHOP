/**
 * Lógica del repago Memas. Todas las cifras en USD.
 *
 * Modelo vigente: "primero el capital, el interés aparte".
 *   - Todo lo que pagan baja la deuda: falta = préstamo − lo pagado.
 *   - El interés corre aparte, día a día, desde el primer pago, a `tasaAnual`
 *     sobre el capital que se sigue debiendo:  capital × tasa × días / 365.
 *     NO se descuenta de los pagos: se acumula y se define al final.
 *   - El interés acumulado nunca supera el del plan de referencia (cronograma
 *     alemán pactado). Si devuelven antes, el interés es menor.
 *
 * El cronograma alemán queda solo como referencia: fija el tope de interés y
 * la cuota mensual sugerida (capital fijo).
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
 * Cronograma alemán de referencia:
 *   capitalFijo = deudaUsd / cantidadCuotas
 *   interes_N   = saldo_N × (tasaAnual / 12)
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
    const saldoFinal = Math.max(0, saldo - capitalFijo);

    cronograma.push({
      numeroCuota: i,
      saldoInicial: saldo,
      capital: capitalFijo,
      interes,
      cuotaTotal: capitalFijo + interes,
      saldoFinal,
    });

    saldo = saldoFinal;
  }

  return cronograma;
}

/** Redondeo a centavos. Cada paso del cálculo trabaja en centavos exactos. */
export function redondearUsd(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Días corridos entre dos fechas "YYYY-MM-DD" (0 si `hasta` es anterior). */
export function diasEntre(desde: string, hasta: string): number {
  const toUtc = (fecha: string) => {
    const [y, m, d] = fecha.slice(0, 10).split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.max(0, Math.round((toUtc(hasta) - toUtc(desde)) / 86_400_000));
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
  return redondearUsd(moneda === "ARS" ? montoIngresado / tcDia : montoIngresado);
}

export interface PlanRepago {
  deudaUsd: number;
  tasaAnual: number;
  cantidadCuotas: number;
}

export interface PagoRepago {
  /** "YYYY-MM-DD" */
  fecha: string;
  montoUsd: number;
}

export interface AplicacionPago extends PagoRepago {
  /** Días que pasaron desde el pago anterior */
  dias: number;
  /** Interés que se acumuló (aparte) durante esos días */
  interesPeriodo: number;
  /** Lo que bajó la deuda: todo el pago, salvo lo que exceda el saldo */
  capital: number;
  /** Lo que sobró después de devolver todo (el servicio no lo permite) */
  excedente: number;
  /** Deuda después de este pago */
  saldoDespues: number;
}

export interface EstadoRepago {
  aplicaciones: AplicacionPago[];
  capitalFijo: number;
  topeInteres: number;
  totalPagadoUsd: number;
  /** Deuda que falta devolver = préstamo − lo devuelto */
  saldoCapital: number;
  /** Interés acumulado aparte a la fecha de corte (sin cobrar) */
  interesAcumulado: number;
  /** Ya devolvieron todo el préstamo */
  capitalDevuelto: boolean;
  /** Cuotas del plan de referencia cubiertas por lo devuelto */
  cuotasCubiertas: number;
  /** Cuota sugerida: el capital fijo del plan, sin pasarse de lo que falta */
  cuotaSugerida: number;
}

/** Interés total del plan de referencia: es el tope que nunca se supera. */
export function calcularTopeInteres(plan: PlanRepago): number {
  return redondearUsd(
    generarCronograma(plan.deudaUsd, plan.tasaAnual, plan.cantidadCuotas).reduce(
      (sum, cuota) => sum + cuota.interes,
      0
    )
  );
}

/**
 * Recalcula todo el repago desde la lista de pagos.
 *
 * Es la única fuente de verdad: lo guardado en cada fila y el saldo del
 * repago son un reflejo de este cálculo, no al revés.
 *
 * @param hasta - fecha de corte "YYYY-MM-DD" para el interés acumulado (hoy)
 */
export function calcularEstadoRepago(
  plan: PlanRepago,
  pagos: PagoRepago[],
  hasta: string
): EstadoRepago {
  const tasaDiaria = plan.tasaAnual / 365;
  const topeInteres = calcularTopeInteres(plan);
  const capitalFijo = plan.deudaUsd / plan.cantidadCuotas;
  const ordenados = [...pagos].sort((a, b) => a.fecha.localeCompare(b.fecha));

  let saldo = redondearUsd(plan.deudaUsd);
  let interesAcumulado = 0;
  let desde = null as string | null;

  // Acumula interés entre `desde` y `fecha` sobre el saldo, sin pasar el tope.
  const acumular = (fecha: string) => {
    if (desde === null || saldo <= 0) return { dias: 0, interes: 0 };
    const dias = diasEntre(desde, fecha);
    const bruto = redondearUsd(saldo * tasaDiaria * dias);
    const interes = Math.min(bruto, redondearUsd(Math.max(0, topeInteres - interesAcumulado)));
    interesAcumulado = redondearUsd(interesAcumulado + interes);
    return { dias, interes };
  };

  const aplicaciones: AplicacionPago[] = ordenados.map((pago) => {
    const { dias, interes } = acumular(pago.fecha);
    if (desde === null || pago.fecha > desde) desde = pago.fecha;

    const monto = redondearUsd(pago.montoUsd);
    const capital = Math.min(monto, saldo);
    saldo = redondearUsd(saldo - capital);

    return {
      ...pago,
      montoUsd: monto,
      dias,
      interesPeriodo: interes,
      capital,
      excedente: redondearUsd(monto - capital),
      saldoDespues: saldo,
    };
  });

  if (desde !== null && hasta > desde) acumular(hasta);

  const capitalPagado = redondearUsd(aplicaciones.reduce((s, a) => s + a.capital, 0));

  return {
    aplicaciones,
    capitalFijo,
    topeInteres,
    totalPagadoUsd: redondearUsd(aplicaciones.reduce((s, a) => s + a.montoUsd, 0)),
    saldoCapital: saldo,
    interesAcumulado,
    capitalDevuelto: aplicaciones.length > 0 && saldo <= 0,
    cuotasCubiertas: Math.min(
      plan.cantidadCuotas,
      Math.floor((capitalPagado + 0.01) / capitalFijo)
    ),
    cuotaSugerida: Math.min(saldo, redondearUsd(capitalFijo)),
  };
}

/**
 * Meses que faltan si de acá en adelante devuelven el capital fijo del plan
 * (u$d 147,50) cada mes. Es una estimación para mostrar, no una obligación.
 */
export function mesesRestantesEstimados(saldoCapital: number, capitalFijo: number): number {
  if (saldoCapital <= 0 || capitalFijo <= 0) return 0;
  return Math.ceil(redondearUsd(saldoCapital / capitalFijo) - 0.0001);
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
