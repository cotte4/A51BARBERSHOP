import { describe, it, expect } from "vitest";
import {
  aplicarPagoFlexible,
  calcularSaldoReal,
  generarCronograma,
} from "@/lib/amortizacion";

// Plan real: 1500 USD, 10% anual, 12 cuotas alemanas
const DEUDA = 1500;
const TASA = 0.1;
const CUOTAS = 12;
const CAPITAL_FIJO = DEUDA / CUOTAS; // 125
const INTERES_CUOTA_1 = DEUDA * (TASA / 12); // 12.50

const cronograma = generarCronograma(DEUDA, TASA, CUOTAS);

describe("repago: aplicarPagoFlexible", () => {
  it("cuota completa exacta → completa la cuota y baja el capital fijo", () => {
    const r = aplicarPagoFlexible({
      saldoPendiente: DEUDA,
      capitalYaPagado: 0,
      interesYaPagado: 0,
      capitalCuota: CAPITAL_FIJO,
      tasaAnual: TASA,
      montoPagadoUsd: CAPITAL_FIJO + INTERES_CUOTA_1, // 137.50
    });
    expect(r.interesPagado).toBeCloseTo(INTERES_CUOTA_1, 2);
    expect(r.capitalPagado).toBeCloseTo(CAPITAL_FIJO, 2);
    expect(r.nuevoSaldo).toBeCloseTo(1375, 2);
    expect(r.cuotaCompletada).toBe(true);
    expect(r.pagadoCompleto).toBe(false);
  });

  it("pago chico (menor al interés) → todo va a interés, la cuota no avanza", () => {
    const r = aplicarPagoFlexible({
      saldoPendiente: DEUDA,
      capitalYaPagado: 0,
      interesYaPagado: 0,
      capitalCuota: CAPITAL_FIJO,
      tasaAnual: TASA,
      montoPagadoUsd: 10,
    });
    expect(r.interesPagado).toBeCloseTo(10, 2);
    expect(r.capitalPagado).toBe(0);
    expect(r.nuevoSaldo).toBe(DEUDA);
    expect(r.cuotaCompletada).toBe(false);
  });

  it("pago parcial cruzado → cubre interés pendiente y el resto amortiza capital", () => {
    const r = aplicarPagoFlexible({
      saldoPendiente: DEUDA,
      capitalYaPagado: 0,
      interesYaPagado: 0,
      capitalCuota: CAPITAL_FIJO,
      tasaAnual: TASA,
      montoPagadoUsd: 50,
    });
    expect(r.interesPagado).toBeCloseTo(12.5, 2);
    expect(r.capitalPagado).toBeCloseTo(37.5, 2);
    expect(r.nuevoSaldo).toBeCloseTo(1462.5, 2);
    expect(r.cuotaCompletada).toBe(false);
  });

  it("dos parciales que suman la cuota → el segundo NO vuelve a cobrar interés y completa la cuota", () => {
    const primero = aplicarPagoFlexible({
      saldoPendiente: DEUDA,
      capitalYaPagado: 0,
      interesYaPagado: 0,
      capitalCuota: CAPITAL_FIJO,
      tasaAnual: TASA,
      montoPagadoUsd: 70,
    });
    const segundo = aplicarPagoFlexible({
      saldoPendiente: primero.nuevoSaldo,
      capitalYaPagado: primero.capitalPagado,
      interesYaPagado: primero.interesPagado,
      capitalCuota: CAPITAL_FIJO,
      tasaAnual: TASA,
      montoPagadoUsd: 67.5, // total pagado = 137.50 = cuota completa
    });
    // El interés de la cuota se cobró una sola vez (12.50 total)
    expect(primero.interesPagado + segundo.interesPagado).toBeCloseTo(INTERES_CUOTA_1, 2);
    expect(segundo.interesPagado).toBe(0);
    // El capital total cubre el capital fijo → cuota completada
    expect(primero.capitalPagado + segundo.capitalPagado).toBeCloseTo(CAPITAL_FIJO, 2);
    expect(segundo.cuotaCompletada).toBe(true);
    expect(segundo.nuevoSaldo).toBeCloseTo(1375, 2);
  });

  it("sobrepago → el excedente amortiza capital extra sin romper el saldo", () => {
    const r = aplicarPagoFlexible({
      saldoPendiente: DEUDA,
      capitalYaPagado: 0,
      interesYaPagado: 0,
      capitalCuota: CAPITAL_FIJO,
      tasaAnual: TASA,
      montoPagadoUsd: 300,
    });
    expect(r.interesPagado).toBeCloseTo(12.5, 2);
    expect(r.capitalPagado).toBeCloseTo(287.5, 2);
    expect(r.nuevoSaldo).toBeCloseTo(1212.5, 2);
    expect(r.cuotaCompletada).toBe(true);
  });

  it("pago que salda toda la deuda → pagadoCompleto y saldo 0", () => {
    const r = aplicarPagoFlexible({
      saldoPendiente: 100,
      capitalYaPagado: 25,
      interesYaPagado: 1,
      capitalCuota: CAPITAL_FIJO,
      tasaAnual: TASA,
      montoPagadoUsd: 10_000,
    });
    expect(r.nuevoSaldo).toBe(0);
    expect(r.pagadoCompleto).toBe(true);
    expect(r.cuotaCompletada).toBe(true);
    // El capital pagado nunca supera el saldo real
    expect(r.capitalPagado).toBe(100);
  });

  it("última cuota con saldo menor al capital fijo (por sobrepagos previos) → se completa igual", () => {
    const r = aplicarPagoFlexible({
      saldoPendiente: 80, // menos que el capital fijo de 125
      capitalYaPagado: 0,
      interesYaPagado: 0,
      capitalCuota: CAPITAL_FIJO,
      tasaAnual: TASA,
      montoPagadoUsd: 80 + 80 * (TASA / 12),
    });
    expect(r.nuevoSaldo).toBe(0);
    expect(r.pagadoCompleto).toBe(true);
    expect(r.cuotaCompletada).toBe(true);
  });

  it("secuencia de 12 cuotas completas reproduce el cronograma alemán", () => {
    let saldo = DEUDA;
    for (const cuota of cronograma) {
      const r = aplicarPagoFlexible({
        saldoPendiente: saldo,
        capitalYaPagado: 0,
        interesYaPagado: 0,
        capitalCuota: cuota.capital,
        tasaAnual: TASA,
        montoPagadoUsd: cuota.cuotaTotal,
      });
      expect(r.interesPagado).toBeCloseTo(cuota.interes, 2);
      expect(r.capitalPagado).toBeCloseTo(cuota.capital, 2);
      expect(r.cuotaCompletada).toBe(true);
      saldo = r.nuevoSaldo;
    }
    expect(saldo).toBeCloseTo(0, 2);
  });
});

describe("repago: calcularSaldoReal (guardia ARS/USD)", () => {
  it("cache coherente en USD → se usa el cache", () => {
    expect(calcularSaldoReal(1375, DEUDA, 1375)).toBe(1375);
  });

  it("cache corrupto (valor legacy en ARS) → cae al saldo teórico", () => {
    expect(calcularSaldoReal(2_384_571, DEUDA, 1375)).toBe(1375);
  });

  it("cache nulo → saldo teórico", () => {
    expect(calcularSaldoReal(null, DEUDA, DEUDA)).toBe(DEUDA);
  });
});
