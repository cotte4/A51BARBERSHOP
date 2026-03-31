import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  atenciones,
  atencionesAdicionales,
  atencionesProductos,
  barberos,
  cierresCaja,
  mediosPago,
  productos,
  servicios,
  serviciosAdicionales,
  stockMovimientos,
} from "@/db/schema";
import type { QuickActionDefaults } from "@/lib/types";

export type AtencionCreationInput = {
  barberoId: string;
  servicioId: string;
  medioPagoId: string;
  precioCobrado: number;
  adicionalesIds?: string[];
  productos?: ProductoSeleccionadoInput[];
  notas?: string | null;
};

export type ProductoSeleccionadoInput = {
  productoId: string;
  cantidad: number;
  precioUnitario: number;
};

export function getFechaHoyArgentina(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

export function getHoraAhoraArgentina(): string {
  return new Date().toLocaleTimeString("en-GB", {
    timeZone: "America/Argentina/Buenos_Aires",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export async function hasCajaCerradaHoy() {
  const [cierre] = await db
    .select({ id: cierresCaja.id })
    .from(cierresCaja)
    .where(eq(cierresCaja.fecha, getFechaHoyArgentina()))
    .limit(1);

  return !!cierre;
}

export async function crearAtencionDesdeInput(input: AtencionCreationInput) {
  const [barbero] = await db.select().from(barberos).where(eq(barberos.id, input.barberoId)).limit(1);
  const [medioPago] = await db
    .select()
    .from(mediosPago)
    .where(eq(mediosPago.id, input.medioPagoId))
    .limit(1);
  const [servicio] = await db
    .select()
    .from(servicios)
    .where(eq(servicios.id, input.servicioId))
    .limit(1);

  if (!barbero) {
    throw new Error("Barbero no encontrado");
  }
  if (!medioPago) {
    throw new Error("Medio de pago no encontrado");
  }
  if (!servicio) {
    throw new Error("Servicio no encontrado");
  }

  const precioCobrado = input.precioCobrado;
  const comisionMpPct = Number(medioPago.comisionPorcentaje ?? 0);
  const comisionMpMonto = (precioCobrado * comisionMpPct) / 100;
  const montoNeto = precioCobrado - comisionMpMonto;
  const comisionBarberoPct = Number(barbero.porcentajeComision ?? 0);
  const comisionBarberoMonto = (precioCobrado * comisionBarberoPct) / 100;

  const adicionalesIds = input.adicionalesIds ?? [];
  const productosSeleccionados = input.productos ?? [];

  return db.transaction(async (tx) => {
    const [nuevaAtencion] = await tx
      .insert(atenciones)
      .values({
        barberoId: input.barberoId,
        servicioId: input.servicioId,
        fecha: getFechaHoyArgentina(),
        hora: getHoraAhoraArgentina(),
        precioBase: servicio.precioBase,
        precioCobrado: String(precioCobrado),
        medioPagoId: input.medioPagoId,
        comisionMedioPagoPct: String(comisionMpPct),
        comisionMedioPagoMonto: String(comisionMpMonto.toFixed(2)),
        montoNeto: String(montoNeto.toFixed(2)),
        comisionBarberoPct: String(comisionBarberoPct),
        comisionBarberoMonto: String(comisionBarberoMonto.toFixed(2)),
        notas: input.notas?.trim() || null,
        anulado: false,
      })
      .returning();

    if (adicionalesIds.length > 0) {
      const adicionalesData = await tx
        .select()
        .from(serviciosAdicionales)
        .where(inArray(serviciosAdicionales.id, adicionalesIds));

      if (adicionalesData.length > 0) {
        await tx.insert(atencionesAdicionales).values(
          adicionalesData.map((a) => ({
            atencionId: nuevaAtencion.id,
            adicionalId: a.id,
            precioCobrado: a.precioExtra ?? "0",
          }))
        );
      }
    }

    if (productosSeleccionados.length > 0) {
      await syncProductosAtencion({
        tx,
        atencionId: nuevaAtencion.id,
        medioPagoId: input.medioPagoId,
        productosSeleccionados,
      });
    }

    return nuevaAtencion;
  });
}

type SyncProductosAtencionInput = {
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0];
  atencionId: string;
  medioPagoId: string;
  productosSeleccionados: ProductoSeleccionadoInput[];
};

export async function syncProductosAtencion({
  tx,
  atencionId,
  medioPagoId,
  productosSeleccionados,
}: SyncProductosAtencionInput) {
  const movimientosPrevios = await tx
    .select({
      productoId: stockMovimientos.productoId,
      cantidad: stockMovimientos.cantidad,
    })
    .from(stockMovimientos)
    .where(
      and(
        eq(stockMovimientos.referenciaId, atencionId),
        eq(stockMovimientos.tipo, "venta")
      )
    );

  for (const movimiento of movimientosPrevios) {
    if (!movimiento.productoId || !movimiento.cantidad) continue;
    await tx
      .update(productos)
      .set({ stockActual: sql`${productos.stockActual} + ${Math.abs(movimiento.cantidad)}` })
      .where(eq(productos.id, movimiento.productoId));
  }

  await tx
    .delete(stockMovimientos)
    .where(
      and(
        eq(stockMovimientos.referenciaId, atencionId),
        eq(stockMovimientos.tipo, "venta")
      )
    );
  await tx.delete(atencionesProductos).where(eq(atencionesProductos.atencionId, atencionId));

  if (productosSeleccionados.length === 0) {
    return;
  }

  const productosIds = productosSeleccionados.map((item) => item.productoId);
  const productosData = await tx
    .select()
    .from(productos)
    .where(inArray(productos.id, productosIds));
  const productosMap = new Map(productosData.map((producto) => [producto.id, producto]));

  for (const item of productosSeleccionados) {
    const producto = productosMap.get(item.productoId);

    if (!producto) {
      throw new Error("Producto no encontrado");
    }
    if (!producto.activo) {
      throw new Error("El producto no esta activo");
    }
    if ((producto.stockActual ?? 0) < item.cantidad) {
      throw new Error(`Sin stock para ${producto.nombre}`);
    }

    await tx.insert(atencionesProductos).values({
      atencionId,
      productoId: item.productoId,
      cantidad: item.cantidad,
      precioUnitario: String(item.precioUnitario.toFixed(2)),
      costoUnitarioSnapshot:
        producto.costoCompra === null ? null : String(Number(producto.costoCompra).toFixed(2)),
    });

    await tx
      .update(productos)
      .set({ stockActual: sql`${productos.stockActual} - ${item.cantidad}` })
      .where(eq(productos.id, item.productoId));

    await tx.insert(stockMovimientos).values({
      productoId: item.productoId,
      tipo: "venta",
      cantidad: -item.cantidad,
      precioUnitario: String(item.precioUnitario.toFixed(2)),
      costoUnitarioSnapshot:
        producto.costoCompra === null ? null : String(Number(producto.costoCompra).toFixed(2)),
      referenciaId: atencionId,
      notas: medioPagoId,
    });
  }
}

export async function getQuickActionDefaultsForBarbero(barberoId: string): Promise<QuickActionDefaults | null> {
  const [barbero] = await db
    .select({
      servicioDefectoId: barberos.servicioDefectoId,
      medioPagoDefectoId: barberos.medioPagoDefectoId,
    })
    .from(barberos)
    .where(eq(barberos.id, barberoId))
    .limit(1);

  if (!barbero?.servicioDefectoId || !barbero.medioPagoDefectoId) {
    return null;
  }

  const [servicio] = await db
    .select({
      id: servicios.id,
      nombre: servicios.nombre,
      precioBase: servicios.precioBase,
    })
    .from(servicios)
    .where(eq(servicios.id, barbero.servicioDefectoId))
    .limit(1);

  const [medioPago] = await db
    .select({
      id: mediosPago.id,
      nombre: mediosPago.nombre,
      comisionPorcentaje: mediosPago.comisionPorcentaje,
    })
    .from(mediosPago)
    .where(eq(mediosPago.id, barbero.medioPagoDefectoId))
    .limit(1);

  if (!servicio || !medioPago || servicio.precioBase === null) {
    return null;
  }

  return {
    servicioId: servicio.id,
    servicioNombre: servicio.nombre,
    precioBase: Number(servicio.precioBase),
    medioPagoId: medioPago.id,
    medioPagoNombre: medioPago.nombre ?? "—",
    comisionMedioPagoPct: Number(medioPago.comisionPorcentaje ?? 0),
  };
}

export async function resolveCajaActorBarberoId(userId: string, isAdmin: boolean) {
  const [barbero] = await db
    .select({ id: barberos.id })
    .from(barberos)
    .where(
      isAdmin
        ? and(eq(barberos.rol, "admin"), eq(barberos.activo, true))
        : and(eq(barberos.userId, userId), eq(barberos.activo, true))
    )
    .limit(1);

  return barbero?.id ?? null;
}
