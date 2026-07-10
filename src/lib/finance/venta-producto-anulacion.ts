export type StockMovimientoAnulableState = {
  tipo: string;
  cantidad: number | null;
  referenciaId: string | null;
  fecha: Date | null;
};

/**
 * Determina si un stock_movimiento es una venta suelta de producto (sin
 * atencion asociada) elegible para anulacion:
 * - tipo 'venta' con cantidad negativa (es una venta real, no una reversion).
 * - sin referenciaId: las ventas de atencion se anulan por la atencion, no por acá.
 *
 * No decide sobre "es de hoy" ni "caja cerrada" ni "ya tiene reversion" — esos
 * checks dependen de la fecha del server y de otras filas en DB, y se validan
 * aparte con `assertVentaProductoDelDia` y el guard anti-doble-anulacion en el
 * caller (necesita una query a stock_movimientos).
 */
export function isVentaProductoSueltaAnulable(
  movimiento: Pick<StockMovimientoAnulableState, "tipo" | "cantidad" | "referenciaId">
): boolean {
  return (
    movimiento.tipo === "venta" &&
    typeof movimiento.cantidad === "number" &&
    movimiento.cantidad < 0 &&
    movimiento.referenciaId === null
  );
}

/**
 * Lanza un error descriptivo si el movimiento no es una venta suelta anulable.
 * Usar antes de armar la reversion en la server action.
 */
export function assertVentaProductoSueltaAnulable(
  movimiento: Pick<StockMovimientoAnulableState, "tipo" | "cantidad" | "referenciaId">
): void {
  if (movimiento.tipo !== "venta") {
    throw new Error("Este movimiento no es una venta de producto.");
  }
  if (typeof movimiento.cantidad !== "number" || movimiento.cantidad >= 0) {
    throw new Error("Este movimiento ya es una reversion, no una venta original.");
  }
  if (movimiento.referenciaId !== null) {
    throw new Error(
      "Esta venta pertenece a una atención — anulala desde la atención, no desde acá."
    );
  }
}

/**
 * Compara la fecha (timestamp con TZ) de un movimiento contra el rango del
 * dia de hoy en horario argentino (-03:00), igual que hace `cerrarCaja`.
 */
export function isFechaDentroDelDiaArgentino(fecha: Date | null, fechaHoy: string): boolean {
  if (!fecha) return false;
  const inicioDia = new Date(`${fechaHoy}T00:00:00-03:00`);
  const finDia = new Date(`${fechaHoy}T23:59:59-03:00`);
  return fecha.getTime() >= inicioDia.getTime() && fecha.getTime() <= finDia.getTime();
}
