/**
 * Lógica del repago Memas. Todas las cifras en USD.
 *
 * Modelo vigente: "pagá cuando puedas" con interés por tiempo real.
 *   - El interés corre desde el primer pago, día a día, a `tasaAnual`
 *     sobre el capital que se sigue debiendo:  capital × tasa × días / 365.
 *   - Cada pago cubre primero el interés corrido y el resto devuelve capital.
 *   - El interés total nunca supera el del plan de referencia (cronograma
 *     alemán pactado). Si cancelan antes, pagan menos interés.
 *
 * El cronograma alemán queda solo como referencia: fija el tope de interés y
 * la cuota mensual sugerida (capital fijo + interés corrido).
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
  /** Días de interés que corrieron desde el pago anterior */
  dias: number;
  interes: number;
  capital: number;
  /** Lo que sobró después de cancelar todo (debería ser siempre 0) */
  excedente: number;
  /** Capital adeudado después de este pago */
  saldoDespues: number;
}

export interface EstadoRepago {
  aplicaciones: AplicacionPago[];
  capitalFijo: number;
  topeInteres: number;
  totalPagadoUsd: number;
  capitalPagado: number;
  interesPagado: number;
  /** Capital que falta devolver */
  saldoCapital: number;
  /** Interés corrido y todavía no pagado a la fecha de corte */
  interesCorrido: number;
  /** Lo que hay que pagar a la fecha de corte para cancelar todo */
  totalParaCancelar: number;
  pagadoCompleto: boolean;
  /** Cuotas del plan de referencia cubiertas por el capital devuelto */
  cuotasCubiertas: number;
  /** Cuota sugerida a la fecha de corte: capital fijo + interés corrido */
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
 * Es la única fuente de verdad: los montos de capital/interés guardados en
 * cada fila son un reflejo de este cálculo, no al revés.
 *
 * @param hasta - fecha de corte "YYYY-MM-DD" para el interés corrido (hoy)
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
  let interesPendiente = 0;
  let interesDevengado = 0;
  let desde = null as string | null;

  // Devenga interés entre `desde` y `fecha`, sin pasar el tope del plan.
  const devengar = (fecha: string) => {
    if (desde === null) return 0;
    const dias = diasEntre(desde, fecha);
    const bruto = redondearUsd(saldo * tasaDiaria * dias);
    const disponible = redondearUsd(Math.max(0, topeInteres - interesDevengado));
    const interes = Math.min(bruto, disponible);
    interesDevengado = redondearUsd(interesDevengado + interes);
    interesPendiente = redondearUsd(interesPendiente + interes);
    return dias;
  };

  const aplicaciones: AplicacionPago[] = ordenados.map((pago) => {
    const dias = devengar(pago.fecha);
    if (desde === null || pago.fecha > desde) desde = pago.fecha;

    const monto = redondearUsd(pago.montoUsd);
    const interes = Math.min(monto, interesPendiente);
    const capital = Math.min(redondearUsd(monto - interes), saldo);
    const excedente = redondearUsd(monto - interes - capital);

    interesPendiente = redondearUsd(interesPendiente - interes);
    saldo = redondearUsd(saldo - capital);

    return { ...pago, montoUsd: monto, dias, interes, capital, excedente, saldoDespues: saldo };
  });

  const pagadoCompleto = aplicaciones.length > 0 && saldo <= 0;
  if (!pagadoCompleto && desde !== null && hasta > desde) devengar(hasta);
  const interesCorrido = pagadoCompleto ? 0 : interesPendiente;

  const suma = (key: "montoUsd" | "capital" | "interes") =>
    redondearUsd(aplicaciones.reduce((s, a) => s + a[key], 0));
  const capitalPagado = suma("capital");
  const totalParaCancelar = redondearUsd(saldo + interesCorrido);

  return {
    aplicaciones,
    capitalFijo,
    topeInteres,
    totalPagadoUsd: suma("montoUsd"),
    capitalPagado,
    interesPagado: suma("interes"),
    saldoCapital: saldo,
    interesCorrido,
    totalParaCancelar,
    pagadoCompleto,
    cuotasCubiertas: Math.min(
      plan.cantidadCuotas,
      Math.floor((capitalPagado + 0.01) / capitalFijo)
    ),
    cuotaSugerida: Math.min(totalParaCancelar, redondearUsd(capitalFijo + interesCorrido)),
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
