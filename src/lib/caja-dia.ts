// Lo que entró en el día, como una sola lista que suma exactamente el total.
// Pura: no toca la base. La usa /caja para que el número grande y la lista
// no puedan desencontrarse.

export type AtencionDelDia = {
  id: string;
  hora: string | null;
  creadoEn: Date | null;
  anulado: boolean;
  precioCobrado: number;
  servicioNombre: string;
  barberoId: string | null;
  barberoNombre: string;
  medioPago: string;
  motivoAnulacion: string | null;
  notas: string | null;
};

// Movimiento de stock de tipo "venta". El libro es append-only:
// vender = cantidad negativa, revertir = cantidad positiva.
export type VentaDelDia = {
  id: string;
  productoNombre: string;
  cantidad: number;
  precioUnitario: number;
  fecha: Date | null;
  medioPago: string;
  referenciaId: string | null;
  referenciaType: string | null;
};

export type FilaCaja = {
  key: string;
  tipo: "servicio" | "producto";
  // id de la atención, o del movimiento de stock si es una venta suelta
  id: string;
  momento: Date | null;
  hora: string | null;
  titulo: string;
  barberoNombre: string | null;
  medioPago: string;
  monto: number;
  anulada: boolean;
  // venta de mostrador, sin atención asociada: es la única que se anula desde la lista
  ventaSuelta: boolean;
  motivoAnulacion: string | null;
  notas: string | null;
};

export type ResumenBarbero = {
  barberoId: string;
  nombre: string;
  servicios: number;
  monto: number;
};

export type CajaDelDia = {
  filas: FilaCaja[];
  total: number;
  cantidadServicios: number;
  cantidadProductos: number;
  porBarbero: ResumenBarbero[];
};

function aCentavos(monto: number): number {
  return Math.round(monto * 100);
}

function importeVenta(venta: VentaDelDia): number {
  return aCentavos(-venta.cantidad * venta.precioUnitario);
}

function listarProductos(ventas: VentaDelDia[]): string[] {
  const unidades = new Map<string, number>();
  for (const venta of ventas) {
    unidades.set(venta.productoNombre, (unidades.get(venta.productoNombre) ?? 0) - venta.cantidad);
  }
  return [...unidades.entries()]
    .filter(([, cantidad]) => cantidad > 0)
    .map(([nombre, cantidad]) => (cantidad > 1 ? `${cantidad} ${nombre}` : nombre));
}

export function armarCajaDelDia(
  atenciones: AtencionDelDia[],
  ventas: VentaDelDia[]
): CajaDelDia {
  const atencionIds = new Set(atenciones.map((atencion) => atencion.id));

  const anuladasSueltas = new Set<string>();
  const ventasPorAtencion = new Map<string, VentaDelDia[]>();
  const ventasSueltas: VentaDelDia[] = [];

  for (const venta of ventas) {
    if (venta.referenciaType === "stock_movimiento") {
      if (venta.referenciaId) anuladasSueltas.add(venta.referenciaId);
      continue;
    }
    if (venta.referenciaId && atencionIds.has(venta.referenciaId)) {
      const lista = ventasPorAtencion.get(venta.referenciaId) ?? [];
      lista.push(venta);
      ventasPorAtencion.set(venta.referenciaId, lista);
      continue;
    }
    // Reversiones de atenciones de otro día no son una venta de hoy
    if (venta.cantidad < 0) ventasSueltas.push(venta);
  }

  const filas: FilaCaja[] = [];
  let cantidadProductos = 0;

  for (const atencion of atenciones) {
    const ventasAtencion = ventasPorAtencion.get(atencion.id) ?? [];
    const productos = atencion.anulado ? [] : listarProductos(ventasAtencion);
    const centavosProductos = atencion.anulado
      ? 0
      : Math.max(0, ventasAtencion.reduce((sum, venta) => sum + importeVenta(venta), 0));
    if (productos.length > 0) cantidadProductos += productos.length;

    filas.push({
      key: `servicio-${atencion.id}`,
      tipo: "servicio",
      id: atencion.id,
      momento: atencion.creadoEn,
      hora: atencion.hora,
      titulo: [atencion.servicioNombre, ...productos].join(" + "),
      barberoNombre: atencion.barberoNombre,
      medioPago: atencion.medioPago,
      monto: (aCentavos(atencion.precioCobrado) + centavosProductos) / 100,
      anulada: atencion.anulado,
      ventaSuelta: false,
      motivoAnulacion: atencion.motivoAnulacion,
      notas: atencion.notas,
    });
  }

  for (const venta of ventasSueltas) {
    const unidades = -venta.cantidad;
    const anulada = anuladasSueltas.has(venta.id);
    if (!anulada) cantidadProductos += 1;

    filas.push({
      key: `producto-${venta.id}`,
      tipo: "producto",
      id: venta.id,
      momento: venta.fecha,
      hora: null,
      titulo: unidades > 1 ? `${unidades} ${venta.productoNombre}` : venta.productoNombre,
      barberoNombre: null,
      medioPago: venta.medioPago,
      monto: importeVenta(venta) / 100,
      anulada,
      ventaSuelta: venta.referenciaId === null,
      motivoAnulacion: null,
      notas: null,
    });
  }

  filas.sort((a, b) => (b.momento?.getTime() ?? 0) - (a.momento?.getTime() ?? 0));

  const activas = filas.filter((fila) => !fila.anulada);
  const total = activas.reduce((sum, fila) => sum + aCentavos(fila.monto), 0) / 100;

  const barberos = new Map<string, ResumenBarbero>();
  for (const atencion of atenciones) {
    if (atencion.anulado || !atencion.barberoId) continue;
    const fila = filas.find((item) => item.key === `servicio-${atencion.id}`);
    const previo = barberos.get(atencion.barberoId) ?? {
      barberoId: atencion.barberoId,
      nombre: atencion.barberoNombre,
      servicios: 0,
      monto: 0,
    };
    barberos.set(atencion.barberoId, {
      ...previo,
      servicios: previo.servicios + 1,
      monto: (aCentavos(previo.monto) + aCentavos(fila?.monto ?? 0)) / 100,
    });
  }

  return {
    filas,
    total,
    cantidadServicios: activas.filter((fila) => fila.tipo === "servicio").length,
    cantidadProductos,
    porBarbero: [...barberos.values()].sort((a, b) => b.monto - a.monto),
  };
}
