import { describe, it, expect } from "vitest";
import {
  calcularEstadoRepago,
  calcularTopeInteres,
  convertirMontoAUsd,
  diasEntre,
  mesesRestantesEstimados,
} from "@/lib/amortizacion";

// Plan real: u$d 1.770, 10% anual, 12 cuotas de referencia (capital fijo 147,50)
const PLAN = { deudaUsd: 1770, tasaAnual: 0.1, cantidadCuotas: 12 };

// Los dos pagos reales cargados en prod (ARS al blue del día)
const PAGOS_REALES = [
  { fecha: "2026-07-23", montoUsd: convertirMontoAUsd(200_000, "ARS", 1550) }, // 129,03
  { fecha: "2026-08-12", montoUsd: convertirMontoAUsd(200_000, "ARS", 1530) }, // 130,72
];

describe("repago: tope de interés", () => {
  it("es el interés total del cronograma alemán de referencia", () => {
    // 0,1/12 × 147,50 × (12+11+…+1) = 95,875
    expect(calcularTopeInteres(PLAN)).toBe(95.88);
  });

  it("aunque pase mucho tiempo sin pagar, el interés nunca supera el tope", () => {
    const e = calcularEstadoRepago(PLAN, [{ fecha: "2026-01-01", montoUsd: 10 }], "2030-01-01");
    expect(e.interesPagado + e.interesCorrido).toBeCloseTo(95.88, 2);
  });
});

describe("repago: interés por tiempo real sobre los pagos reales", () => {
  it("el primer pago no paga interés (el interés corre desde ese día)", () => {
    const e = calcularEstadoRepago(PLAN, PAGOS_REALES.slice(0, 1), "2026-07-23");
    expect(e.aplicaciones[0]).toMatchObject({ dias: 0, interes: 0, capital: 129.03, saldoDespues: 1640.97 });
  });

  it("el segundo pago cubre 20 días de interés y el resto baja capital", () => {
    const e = calcularEstadoRepago(PLAN, PAGOS_REALES, "2026-08-12");
    // 1640,97 × 0,10 × 20 / 365 = 8,99
    expect(e.aplicaciones[1]).toMatchObject({ dias: 20, interes: 8.99, capital: 121.73, saldoDespues: 1519.24 });
    expect(e.totalPagadoUsd).toBe(259.75);
  });

  it("al 29/09 corren 48 días más de interés sin pagar", () => {
    const e = calcularEstadoRepago(PLAN, PAGOS_REALES, "2026-09-29");
    expect(e.interesCorrido).toBe(19.98); // 1519,24 × 0,10 × 48 / 365
    expect(e.totalParaCancelar).toBe(1539.22);
  });

  it("pago de u$d 600 el 29/09 → cubre el interés corrido y baja 580,02 de capital", () => {
    const e = calcularEstadoRepago(
      PLAN,
      [...PAGOS_REALES, { fecha: "2026-09-29", montoUsd: 600 }],
      "2026-09-29"
    );
    expect(e.aplicaciones[2]).toMatchObject({ dias: 48, interes: 19.98, capital: 580.02, excedente: 0 });
    expect(e.saldoCapital).toBe(939.22);
    expect(e.interesPagado).toBe(28.97);
    expect(e.capitalPagado).toBe(830.78);
    expect(e.cuotasCubiertas).toBe(5); // 830,78 / 147,50 = 5,6
    // Invariante: lo devuelto + lo que falta = deuda original
    expect(e.capitalPagado + e.saldoCapital).toBeCloseTo(1770, 2);
  });
});

describe("repago: casos borde", () => {
  it("pago menor al interés corrido → todo va a interés y el resto queda pendiente", () => {
    const e = calcularEstadoRepago(
      PLAN,
      [{ fecha: "2026-01-01", montoUsd: 100 }, { fecha: "2026-03-02", montoUsd: 5 }],
      "2026-03-02"
    );
    // 1670 × 0,10 × 60 / 365 = 27,45 → paga 5, quedan 22,45 pendientes
    expect(e.aplicaciones[1]).toMatchObject({ interes: 5, capital: 0 });
    expect(e.interesCorrido).toBe(22.45);
  });

  it("cancelar antes de tiempo → paga menos interés que el plan", () => {
    const antes = calcularEstadoRepago(PLAN, PAGOS_REALES, "2026-09-29");
    const e = calcularEstadoRepago(
      PLAN,
      [...PAGOS_REALES, { fecha: "2026-09-29", montoUsd: antes.totalParaCancelar }],
      "2026-09-29"
    );
    expect(e.pagadoCompleto).toBe(true);
    expect(e.saldoCapital).toBe(0);
    expect(e.interesCorrido).toBe(0);
    expect(e.aplicaciones[2].excedente).toBe(0);
    expect(e.interesPagado).toBeLessThan(e.topeInteres);
    expect(e.cuotasCubiertas).toBe(12);
  });

  it("pago mayor a lo que falta → el sobrante queda como excedente (el servicio lo rechaza)", () => {
    const e = calcularEstadoRepago(PLAN, [{ fecha: "2026-01-01", montoUsd: 2000 }], "2026-01-01");
    expect(e.saldoCapital).toBe(0);
    expect(e.aplicaciones[0].excedente).toBe(230);
  });

  it("el orden de carga no importa: se aplica por fecha", () => {
    const a = calcularEstadoRepago(PLAN, PAGOS_REALES, "2026-09-29");
    const b = calcularEstadoRepago(PLAN, [...PAGOS_REALES].reverse(), "2026-09-29");
    expect(b.totalParaCancelar).toBe(a.totalParaCancelar);
  });

  it("sin pagos → no corre interés y se debe la deuda original", () => {
    const e = calcularEstadoRepago(PLAN, [], "2026-09-29");
    expect(e).toMatchObject({ saldoCapital: 1770, interesCorrido: 0, pagadoCompleto: false });
  });

  it("cuota sugerida = capital fijo + interés corrido, sin pasarse de lo que falta", () => {
    const e = calcularEstadoRepago(PLAN, PAGOS_REALES, "2026-09-29");
    expect(e.cuotaSugerida).toBe(167.48); // 147,50 + 19,98
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

  it("meses restantes estimados a u$d 147,50 de capital por mes", () => {
    expect(mesesRestantesEstimados(939.22, 147.5)).toBe(7);
    expect(mesesRestantesEstimados(295, 147.5)).toBe(2);
    expect(mesesRestantesEstimados(0, 147.5)).toBe(0);
  });
});
