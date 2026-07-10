import { describe, expect, it } from "vitest";
import { calcularNetoPorProducto } from "@/lib/finance/stock-ledger-neteo";

describe("stock-ledger-neteo: calcularNetoPorProducto", () => {
  it("computes the simple net for a single product with one sale", () => {
    const resultado = calcularNetoPorProducto([
      {
        productoId: "prod-1",
        cantidad: -3,
        precioUnitario: "500.00",
        costoUnitarioSnapshot: "200.00",
        medioPagoId: "mp-1",
        fecha: new Date("2026-07-01T10:00:00Z"),
      },
    ]);

    expect(resultado).toEqual([
      {
        productoId: "prod-1",
        neto: -3,
        precioUnitario: 500,
        costoUnitarioSnapshot: 200,
        medioPagoId: "mp-1",
      },
    ]);
  });

  it("excludes products whose net already cancels out to zero", () => {
    const resultado = calcularNetoPorProducto([
      {
        productoId: "prod-1",
        cantidad: -3,
        precioUnitario: "500.00",
        costoUnitarioSnapshot: "200.00",
        medioPagoId: "mp-1",
        fecha: new Date("2026-07-01T10:00:00Z"),
      },
      {
        productoId: "prod-1",
        cantidad: 3,
        precioUnitario: "500.00",
        costoUnitarioSnapshot: "200.00",
        medioPagoId: "mp-1",
        fecha: new Date("2026-07-01T10:05:00Z"),
      },
    ]);

    expect(resultado).toEqual([]);
  });

  it("nets independently across multiple products", () => {
    const resultado = calcularNetoPorProducto([
      {
        productoId: "prod-1",
        cantidad: -5,
        precioUnitario: "100.00",
        costoUnitarioSnapshot: "40.00",
        medioPagoId: "mp-1",
        fecha: new Date("2026-07-01T09:00:00Z"),
      },
      {
        productoId: "prod-2",
        cantidad: -2,
        precioUnitario: "300.00",
        costoUnitarioSnapshot: "150.00",
        medioPagoId: "mp-2",
        fecha: new Date("2026-07-01T09:01:00Z"),
      },
      {
        productoId: "prod-1",
        cantidad: 2,
        precioUnitario: "100.00",
        costoUnitarioSnapshot: "40.00",
        medioPagoId: "mp-1",
        fecha: new Date("2026-07-01T09:02:00Z"),
      },
    ]);

    expect(resultado).toHaveLength(2);
    expect(resultado.find((r) => r.productoId === "prod-1")).toMatchObject({
      neto: -3,
      precioUnitario: 100,
    });
    expect(resultado.find((r) => r.productoId === "prod-2")).toMatchObject({
      neto: -2,
      precioUnitario: 300,
    });
  });

  it("uses the price from the latest real sale row when prices were mixed for the same product", () => {
    const resultado = calcularNetoPorProducto([
      {
        productoId: "prod-1",
        cantidad: -1,
        precioUnitario: "100.00",
        costoUnitarioSnapshot: "40.00",
        medioPagoId: "mp-1",
        fecha: new Date("2026-07-01T09:00:00Z"),
      },
      {
        productoId: "prod-1",
        cantidad: 1,
        precioUnitario: "100.00",
        costoUnitarioSnapshot: "40.00",
        medioPagoId: "mp-1",
        fecha: new Date("2026-07-01T09:05:00Z"),
      },
      {
        productoId: "prod-1",
        cantidad: -2,
        precioUnitario: "150.00",
        costoUnitarioSnapshot: "60.00",
        medioPagoId: "mp-2",
        fecha: new Date("2026-07-01T09:10:00Z"),
      },
    ]);

    expect(resultado).toEqual([
      {
        productoId: "prod-1",
        neto: -2,
        precioUnitario: 150,
        costoUnitarioSnapshot: 60,
        medioPagoId: "mp-2",
      },
    ]);
  });

  it("ignores rows without a productoId or with a null/undefined cantidad", () => {
    const resultado = calcularNetoPorProducto([
      {
        productoId: null,
        cantidad: -3,
        precioUnitario: "500.00",
        costoUnitarioSnapshot: null,
        medioPagoId: null,
        fecha: null,
      },
      {
        productoId: "prod-1",
        cantidad: null,
        precioUnitario: "500.00",
        costoUnitarioSnapshot: null,
        medioPagoId: null,
        fecha: null,
      },
    ]);

    expect(resultado).toEqual([]);
  });
});
