import { describe, expect, it } from "vitest";
import {
  assertVentaProductoSueltaAnulable,
  isFechaDentroDelDiaArgentino,
  isVentaProductoSueltaAnulable,
} from "@/lib/finance/venta-producto-anulacion";

describe("venta-producto-anulacion: guard de elegibilidad", () => {
  it("permite anular una venta suelta real (tipo venta, cantidad negativa, sin referencia)", () => {
    const movimiento = { tipo: "venta", cantidad: -2, referenciaId: null };
    expect(isVentaProductoSueltaAnulable(movimiento)).toBe(true);
    expect(() => assertVentaProductoSueltaAnulable(movimiento)).not.toThrow();
  });

  it("rechaza movimientos que no son de tipo venta", () => {
    const movimiento = { tipo: "entrada", cantidad: -2, referenciaId: null };
    expect(isVentaProductoSueltaAnulable(movimiento)).toBe(false);
    expect(() => assertVentaProductoSueltaAnulable(movimiento)).toThrow(
      "Este movimiento no es una venta de producto."
    );
  });

  it("rechaza reversiones (cantidad positiva) como si fueran ventas originales", () => {
    const movimiento = { tipo: "venta", cantidad: 2, referenciaId: null };
    expect(isVentaProductoSueltaAnulable(movimiento)).toBe(false);
    expect(() => assertVentaProductoSueltaAnulable(movimiento)).toThrow(
      "Este movimiento ya es una reversion, no una venta original."
    );
  });

  it("rechaza ventas de producto vinculadas a una atencion", () => {
    const movimiento = { tipo: "venta", cantidad: -2, referenciaId: "atencion-1" };
    expect(isVentaProductoSueltaAnulable(movimiento)).toBe(false);
    expect(() => assertVentaProductoSueltaAnulable(movimiento)).toThrow(
      "Esta venta pertenece a una atención — anulala desde la atención, no desde acá."
    );
  });

  it("reconoce una fecha dentro del dia argentino y rechaza fuera de rango", () => {
    const fechaHoy = "2026-07-09";
    const dentro = new Date(`${fechaHoy}T15:30:00-03:00`);
    const ayer = new Date("2026-07-08T23:00:00-03:00");

    expect(isFechaDentroDelDiaArgentino(dentro, fechaHoy)).toBe(true);
    expect(isFechaDentroDelDiaArgentino(ayer, fechaHoy)).toBe(false);
    expect(isFechaDentroDelDiaArgentino(null, fechaHoy)).toBe(false);
  });
});
