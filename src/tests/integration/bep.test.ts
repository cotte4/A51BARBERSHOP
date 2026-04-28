import { describe, it, expect } from "vitest";
import { calcularBep } from "@/lib/bep";

describe("bep: calcularBep — Punto de Equilibrio", () => {
  it("BEP básico sin fee de medio de pago → cortesBep correcto", () => {
    // gastos del mes: 500.000 ARS / 25 días = 20.000/día
    // precio promedio: 13.000
    // mix gabote: 50% (la otra mitad es Pinky, no aporta a la casa)
    // fee promedio: 0%
    // contribucion_por_corte_gabote = 13000 * (0.40 - 0) = 5200
    // contribucion_casa_por_corte = 0.5 * 5200 = 2600
    // cortesBep = ceil(20000 / 2600) = ceil(7.69) = 8
    const result = calcularBep({
      gastosMesReal: 500_000,
      presupuestoMensual: 0,
      precioPromedioDia: 13_000,
      mixGabote: 0.5,
      feePromedioMedioPago: 0,
      diasMes: 25,
      cortesDiaMes: 10,
    });

    expect(result.cortesBep).toBe(8);
    expect(result.superado).toBe(true);
    expect(result.faltanCortes).toBe(0);
    expect(result.usandoPresupuesto).toBe(false);
    expect(result.sinReferencia).toBe(false);
  });

  it("BEP con fee de MP del 6% → fee reduce contribución de la casa", () => {
    // contribucion_por_corte_gabote = 13000 * (0.40 - 0.06) = 13000 * 0.34 = 4420
    // contribucion_casa_por_corte = 0.5 * 4420 = 2210
    // cortesBep = ceil(20000 / 2210) = ceil(9.05) = 10
    const result = calcularBep({
      gastosMesReal: 500_000,
      presupuestoMensual: 0,
      precioPromedioDia: 13_000,
      mixGabote: 0.5,
      feePromedioMedioPago: 0.06,
      diasMes: 25,
      cortesDiaMes: 5,
    });

    expect(result.cortesBep).toBe(10);
    expect(result.superado).toBe(false);
    // faltan = 10 - 5 = 5
    expect(result.faltanCortes).toBe(5);
  });

  it("BEP usa presupuesto cuando gastos reales = 0", () => {
    const result = calcularBep({
      gastosMesReal: 0,
      presupuestoMensual: 1_000_000,
      precioPromedioDia: 13_000,
      mixGabote: 0.5,
      feePromedioMedioPago: 0,
      diasMes: 25,
      cortesDiaMes: 5,
    });

    expect(result.usandoPresupuesto).toBe(true);
    expect(result.sinReferencia).toBe(false);
    // gastosReferenciaDia = 1000000 / 25 = 40000
    // contribucion = 0.5 * 13000 * 0.40 = 2600
    // cortesBep = ceil(40000 / 2600) = ceil(15.38) = 16
    expect(result.cortesBep).toBe(16);
  });

  it("Sin referencia (gastos = 0 y presupuesto = 0) → sinReferencia: true, sin error", () => {
    const result = calcularBep({
      gastosMesReal: 0,
      presupuestoMensual: 0,
      precioPromedioDia: 13_000,
      mixGabote: 0.5,
      feePromedioMedioPago: 0,
      diasMes: 25,
      cortesDiaMes: 5,
    });

    expect(result.sinReferencia).toBe(true);
    expect(result.cortesBep).toBe(0);
  });

  it("Mix Gabote = 0 (solo Pinky trabaja) → contribucion cero, resultado graceful", () => {
    // Si todo es Pinky, la casa no retiene nada de servicios → BEP infinito
    // La función devuelve cortesBep = 0 y sinReferencia = false cuando contribucion <= 0
    const result = calcularBep({
      gastosMesReal: 500_000,
      presupuestoMensual: 0,
      precioPromedioDia: 13_000,
      mixGabote: 0,
      feePromedioMedioPago: 0,
      diasMes: 25,
      cortesDiaMes: 10,
    });

    expect(result.cortesBep).toBe(0);
    expect(result.sinReferencia).toBe(false);
  });

  it("superado = false cuando cortesDiaMes < cortesBep, faltanCortes correcto", () => {
    // gastos: 500.000 / 25 = 20.000/día
    // contribucion = 0.5 * 13000 * 0.40 = 2600
    // cortesBep = ceil(20000 / 2600) = 8
    const result = calcularBep({
      gastosMesReal: 500_000,
      presupuestoMensual: 0,
      precioPromedioDia: 13_000,
      mixGabote: 0.5,
      feePromedioMedioPago: 0,
      diasMes: 25,
      cortesDiaMes: 3,
    });

    expect(result.superado).toBe(false);
    expect(result.faltanCortes).toBe(8 - 3);
  });
});
