type NumericLike = number | string | null | undefined;

type AtencionCierreInput = {
  barberoId: string | null;
  precioCobrado: NumericLike;
  comisionBarberoMonto: NumericLike;
  comisionMedioPagoMonto: NumericLike;
  montoNeto: NumericLike;
};

type BarberoCierreInput = {
  id: string;
  nombre: string;
  rol: string;
  tipoModelo: string | null;
  activo?: boolean | null;
};

type VentaProductoCierreInput = {
  productoId: string | null;
  cantidad: number | null;
  precioUnitario: NumericLike;
  medioPagoId: string | null;
};

type ProductoCierreInput = {
  id: string;
  costoCompra: NumericLike;
};

type MedioPagoCierreInput = {
  id: string;
  comisionPorcentaje: NumericLike;
};

export type ResumenBarberoCierre = {
  nombre: string;
  rol: string | null;
  tipoModelo: string | null;
  cortes: number;
  totalBruto: number;
  comisionCalculada: number;
  aporteCasaServicios: number;
  ingresoNetoServicios: number;
};

export type TotalesCierre = {
  totalServiciosBruto: number;
  totalServiciosComisionesMedios: number;
  cajaNetaServicios: number;
  totalProductosBruto: number;
  totalProductosComisionesMedios: number;
  totalProductosCosto: number;
  cajaNetaProductos: number;
  margenProductos: number;
  totalBrutoDia: number;
  totalComisionesMediosDia: number;
  cajaNetaDia: number;
  aporteCasaServicios: number;
  aporteEconomicoCasaDia: number;
};

export type CierreResumen = {
  version: 2;
  barberos: Record<string, ResumenBarberoCierre>;
  totales: TotalesCierre;
};

type NormalizeInput = {
  resumenBarberos: unknown;
  totalNeto: NumericLike;
  totalProductos: NumericLike;
};

export function toNumber(value: NumericLike): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function getDaysInMonth(fecha: string): number {
  const [year, month] = fecha.split("-").map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return 30;
  return new Date(year, month, 0).getDate();
}

export function buildCierreResumen(args: {
  fecha: string;
  atenciones: AtencionCierreInput[];
  barberos: BarberoCierreInput[];
  ventasProductos: VentaProductoCierreInput[];
  productos: ProductoCierreInput[];
  mediosPago: MedioPagoCierreInput[];
}): CierreResumen {
  const { fecha: _fecha, atenciones, barberos, ventasProductos, productos, mediosPago } = args;

  const barberosMap = new Map(barberos.map((barbero) => [barbero.id, barbero]));
  const productosMap = new Map(productos.map((producto) => [producto.id, producto]));
  const mediosPagoMap = new Map(mediosPago.map((medio) => [medio.id, medio]));

  const resumenBarberos: Record<string, ResumenBarberoCierre> = {};

  const totalServiciosBruto = atenciones.reduce(
    (sum, atencion) => sum + toNumber(atencion.precioCobrado),
    0
  );
  const totalServiciosComisionesMedios = atenciones.reduce(
    (sum, atencion) => sum + toNumber(atencion.comisionMedioPagoMonto),
    0
  );
  const cajaNetaServicios = atenciones.reduce(
    (sum, atencion) => sum + toNumber(atencion.montoNeto),
    0
  );

  let aporteCasaServicios = 0;

  for (const atencion of atenciones) {
    if (!atencion.barberoId) continue;
    const barbero = barberosMap.get(atencion.barberoId);
    if (!barbero) continue;

    if (!resumenBarberos[atencion.barberoId]) {
      resumenBarberos[atencion.barberoId] = {
        nombre: barbero.nombre,
        rol: barbero.rol ?? null,
        tipoModelo: barbero.tipoModelo ?? null,
        cortes: 0,
        totalBruto: 0,
        comisionCalculada: 0,
        aporteCasaServicios: 0,
        ingresoNetoServicios: 0,
      };
    }

    const resumen = resumenBarberos[atencion.barberoId];
    const precioCobrado = toNumber(atencion.precioCobrado);
    const comisionBarberoMonto = toNumber(atencion.comisionBarberoMonto);
    const comisionMedioPagoMonto = toNumber(atencion.comisionMedioPagoMonto);
    const montoNeto = toNumber(atencion.montoNeto);

    resumen.cortes += 1;
    resumen.totalBruto += precioCobrado;
    resumen.comisionCalculada += comisionBarberoMonto;

    if (barbero.rol === "admin") {
      resumen.ingresoNetoServicios += montoNeto;
      continue;
    }

    // If commission is null the record is incomplete — skip aporte to avoid overstating casa income.
    if (atencion.comisionBarberoMonto == null) continue;

    const aporteServicio = precioCobrado - comisionBarberoMonto - comisionMedioPagoMonto;
    resumen.aporteCasaServicios += aporteServicio;
    aporteCasaServicios += aporteServicio;
  }

  let totalProductosBruto = 0;
  let totalProductosComisionesMedios = 0;
  let totalProductosCosto = 0;

  for (const venta of ventasProductos) {
    const cantidadVendida = Math.abs(Number(venta.cantidad ?? 0));
    const precioUnitario = toNumber(venta.precioUnitario);
    const bruto = cantidadVendida * precioUnitario;
    const producto = venta.productoId ? productosMap.get(venta.productoId) : undefined;
    const costo = cantidadVendida * toNumber(producto?.costoCompra);
    const medioPago = venta.medioPagoId ? mediosPagoMap.get(venta.medioPagoId) : undefined;
    const comisionPct = toNumber(medioPago?.comisionPorcentaje) / 100;
    const comision = bruto * comisionPct;

    totalProductosBruto += bruto;
    totalProductosComisionesMedios += comision;
    totalProductosCosto += costo;
  }

  const cajaNetaProductos = totalProductosBruto - totalProductosComisionesMedios;
  const margenProductos = cajaNetaProductos - totalProductosCosto;

  return {
    version: 2,
    barberos: resumenBarberos,
    totales: {
      totalServiciosBruto,
      totalServiciosComisionesMedios,
      cajaNetaServicios,
      totalProductosBruto,
      totalProductosComisionesMedios,
      totalProductosCosto,
      cajaNetaProductos,
      margenProductos,
      totalBrutoDia: totalServiciosBruto + totalProductosBruto,
      totalComisionesMediosDia:
        totalServiciosComisionesMedios + totalProductosComisionesMedios,
      cajaNetaDia: cajaNetaServicios + cajaNetaProductos,
      aporteCasaServicios,
      aporteEconomicoCasaDia: aporteCasaServicios + margenProductos,
    },
  };
}

export function normalizeCierreResumen({
  resumenBarberos,
  totalNeto,
  totalProductos,
}: NormalizeInput): CierreResumen {
  if (
    resumenBarberos &&
    typeof resumenBarberos === "object" &&
    "version" in resumenBarberos &&
    (resumenBarberos as { version: unknown }).version === 2 &&
    "barberos" in resumenBarberos &&
    "totales" in resumenBarberos
  ) {
    return resumenBarberos as CierreResumen;
  }

  const legacyBarberos =
    resumenBarberos && typeof resumenBarberos === "object"
      ? (resumenBarberos as Record<
          string,
          {
            nombre?: string;
            cortes?: number;
            totalBruto?: NumericLike;
            comisionCalculada?: NumericLike;
          }
        >)
      : {};

  const totalComisionesBarberos = Object.values(legacyBarberos).reduce(
    (sum, resumen) => sum + toNumber(resumen.comisionCalculada),
    0
  );
  const totalProductosBruto = toNumber(totalProductos);
  const cajaNetaServicios = toNumber(totalNeto);
  const aporteCasaServicios = cajaNetaServicios - totalComisionesBarberos;

  return {
    version: 2,
    barberos: Object.fromEntries(
      Object.entries(legacyBarberos).map(([barberoId, resumen]) => [
        barberoId,
        {
          nombre: resumen.nombre ?? "Barbero",
          rol: null,
          tipoModelo: null,
          cortes: Number(resumen.cortes ?? 0),
          totalBruto: toNumber(resumen.totalBruto),
          comisionCalculada: toNumber(resumen.comisionCalculada),
          aporteCasaServicios: 0,
          ingresoNetoServicios: 0,
        },
      ])
    ),
    totales: {
      totalServiciosBruto: cajaNetaServicios,
      totalServiciosComisionesMedios: 0,
      cajaNetaServicios,
      totalProductosBruto,
      totalProductosComisionesMedios: 0,
      totalProductosCosto: 0,
      cajaNetaProductos: totalProductosBruto,
      margenProductos: 0,
      totalBrutoDia: cajaNetaServicios + totalProductosBruto,
      totalComisionesMediosDia: 0,
      cajaNetaDia: cajaNetaServicios + totalProductosBruto,
      aporteCasaServicios,
      aporteEconomicoCasaDia: aporteCasaServicios,
    },
  };
}
