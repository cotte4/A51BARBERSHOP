import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  atenciones,
  atencionesAdicionales,
  atencionesProductos,
  barberos,
  clients,
  marcianoBeneficiosUso,
  mediosPago,
  ovnisPendingCredits,
  productos,
  servicios,
  serviciosAdicionales,
  stockMovimientos,
} from "@/db/schema";
import type { QuickActionDefaults } from "@/lib/types";
import { MARCIANO_BENEFICIOS } from "@/lib/marciano-config";
import {
  hasCajaCerradaHoy as hasCajaCerradaHoyInDal,
  resolveCajaActorBarberoIdByUser,
} from "@/lib/dal/caja";
import {
  assertAnulacionReversionAllowed,
  countMarcianoConsumicionesToRevert,
} from "@/lib/finance/anulacion-reversal";
import { calculateAtencionCommission } from "@/lib/finance/commission";
import { resolveMarcianoCorteUsageDeltas } from "@/lib/finance/marciano-cortes";

export type AtencionCreationInput = {
  barberoId: string;
  clientId?: string | null;
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
  esMarcianoIncluido?: boolean;
};

export type VentaProductoInput = {
  productoId: string;
  cantidad: number;
  precioCobrado: number;
  medioPagoId: string;
};

export type VentaProductoResult =
  | { ok: true }
  | {
      ok: false;
      error?: string;
      fieldErrors?: {
        productoId?: string;
      };
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

function getCurrentMonthKey(fecha = getFechaHoyArgentina()): string {
  return fecha.slice(0, 7);
}

async function applyMarcianoConsumicionesDelta(input: {
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0];
  clientId: string;
  delta: number;
  fecha: string;
}) {
  if (input.delta === 0) {
    return;
  }

  const mes = getCurrentMonthKey(input.fecha);
  const [existing] = await input.tx
    .select()
    .from(marcianoBeneficiosUso)
    .where(and(eq(marcianoBeneficiosUso.clientId, input.clientId), eq(marcianoBeneficiosUso.mes, mes)))
    .limit(1);

  const consumicionesActuales = existing?.consumicionesUsadas ?? 0;
  const consumicionesSiguientes = consumicionesActuales + input.delta;

  if (consumicionesSiguientes < 0) {
    throw new Error("No se pudo reconciliar el uso Marciano de consumiciones.");
  }

  if (
    input.delta > 0 &&
    MARCIANO_BENEFICIOS.consumicionesPorMes !== null &&
    consumicionesSiguientes > MARCIANO_BENEFICIOS.consumicionesPorMes
  ) {
    throw new Error(
      `El cliente ya agotó sus ${MARCIANO_BENEFICIOS.consumicionesPorMes} consumiciones Marciano del mes.`
    );
  }

  if (existing) {
    await input.tx
      .update(marcianoBeneficiosUso)
      .set({
        consumicionesUsadas: consumicionesSiguientes,
        updatedAt: new Date(),
      })
      .where(eq(marcianoBeneficiosUso.id, existing.id));
    return;
  }

  await input.tx.insert(marcianoBeneficiosUso).values({
    clientId: input.clientId,
    mes,
    consumicionesUsadas: consumicionesSiguientes,
  });
}

async function isMarcianoClientInTx(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  clientId: string
): Promise<boolean> {
  const [client] = await tx
    .select({ esMarciano: clients.esMarciano })
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);
  return Boolean(client?.esMarciano);
}

async function applyMarcianoCortesDelta(input: {
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0];
  clientId: string;
  delta: number;
  fecha: string;
}) {
  if (input.delta === 0) {
    return;
  }

  const mes = getCurrentMonthKey(input.fecha);
  const [existing] = await input.tx
    .select()
    .from(marcianoBeneficiosUso)
    .where(and(eq(marcianoBeneficiosUso.clientId, input.clientId), eq(marcianoBeneficiosUso.mes, mes)))
    .limit(1);

  const cortesActuales = existing?.cortesUsados ?? 0;
  const cortesSiguientes = cortesActuales + input.delta;

  if (cortesSiguientes < 0) {
    throw new Error("No se pudo reconciliar el uso Marciano de cortes.");
  }

  if (existing) {
    await input.tx
      .update(marcianoBeneficiosUso)
      .set({
        cortesUsados: cortesSiguientes,
        updatedAt: new Date(),
      })
      .where(eq(marcianoBeneficiosUso.id, existing.id));
    return;
  }

  await input.tx.insert(marcianoBeneficiosUso).values({
    clientId: input.clientId,
    mes,
    cortesUsados: cortesSiguientes,
  });
}

export async function syncMarcianoCorteUsoForAtencionChange(input: {
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0];
  fecha: string;
  previousClientId?: string | null;
  nextClientId?: string | null;
}) {
  const previousClientId = input.previousClientId ?? null;
  const nextClientId = input.nextClientId ?? null;

  const previousIsMarciano = previousClientId
    ? await isMarcianoClientInTx(input.tx, previousClientId)
    : false;
  const nextIsMarciano = nextClientId ? await isMarcianoClientInTx(input.tx, nextClientId) : false;
  const deltas = resolveMarcianoCorteUsageDeltas({
    previousClientId,
    nextClientId,
    previousIsMarciano,
    nextIsMarciano,
  });

  for (const delta of deltas) {
    await applyMarcianoCortesDelta({
      tx: input.tx,
      clientId: delta.clientId,
      delta: delta.delta,
      fecha: input.fecha,
    });
  }
}

export async function hasCajaCerradaHoy() {
  return hasCajaCerradaHoyInDal();
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
  if (input.clientId) {
    const [client] = await db
      .select({ id: clients.id })
      .from(clients)
      .where(eq(clients.id, input.clientId))
      .limit(1);

    if (!client) {
      throw new Error("Cliente no encontrado");
    }
  }

  const precioCobrado = input.precioCobrado;
  const servicePrecioBase = servicio.precioBase ?? String(precioCobrado);
  const commission = calculateAtencionCommission({
    precioCobrado,
    comisionMedioPagoPct: Number(medioPago.comisionPorcentaje ?? 0),
    comisionBarberoPct: Number(barbero.porcentajeComision ?? 0),
    servicioPrecioBase: Number(servicePrecioBase),
  });

  const adicionalesIds = input.adicionalesIds ?? [];
  const productosSeleccionados = input.productos ?? [];

  // Fetch product ovnisValue for OVNIS hook (outside tx — read-only, no contention)
  const productosParaOvnis =
    productosSeleccionados.length > 0 && input.clientId
      ? await db
          .select({ id: productos.id, ovnisValue: productos.ovnisValue })
          .from(productos)
          .where(inArray(productos.id, productosSeleccionados.map((p) => p.productoId)))
      : [];

  return db.transaction(async (tx) => {
    const [nuevaAtencion] = await tx
      .insert(atenciones)
      .values({
        barberoId: input.barberoId,
        clientId: input.clientId ?? null,
        servicioId: input.servicioId,
        fecha: getFechaHoyArgentina(),
        hora: getHoraAhoraArgentina(),
        precioBase: servicePrecioBase,
        precioCobrado: String(precioCobrado),
        medioPagoId: input.medioPagoId,
        comisionMedioPagoPct: String(commission.comisionMedioPagoPct),
        comisionMedioPagoMonto: String(commission.comisionMedioPagoMonto.toFixed(2)),
        montoNeto: String(commission.montoNeto.toFixed(2)),
        comisionBarberoPct: String(commission.comisionBarberoPct),
        comisionBarberoMonto: String(commission.comisionBarberoMonto.toFixed(2)),
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
        clientId: input.clientId ?? null,
        medioPagoId: input.medioPagoId,
        productosSeleccionados,
      });
    }

    await syncMarcianoCorteUsoForAtencionChange({
      tx,
      fecha: nuevaAtencion.fecha,
      previousClientId: null,
      nextClientId: input.clientId ?? null,
    });

    // OVNIS: emit pending credit for Marciano clients
    if (input.clientId) {
      const [cliente] = await tx
        .select({ esMarciano: clients.esMarciano })
        .from(clients)
        .where(eq(clients.id, input.clientId))
        .limit(1);

      if (cliente?.esMarciano) {
        const servicioOvnis = servicio.ovnisValue ?? 0;
        const productosOvnis = productosSeleccionados.reduce((sum, p) => {
          const prod = productosParaOvnis.find((pr) => pr.id === p.productoId);
          return sum + (prod?.ovnisValue ?? 0) * p.cantidad;
        }, 0);
        const totalOvnis = servicioOvnis + productosOvnis;

        if (totalOvnis > 0) {
          const { createPendingCreditInTx } = await import("@/lib/ovnis-server");
          await createPendingCreditInTx(tx, {
            clientId: input.clientId,
            atencionId: nuevaAtencion.id,
            amount: totalOvnis,
            description: `Atención del ${nuevaAtencion.fecha} — ${servicio.nombre}`,
          });
        }
      }
    }

    return nuevaAtencion;
  });
}

type SyncProductosAtencionInput = {
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0];
  atencionId: string;
  clientId?: string | null;
  medioPagoId: string;
  productosSeleccionados: ProductoSeleccionadoInput[];
};

export async function anularAtencionConReversion(input: {
  atencionId: string;
  motivoAnulacion: string;
}) {
  return db.transaction(async (tx) => {
    const [atencion] = await tx
      .select({
        id: atenciones.id,
        fecha: atenciones.fecha,
        clientId: atenciones.clientId,
        anulado: atenciones.anulado,
      })
      .from(atenciones)
      .where(eq(atenciones.id, input.atencionId))
      .limit(1);

    if (!atencion) {
      throw new Error("Atencion no encontrada.");
    }
    if (atencion.anulado) {
      throw new Error("Esta atencion ya esta anulada.");
    }

    const pendingCredits = await tx
      .select({
        id: ovnisPendingCredits.id,
        redeemedAt: ovnisPendingCredits.redeemedAt,
      })
      .from(ovnisPendingCredits)
      .where(eq(ovnisPendingCredits.atencionId, input.atencionId));

    assertAnulacionReversionAllowed(pendingCredits);

    const movimientosPrevios = await tx
      .select({
        productoId: stockMovimientos.productoId,
        cantidad: stockMovimientos.cantidad,
      })
      .from(stockMovimientos)
      .where(
        and(
          eq(stockMovimientos.referenciaId, input.atencionId),
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

    const productosPrevios = await tx
      .select({
        cantidad: atencionesProductos.cantidad,
        esMarcianoIncluido: atencionesProductos.esMarcianoIncluido,
      })
      .from(atencionesProductos)
      .where(eq(atencionesProductos.atencionId, input.atencionId));

    const consumicionesMarcianoPrevias = countMarcianoConsumicionesToRevert(productosPrevios);

    if (consumicionesMarcianoPrevias > 0 && atencion.clientId) {
      await applyMarcianoConsumicionesDelta({
        tx,
        clientId: atencion.clientId,
        delta: -consumicionesMarcianoPrevias,
        fecha: atencion.fecha,
      });
    }

    await syncMarcianoCorteUsoForAtencionChange({
      tx,
      fecha: atencion.fecha,
      previousClientId: atencion.clientId,
      nextClientId: null,
    });

    await tx
      .delete(stockMovimientos)
      .where(
        and(
          eq(stockMovimientos.referenciaId, input.atencionId),
          eq(stockMovimientos.tipo, "venta")
        )
      );

    await tx.delete(atencionesProductos).where(eq(atencionesProductos.atencionId, input.atencionId));
    await tx.delete(ovnisPendingCredits).where(eq(ovnisPendingCredits.atencionId, input.atencionId));

    await tx
      .update(atenciones)
      .set({
        anulado: true,
        motivoAnulacion: input.motivoAnulacion.trim(),
      })
      .where(eq(atenciones.id, input.atencionId));
  });
}

export async function syncProductosAtencion({
  tx,
  atencionId,
  clientId,
  medioPagoId,
  productosSeleccionados,
}: SyncProductosAtencionInput) {
  const [atencion] = await tx
    .select({
      id: atenciones.id,
      fecha: atenciones.fecha,
      clientId: atenciones.clientId,
    })
    .from(atenciones)
    .where(eq(atenciones.id, atencionId))
    .limit(1);

  if (!atencion) {
    throw new Error("Atencion no encontrada");
  }

  const resolvedClientId = clientId ?? atencion.clientId ?? null;
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

  const productosPrevios = await tx
    .select({
      cantidad: atencionesProductos.cantidad,
      esMarcianoIncluido: atencionesProductos.esMarcianoIncluido,
    })
    .from(atencionesProductos)
    .where(eq(atencionesProductos.atencionId, atencionId));

  const consumicionesMarcianoPrevias = productosPrevios.reduce(
    (total, item) => total + (item.esMarcianoIncluido ? item.cantidad : 0),
    0
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

  let client:
    | {
        id: string;
        esMarciano: boolean;
      }
    | null = null;

  if (resolvedClientId) {
    const [foundClient] = await tx
      .select({
        id: clients.id,
        esMarciano: clients.esMarciano,
      })
      .from(clients)
      .where(eq(clients.id, resolvedClientId))
      .limit(1);

    if (!foundClient) {
      throw new Error("Cliente no encontrado");
    }

    client = foundClient;
  }

  if (productosSeleccionados.length === 0) {
    if (consumicionesMarcianoPrevias > 0 && resolvedClientId) {
      await applyMarcianoConsumicionesDelta({
        tx,
        clientId: resolvedClientId,
        delta: -consumicionesMarcianoPrevias,
        fecha: atencion.fecha,
      });
    }
    return;
  }

  const productosIds = productosSeleccionados.map((item) => item.productoId);
  const productosData = await tx
    .select()
    .from(productos)
    .where(inArray(productos.id, productosIds));
  const productosMap = new Map(productosData.map((producto) => [producto.id, producto]));
  const consumicionesMarcianoNuevas = productosSeleccionados.reduce(
    (total, item) => total + (item.esMarcianoIncluido ? item.cantidad : 0),
    0
  );

  if (consumicionesMarcianoNuevas > 0) {
    if (!client) {
      throw new Error("Seleccioná un cliente Marciano para incluir consumiciones a $0.");
    }
    if (!client.esMarciano) {
      throw new Error("Solo clientes Marciano pueden usar consumiciones incluidas.");
    }
  }

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
    if (item.esMarcianoIncluido && !producto.esConsumicion) {
      throw new Error(`${producto.nombre} no está marcado como consumición Marciano.`);
    }

    const precioUnitario = item.esMarcianoIncluido ? 0 : item.precioUnitario;

    await tx.insert(atencionesProductos).values({
      atencionId,
      productoId: item.productoId,
      cantidad: item.cantidad,
      precioUnitario: String(precioUnitario.toFixed(2)),
      esMarcianoIncluido: item.esMarcianoIncluido ?? false,
      costoUnitarioSnapshot:
        producto.costoCompra === null ? null : String(Number(producto.costoCompra).toFixed(2)),
    });

    const [updatedProduct] = await tx
      .update(productos)
      .set({ stockActual: sql`${productos.stockActual} - ${item.cantidad}` })
      .where(and(eq(productos.id, item.productoId), gte(productos.stockActual, item.cantidad)))
      .returning({ id: productos.id });

    if (!updatedProduct) {
      throw new Error(`Sin stock para ${producto.nombre}`);
    }

    await tx.insert(stockMovimientos).values({
      productoId: item.productoId,
      tipo: "venta",
      cantidad: -item.cantidad,
      precioUnitario: String(precioUnitario.toFixed(2)),
      costoUnitarioSnapshot:
        producto.costoCompra === null ? null : String(Number(producto.costoCompra).toFixed(2)),
      referenciaId: atencionId,
      notas: medioPagoId,
    });
  }

  if (resolvedClientId && consumicionesMarcianoPrevias !== consumicionesMarcianoNuevas) {
    await applyMarcianoConsumicionesDelta({
      tx,
      clientId: resolvedClientId,
      delta: consumicionesMarcianoNuevas - consumicionesMarcianoPrevias,
      fecha: atencion.fecha,
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
  return resolveCajaActorBarberoIdByUser(userId, isAdmin);
}

export async function registrarVentaProductoDesdeInput(
  input: VentaProductoInput
): Promise<VentaProductoResult> {
  if (input.cantidad < 1 || !Number.isFinite(input.cantidad)) {
    return { ok: false, error: "La cantidad debe ser al menos 1." };
  }

  if (input.precioCobrado < 0 || !Number.isFinite(input.precioCobrado)) {
    return { ok: false, error: "El precio no puede ser negativo." };
  }

  return db.transaction(async (tx) => {
    const [producto] = await tx
      .select()
      .from(productos)
      .where(eq(productos.id, input.productoId))
      .limit(1);

    if (!producto) {
      return { ok: false, fieldErrors: { productoId: "Producto no encontrado" } };
    }

    if (!producto.activo) {
      return { ok: false, fieldErrors: { productoId: "El producto no esta activo" } };
    }

    if ((producto.stockActual ?? 0) < input.cantidad) {
      return {
        ok: false,
        error: `Sin stock disponible. Stock actual: ${producto.stockActual ?? 0}`,
      };
    }

    const [updatedProduct] = await tx
      .update(productos)
      .set({ stockActual: sql`${productos.stockActual} - ${input.cantidad}` })
      .where(
        and(
          eq(productos.id, input.productoId),
          eq(productos.activo, true),
          gte(productos.stockActual, input.cantidad)
        )
      )
      .returning({ id: productos.id });

    if (!updatedProduct) {
      return {
        ok: false,
        error: `Sin stock disponible. Stock actual: ${producto.stockActual ?? 0}`,
      };
    }

    const precioUnitario = input.precioCobrado / input.cantidad;
    const costoUnitarioSnapshot = Number(producto.costoCompra ?? 0);

    await tx.insert(stockMovimientos).values({
      productoId: input.productoId,
      tipo: "venta",
      cantidad: -input.cantidad,
      precioUnitario: String(precioUnitario.toFixed(2)),
      costoUnitarioSnapshot: String(costoUnitarioSnapshot.toFixed(2)),
      notas: input.medioPagoId,
    });

    return { ok: true };
  });
}
