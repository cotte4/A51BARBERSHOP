import { describe, expect, it } from "vitest";
import { calculateAtencionCommission } from "@/lib/finance/commission";

describe("commission-helper: calculateAtencionCommission", () => {
  it("uses servicio precio base as cap for barber commission", () => {
    const result = calculateAtencionCommission({
      precioCobrado: 15000,
      servicioPrecioBase: 13000,
      comisionBarberoPct: 60,
      comisionMedioPagoPct: 6,
    });

    expect(result.baseParaComisionBarbero).toBe(13000);
    expect(result.comisionBarberoMonto).toBe(7800);
    expect(result.comisionMedioPagoMonto).toBe(900);
    expect(result.montoNeto).toBe(14100);
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
    expect(result.comisionBarberoMonto).toBe(7800);
    expect(result.comisionMedioPagoMonto).toBe(390);
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
});
