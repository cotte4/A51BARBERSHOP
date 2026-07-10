export type MovimientoVentaParaNeteo = {
  productoId: string | null;
  cantidad: number | null;
  precioUnitario: string | number | null;
  costoUnitarioSnapshot: string | number | null;
  medioPagoId: string | null;
  fecha: Date | null;
};

export type NetoPorProducto = {
  productoId: string;
  neto: number;
  precioUnitario: number;
  costoUnitarioSnapshot: number | null;
  medioPagoId: string | null;
};

/**
 * Calcula el neto acumulado (suma de cantidad) por producto a partir de los
 * movimientos de stock previos de una atención. Usado para compensar el
 * ledger append-only: en vez de borrar filas de stock_movimientos, se
 * inserta una única fila compensatoria por producto con cantidad = -neto.
 *
 * El precio/costo/medio de pago de la compensación se toma de la última
 * fila de VENTA real (cantidad negativa) de ese producto — las reversiones
 * previas (cantidad positiva) no deben pisar ese snapshot.
 *
 * Productos cuyo neto ya es 0 (por ejemplo, reversiones previas que ya
 * cancelaron la venta) quedan afuera del resultado — no hace falta
 * compensar lo que ya neteó a cero.
 */
export function calcularNetoPorProducto(
  movimientos: MovimientoVentaParaNeteo[]
): NetoPorProducto[] {
  type Acumulado = {
    neto: number;
    precioUnitario: number;
    costoUnitarioSnapshot: number | null;
    medioPagoId: string | null;
    ultimaVentaFechaMs: number;
  };

  const acumuladoPorProducto = new Map<string, Acumulado>();

  for (const movimiento of movimientos) {
    if (!movimiento.productoId || movimiento.cantidad === null || movimiento.cantidad === undefined) {
      continue;
    }

    const existente = acumuladoPorProducto.get(movimiento.productoId) ?? {
      neto: 0,
      precioUnitario: 0,
      costoUnitarioSnapshot: null,
      medioPagoId: null,
      ultimaVentaFechaMs: -Infinity,
    };

    existente.neto += movimiento.cantidad;

    if (movimiento.cantidad < 0) {
      const fechaMs = movimiento.fecha ? movimiento.fecha.getTime() : 0;
      if (fechaMs >= existente.ultimaVentaFechaMs) {
        existente.precioUnitario = Number(movimiento.precioUnitario ?? 0);
        existente.costoUnitarioSnapshot =
          movimiento.costoUnitarioSnapshot === null || movimiento.costoUnitarioSnapshot === undefined
            ? null
            : Number(movimiento.costoUnitarioSnapshot);
        existente.medioPagoId = movimiento.medioPagoId;
        existente.ultimaVentaFechaMs = fechaMs;
      }
    }

    acumuladoPorProducto.set(movimiento.productoId, existente);
  }

  return Array.from(acumuladoPorProducto.entries())
    .filter(([, acumulado]) => acumulado.neto !== 0)
    .map(([productoId, acumulado]) => ({
      productoId,
      neto: acumulado.neto,
      precioUnitario: acumulado.precioUnitario,
      costoUnitarioSnapshot: acumulado.costoUnitarioSnapshot,
      medioPagoId: acumulado.medioPagoId,
    }));
}
