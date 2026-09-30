import { describe, it, expect } from "vitest";
import {
  calcularCalendarioCuotas,
  calcularEstadoRepago,
  calcularTopeInteres,
  convertirMontoAUsd,
  diasEntre,
} from "@/lib/amortizacion";

// Plan real: u$d 1.770, 10% anual, 12 cuotas de referencia (capital fijo 147,50)
const PLAN = { deudaUsd: 1770, tasaAnual: 0.1, cantidadCuotas: 12 };

// Los tres pagos reales cargados en prod
const PAGOS_REALES = [
  { fecha: "2026-07-23", montoUsd: convertirMontoAUsd(200_000, "ARS", 1550) }, // 129,03
  { fecha: "2026-08-12", montoUsd: convertirMontoAUsd(200_000, "ARS", 1530) }, // 130,72
  { fecha: "2026-09-28", montoUsd: 600 }, // efectivo
];

describe("repago: primero el capital", () => {
  it("todo lo pagado baja la deuda: falta = préstamo − pagado", () => {
    const e = calcularEstadoRepago(PLAN, PAGOS_REALES, "2026-09-29");
    expect(e.totalPagadoUsd).toBe(859.75);
    expect(e.saldoCapital).toBe(910.25); // 1.770 − 859,75
    expect(e.saldoCapital + e.totalPagadoUsd).toBeCloseTo(1770, 2);
  });

  it("la cuenta del tesorero con los dos primeros pagos da 1.510,25", () => {
    const e = calcularEstadoRepago(PLAN, PAGOS_REALES.slice(0, 2), "2026-08-12");
    expect(e.saldoCapital).toBe(1510.25);
  });

  it("cada pago baja exactamente lo que entregaron", () => {
    const e = calcularEstadoRepago(PLAN, PAGOS_REALES, "2026-09-29");
    expect(e.aplicaciones.map((a) => a.capital)).toEqual([129.03, 130.72, 600]);
    expect(e.aplicaciones.map((a) => a.saldoDespues)).toEqual([1640.97, 1510.25, 910.25]);
  });

  it("cuotas cubiertas salen del plan de referencia", () => {
    const e = calcularEstadoRepago(PLAN, PAGOS_REALES, "2026-09-29");
    expect(e.cuotasCubiertas).toBe(5); // 859,75 / 147,50 = 5,8
  });
});

describe("repago: interés aparte, por días", () => {
  it("se acumula por período sobre lo que se debía, sin descontarse de los pagos", () => {
    const e = calcularEstadoRepago(PLAN, PAGOS_REALES, "2026-09-29");
    const periodos = e.aplicaciones.map((a) => [a.dias, a.interesPeriodo]);
    expect(periodos).toEqual([
      [0, 0], // el interés corre desde el primer pago
      [20, 8.99], // 1.640,97 × 10% × 20 / 365
      [47, 19.45], // 1.510,25 × 10% × 47 / 365
    ]);
    // + 1 día hasta hoy: 910,25 × 10% / 365 = 0,25
    expect(e.interesAcumulado).toBe(28.69);
  });

  it("el tope es el interés total del cronograma alemán", () => {
    // 0,1/12 × 147,50 × (12+11+…+1) = 95,875
    expect(calcularTopeInteres(PLAN)).toBe(95.88);
  });

  it("aunque pase mucho tiempo, el interés acumulado nunca supera el tope", () => {
    const e = calcularEstadoRepago(PLAN, [{ fecha: "2026-01-01", montoUsd: 10 }], "2030-01-01");
    expect(e.interesAcumulado).toBe(95.88);
  });

  it("devolver antes → menos interés; al devolver todo, el interés deja de correr", () => {
    const pagos = [...PAGOS_REALES, { fecha: "2026-10-01", montoUsd: 910.25 }];
    const alCancelar = calcularEstadoRepago(PLAN, pagos, "2026-10-01");
    const unAnioDespues = calcularEstadoRepago(PLAN, pagos, "2027-10-01");
    expect(alCancelar.capitalDevuelto).toBe(true);
    expect(alCancelar.saldoCapital).toBe(0);
    expect(unAnioDespues.interesAcumulado).toBe(alCancelar.interesAcumulado);
    expect(alCancelar.interesAcumulado).toBeLessThan(alCancelar.topeInteres);
  });
});

describe("repago: casos borde", () => {
  it("pago mayor a lo que falta → baja hasta 0 y el sobrante queda como excedente", () => {
    const e = calcularEstadoRepago(PLAN, [{ fecha: "2026-01-01", montoUsd: 2000 }], "2026-01-01");
    expect(e.saldoCapital).toBe(0);
    expect(e.aplicaciones[0].excedente).toBe(230);
  });

  it("el orden de carga no importa: se aplica por fecha", () => {
    const a = calcularEstadoRepago(PLAN, PAGOS_REALES, "2026-09-29");
    const b = calcularEstadoRepago(PLAN, [...PAGOS_REALES].reverse(), "2026-09-29");
    expect(b.saldoCapital).toBe(a.saldoCapital);
    expect(b.interesAcumulado).toBe(a.interesAcumulado);
  });

  it("sin pagos → se debe el préstamo entero y no corre interés", () => {
    const e = calcularEstadoRepago(PLAN, [], "2026-09-29");
    expect(e).toMatchObject({ saldoCapital: 1770, interesAcumulado: 0, capitalDevuelto: false });
  });

});

describe("repago: helpers", () => {
  it("diasEntre cuenta días corridos y nunca da negativo", () => {
    expect(diasEntre("2026-07-23", "2026-08-12")).toBe(20);
    expect(diasEntre("2026-08-12", "2026-07-23")).toBe(0);
  });

  it("pago en USD es passthrough; en ARS convierte con el TC del día", () => {
    expect(convertirMontoAUsd(600, "USD", 1500)).toBe(600);
    expect(convertirMontoAUsd(900_000, "ARS", 1500)).toBe(600);
  });

});

describe("repago: calendario de cuotas (¿van al día?)", () => {
  const INICIO = "2026-08-01"; // cuota 1 = agosto 2026, cuota 12 = julio 2027

  it("caso real: 859,75 devueltos al 29/09 → 5 cuotas pagadas, la de enero en parte, adelantados", () => {
    const c = calcularCalendarioCuotas(PLAN, INICIO, 859.75, "2026-09-29");
    expect(c.cuotas.map((q) => q.estado)).toEqual([
      "pagada", "pagada", "pagada", "pagada", "pagada", // ago → dic
      "parcial", // ene 2027
      "pendiente", "pendiente", "pendiente", "pendiente", "pendiente", "pendiente",
    ]);
    expect(c.situacion).toBe("adelantado");
    expect(c.ultimaPagada?.mes).toBe("2026-12");
    expect(c.proxima).toMatchObject({ numero: 6, mes: "2027-01", cubierto: 122.25 });
    expect(c.faltaProxima).toBe(25.25);
    expect(c.sugerencia).toEqual({ tipo: "proxima_cuota", montoUsd: 25.25 });
    // La marca de "hoy" cae en septiembre
    expect(c.cuotas.find((q) => q.esMesActual)?.mes).toBe("2026-09");
  });

  it("la cuota del mes se puede pagar durante el mes: no está atrasada hasta que termina", () => {
    const c = calcularCalendarioCuotas(PLAN, INICIO, 147.5, "2026-09-10");
    expect(c.situacion).toBe("al_dia");
    expect(c.cuotas[1]).toMatchObject({ mes: "2026-09", estado: "pendiente", esMesActual: true });
    expect(c.sugerencia).toEqual({ tipo: "proxima_cuota", montoUsd: 147.5 });
  });

  it("meses terminados sin cubrir → atrasados, y la sugerencia es ponerse al día", () => {
    const c = calcularCalendarioCuotas(PLAN, INICIO, 100, "2026-10-15");
    expect(c.situacion).toBe("atrasado");
    expect(c.atrasoUsd).toBe(195); // agosto + septiembre (295) − 100
    expect(c.cuotas.slice(0, 3).map((q) => q.estado)).toEqual(["atrasada", "atrasada", "pendiente"]);
    expect(c.sugerencia).toEqual({ tipo: "ponerse_al_dia", montoUsd: 195 });
  });

  it("pagos antes de que arranque el plan → adelantados", () => {
    const c = calcularCalendarioCuotas(PLAN, INICIO, 129.03, "2026-07-23");
    expect(c.situacion).toBe("adelantado");
    expect(c.cuotas.some((q) => q.esMesActual)).toBe(false);
  });

  it("todo devuelto → todas pagadas y sin sugerencia", () => {
    const c = calcularCalendarioCuotas(PLAN, INICIO, 1770, "2026-12-01");
    expect(c.situacion).toBe("devuelto");
    expect(c.cuotas.every((q) => q.estado === "pagada")).toBe(true);
    expect(c.sugerencia).toBeNull();
  });

  it("la última cuota absorbe el redondeo: las cuotas suman la deuda exacta", () => {
    const c = calcularCalendarioCuotas({ deudaUsd: 1000, tasaAnual: 0.1, cantidadCuotas: 3 }, INICIO, 0, "2026-08-01");
    expect(c.cuotas.map((q) => q.monto)).toEqual([333.33, 333.33, 333.34]);
  });

  it("escala a otros planes: 24 cuotas cruzan de año bien", () => {
    const c = calcularCalendarioCuotas({ deudaUsd: 2400, tasaAnual: 0.1, cantidadCuotas: 24 }, "2026-11-01", 0, "2026-11-01");
    expect(c.cuotas).toHaveLength(24);
    expect(c.cuotas[2].mes).toBe("2027-01");
    expect(c.cuotas[23].mes).toBe("2028-10");
  });
});
