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
 * el calendario de cuotas contra el que se mide si van al día
 * (`calcularCalendarioCuotas`).
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
  };
}

export type EstadoCuota = "pagada" | "parcial" | "atrasada" | "pendiente";

export interface CuotaCalendario {
  numero: number;
  /** Mes al que corresponde la cuota, "YYYY-MM" */
  mes: string;
  monto: number;
  /** Cuánto de esta cuota ya está cubierto con lo devuelto */
  cubierto: number;
  estado: EstadoCuota;
  esMesActual: boolean;
}

export type SituacionRepago = "adelantado" | "al_dia" | "atrasado" | "devuelto";

export interface CalendarioCuotas {
  cuotas: CuotaCalendario[];
  situacion: SituacionRepago;
  /** Lo que falta para cubrir las cuotas de meses que ya terminaron */
  atrasoUsd: number;
  /** Última cuota cubierta entera, en orden */
  ultimaPagada: CuotaCalendario | null;
  /** Primera cuota que no está cubierta entera */
  proxima: CuotaCalendario | null;
  faltaProxima: number;
  /** Qué conviene pagar ahora: ponerse al día, o completar la próxima cuota */
  sugerencia: { tipo: "ponerse_al_dia" | "proxima_cuota"; montoUsd: number } | null;
}

function sumarMeses(mes: string, meses: number): string {
  const [y, m] = mes.split("-").map(Number);
  const total = y * 12 + (m - 1) + meses;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

/**
 * Calendario de cuotas de referencia contra lo devuelto.
 *
 * No cambia ningún número de la deuda: reparte lo devuelto en las cuotas del
 * plan, en orden, para mostrar hasta dónde están cubiertos. La cuota de cada
 * mes se puede pagar durante ese mes; queda atrasada recién cuando el mes
 * terminó sin cubrirla. Funciona para cualquier cantidad de cuotas.
 *
 * @param fechaInicio - "YYYY-MM-DD": el mes de la cuota 1
 * @param totalDevuelto - USD devueltos (suma de los pagos)
 * @param hoy - "YYYY-MM-DD"
 */
export function calcularCalendarioCuotas(
  plan: PlanRepago,
  fechaInicio: string,
  totalDevuelto: number,
  hoy: string
): CalendarioCuotas {
  const n = Math.max(1, plan.cantidadCuotas);
  const deudaCent = Math.round(plan.deudaUsd * 100);
  const baseCent = Math.floor(deudaCent / n);
  const mesInicio = fechaInicio.slice(0, 7);
  const mesActual = hoy.slice(0, 7);

  let disponibleCent = Math.round(Math.max(0, totalDevuelto) * 100);
  let vencidoCent = 0;
  let conEsteMesCent = 0;

  const cuotas: CuotaCalendario[] = Array.from({ length: n }, (_, i) => {
    // La última cuota absorbe los centavos del redondeo: la suma da la deuda exacta.
    const montoCent = i === n - 1 ? deudaCent - baseCent * (n - 1) : baseCent;
    const cubiertoCent = Math.min(montoCent, disponibleCent);
    disponibleCent -= cubiertoCent;

    const mes = sumarMeses(mesInicio, i);
    if (mes < mesActual) vencidoCent += montoCent;
    if (mes <= mesActual) conEsteMesCent += montoCent;

    const estado: EstadoCuota =
      cubiertoCent >= montoCent
        ? "pagada"
        : mes < mesActual
          ? "atrasada"
          : cubiertoCent > 0
            ? "parcial"
            : "pendiente";

    return {
      numero: i + 1,
      mes,
      monto: montoCent / 100,
      cubierto: cubiertoCent / 100,
      estado,
      esMesActual: mes === mesActual,
    };
  });

  const devueltoCent = Math.round(Math.max(0, totalDevuelto) * 100);
  const atrasoCent = Math.max(0, vencidoCent - devueltoCent);
  const situacion: SituacionRepago =
    devueltoCent >= deudaCent
      ? "devuelto"
      : atrasoCent > 0
        ? "atrasado"
        : devueltoCent > conEsteMesCent
          ? "adelantado"
          : "al_dia";

  const pagadas = cuotas.filter((cuota) => cuota.estado === "pagada");
  const proxima = cuotas.find((cuota) => cuota.estado !== "pagada") ?? null;
  const faltaProxima = proxima ? redondearUsd(proxima.monto - proxima.cubierto) : 0;

  return {
    cuotas,
    situacion,
    atrasoUsd: atrasoCent / 100,
    ultimaPagada: pagadas.at(-1) ?? null,
    proxima,
    faltaProxima,
    sugerencia:
      situacion === "devuelto"
        ? null
        : situacion === "atrasado"
          ? { tipo: "ponerse_al_dia", montoUsd: atrasoCent / 100 }
          : { tipo: "proxima_cuota", montoUsd: faltaProxima },
  };
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
