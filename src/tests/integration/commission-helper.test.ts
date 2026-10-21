import { describe, expect, it } from "vitest";
import { calculateAtencionCommission } from "@/lib/finance/commission";

describe("commission-helper: calculateAtencionCommission", () => {
  // Regla de Was (2026-10-21): la propina es entera del barbero y la comisión de MP la absorbe él.
  it("gives the barber his % of list price plus the whole tip, minus the payment fee", () => {
    const result = calculateAtencionCommission({
      precioCobrado: 15000,
      servicioPrecioBase: 13000,
      comisionBarberoPct: 60,
      comisionMedioPagoPct: 6,
    });

    expect(result.baseParaComisionBarbero).toBe(13000);
    expect(result.propinaBarbero).toBe(2000);
    expect(result.comisionMedioPagoMonto).toBe(900);
    // 60% de 13.000 + 2.000 de propina - 900 de MP
    expect(result.comisionBarberoMonto).toBe(8900);
    expect(result.montoNeto).toBe(14100);
    // El local se queda con su 40% del precio de lista, sin pagar la comisión de MP.
    expect(15000 - result.comisionBarberoMonto - result.comisionMedioPagoMonto).toBe(5200);
  });

  it("uses precio cobrado when below base", () => {
    const result = calculateAtencionCommission({
      precioCobrado: 10000,
      servicioPrecioBase: 13000,
      comisionBarberoPct: 60,
      comisionMedioPagoPct: 0,
    });

    expect(result.baseParaComisionBarbero).toBe(10000);
    expect(result.comisionBarberoMonto).toBe(6000);
  });

  it("falls back to precio cobrado when base is null", () => {
    const result = calculateAtencionCommission({
      precioCobrado: 13000,
      servicioPrecioBase: null,
      comisionBarberoPct: 60,
      comisionMedioPagoPct: 3,
    });

    expect(result.baseParaComisionBarbero).toBe(13000);
    expect(result.comisionMedioPagoMonto).toBe(390);
    expect(result.comisionBarberoMonto).toBe(7410);
  });

  it("normalizes invalid percentages to zero", () => {
    const result = calculateAtencionCommission({
      precioCobrado: 13000,
      servicioPrecioBase: 13000,
      comisionBarberoPct: Number.NaN,
      comisionMedioPagoPct: Number.POSITIVE_INFINITY,
    });

    expect(result.comisionBarberoPct).toBe(0);
    expect(result.comisionMedioPagoPct).toBe(0);
    expect(result.comisionBarberoMonto).toBe(0);
    expect(result.comisionMedioPagoMonto).toBe(0);
    expect(result.montoNeto).toBe(13000);
  });

  it("never goes below zero when the fee is bigger than the barber share", () => {
    const result = calculateAtencionCommission({
      precioCobrado: 1000,
      servicioPrecioBase: 1000,
      comisionBarberoPct: 1,
      comisionMedioPagoPct: 6,
    });

    expect(result.comisionBarberoMonto).toBe(0);
  });
});
