import { describe, expect, it } from "vitest";
import { armarCajaDelDia, type AtencionDelDia, type VentaDelDia } from "@/lib/caja-dia";

function atencion(id: string, precio: number, extra: Partial<AtencionDelDia> = {}): AtencionDelDia {
  return {
    id,
    hora: "10:00:00",
    creadoEn: new Date("2026-09-30T13:00:00Z"),
    anulado: false,
    precioCobrado: precio,
    servicioNombre: "Corte",
    barberoId: "pinky",
    barberoNombre: "Pinky",
    medioPago: "Efectivo",
    motivoAnulacion: null,
    notas: null,
    ...extra,
  };
}

function venta(id: string, cantidad: number, precio: number, extra: Partial<VentaDelDia> = {}): VentaDelDia {
  return {
    id,
    productoNombre: "Cera",
    cantidad,
    precioUnitario: precio,
    fecha: new Date("2026-09-30T15:00:00Z"),
    medioPago: "Efectivo",
    referenciaId: null,
    referenciaType: null,
    ...extra,
  };
}

describe("armarCajaDelDia", () => {
  it("día vacío", () => {
    const caja = armarCajaDelDia([], []);
    expect(caja.filas).toEqual([]);
    expect(caja.total).toBe(0);
  });

  it("el total es la suma de las filas: 3 servicios y 1 producto", () => {
    const caja = armarCajaDelDia(
      [
        atencion("a1", 14000),
        atencion("a2", 16000, { servicioNombre: "Corte y Barba" }),
        atencion("a3", 14000),
      ],
      [venta("v1", -1, 8000)]
    );
    expect(caja.total).toBe(52000);
    expect(caja.filas.reduce((sum, fila) => sum + fila.monto, 0)).toBe(52000);
    expect(caja.cantidadServicios).toBe(3);
    expect(caja.cantidadProductos).toBe(1);
  });

  it("una atención anulada se lista pero no suma", () => {
    const caja = armarCajaDelDia(
      [atencion("a1", 14000), atencion("a2", 45000, { anulado: true, motivoAnulacion: "Error" })],
      []
    );
    expect(caja.filas).toHaveLength(2);
    expect(caja.total).toBe(14000);
    expect(caja.cantidadServicios).toBe(1);
  });

  it("el producto vendido dentro de una atención suma en esa fila, no aparte", () => {
    const caja = armarCajaDelDia(
      [atencion("a1", 14000)],
      [venta("v1", -2, 8000, { referenciaId: "a1" })]
    );
    expect(caja.filas).toHaveLength(1);
    expect(caja.filas[0].titulo).toBe("Corte + 2 Cera");
    expect(caja.filas[0].monto).toBe(30000);
    expect(caja.total).toBe(30000);
  });

  it("producto sacado al editar la atención: la reversión lo deja en cero", () => {
    const caja = armarCajaDelDia(
      [atencion("a1", 14000)],
      [venta("v1", -1, 8000, { referenciaId: "a1" }), venta("v2", 1, 8000, { referenciaId: "a1" })]
    );
    expect(caja.filas[0].titulo).toBe("Corte");
    expect(caja.total).toBe(14000);
    expect(caja.cantidadProductos).toBe(0);
  });

  it("atención anulada con producto: nada suma", () => {
    const caja = armarCajaDelDia(
      [atencion("a1", 14000, { anulado: true })],
      [venta("v1", -1, 8000, { referenciaId: "a1" }), venta("v2", 1, 8000, { referenciaId: "a1" })]
    );
    expect(caja.total).toBe(0);
    expect(caja.filas).toHaveLength(1);
  });

  it("venta suelta anulada: se ve tachada, no suma y la reversión no es una fila", () => {
    const caja = armarCajaDelDia(
      [],
      [
        venta("v1", -1, 8000),
        venta("v2", 1, 8000, { referenciaId: "v1", referenciaType: "stock_movimiento" }),
        venta("v3", -1, 5000),
      ]
    );
    expect(caja.filas).toHaveLength(2);
    expect(caja.filas.find((fila) => fila.id === "v1")?.anulada).toBe(true);
    expect(caja.total).toBe(5000);
    expect(caja.cantidadProductos).toBe(1);
  });

  it("reversión de una atención de otro día no aparece como venta de hoy", () => {
    const caja = armarCajaDelDia([], [venta("v1", 1, 8000, { referenciaId: "atencion-de-ayer" })]);
    expect(caja.filas).toEqual([]);
    expect(caja.total).toBe(0);
  });

  it("lo más reciente va primero", () => {
    const caja = armarCajaDelDia(
      [
        atencion("a1", 14000, { creadoEn: new Date("2026-09-30T13:00:00Z") }),
        atencion("a2", 16000, { creadoEn: new Date("2026-09-30T18:00:00Z") }),
      ],
      [venta("v1", -1, 8000, { fecha: new Date("2026-09-30T15:00:00Z") })]
    );
    expect(caja.filas.map((fila) => fila.id)).toEqual(["a2", "v1", "a1"]);
  });

  it("resumen por barbero, sin anuladas, y suma lo mismo que los servicios", () => {
    const caja = armarCajaDelDia(
      [
        atencion("a1", 14000),
        atencion("a2", 16000),
        atencion("a3", 14000, { barberoId: "gabote", barberoNombre: "Gabote" }),
        atencion("a4", 45000, { barberoId: "gabote", barberoNombre: "Gabote", anulado: true }),
      ],
      []
    );
    expect(caja.porBarbero).toEqual([
      { barberoId: "pinky", nombre: "Pinky", servicios: 2, monto: 30000 },
      { barberoId: "gabote", nombre: "Gabote", servicios: 1, monto: 14000 },
    ]);
  });

  it("no pierde centavos", () => {
    const caja = armarCajaDelDia(
      [atencion("a1", 0.1), atencion("a2", 0.2)],
      [venta("v1", -3, 0.1)]
    );
    expect(caja.total).toBe(0.6);
  });
});
