import "server-only";

import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { productos, stockMovimientos } from "@/db/schema";

export type ProductoInput = {
  nombre: string;
  descripcion: string | null;
  precioVenta: number | null;
  costoCompra: number | null;
  stockMinimo: number;
  esConsumicion: boolean;
};

export type StockMutationResult =
  | { ok: true }
  | {
      ok: false;
      error: string;
    };

export async function crearProductoDesdeInput(input: ProductoInput): Promise<void> {
  await db.insert(productos).values({
    nombre: input.nombre,
    descripcion: input.descripcion,
    precioVenta: input.precioVenta !== null ? String(input.precioVenta.toFixed(2)) : null,
    costoCompra: input.costoCompra !== null ? String(input.costoCompra.toFixed(2)) : null,
    stockActual: 0,
    stockMinimo: input.stockMinimo,
    esConsumicion: input.esConsumicion,
    activo: true,
  });
}

export async function editarProductoDesdeInput(
  id: string,
  input: ProductoInput
): Promise<StockMutationResult> {
  const [updated] = await db
    .update(productos)
    .set({
      nombre: input.nombre,
      descripcion: input.descripcion,
      precioVenta: input.precioVenta !== null ? String(input.precioVenta.toFixed(2)) : null,
      costoCompra: input.costoCompra !== null ? String(input.costoCompra.toFixed(2)) : null,
      stockMinimo: input.stockMinimo,
      esConsumicion: input.esConsumicion,
    })
    .where(eq(productos.id, id))
    .returning({ id: productos.id });

  if (!updated) {
    return { ok: false, error: "Producto no encontrado." };
  }

  return { ok: true };
}

export async function registrarMovimientoInventario(input: {
  productoId: string;
  tipo: "entrada" | "uso_interno" | "ajuste";
  cantidad: number;
  notas?: string | null;
}): Promise<StockMutationResult> {
  return mutateStock({
    productoId: input.productoId,
    delta: input.cantidad,
    tipo: input.tipo,
    notas: input.notas ?? null,
    insufficientMessage: (stockActual) =>
      `Stock insuficiente. Stock actual: ${stockActual}. No puede quedar negativo.`,
  });
}

export async function ajustarStockRapidoDesdeInput(
  productoId: string,
  delta: number
): Promise<StockMutationResult> {
  return mutateStock({
    productoId,
    delta,
    tipo: delta > 0 ? "ajuste" : "uso_interno",
    notas: delta > 0 ? "Ajuste rapido desde inventario" : "Descuento rapido desde inventario",
    insufficientMessage: () => "No hay stock suficiente para descontar.",
  });
}

async function mutateStock(input: {
  productoId: string;
  delta: number;
  tipo: "entrada" | "uso_interno" | "ajuste";
  notas: string | null;
  insufficientMessage: (stockActual: number) => string;
}): Promise<StockMutationResult> {
  return db.transaction(async (tx) => {
    const [producto] = await tx
      .select({ stockActual: productos.stockActual })
      .from(productos)
      .where(eq(productos.id, input.productoId))
      .limit(1);

    if (!producto) {
      return { ok: false, error: "Producto no encontrado." };
    }

    const stockActual = producto.stockActual ?? 0;

    if (stockActual + input.delta < 0) {
      return { ok: false, error: input.insufficientMessage(stockActual) };
    }

    const where =
      input.delta < 0
        ? and(eq(productos.id, input.productoId), gte(productos.stockActual, Math.abs(input.delta)))
        : eq(productos.id, input.productoId);

    const [updated] = await tx
      .update(productos)
      .set({ stockActual: sql`${productos.stockActual} + ${input.delta}` })
      .where(where)
      .returning({ id: productos.id });

    if (!updated) {
      return { ok: false, error: input.insufficientMessage(stockActual) };
    }

    await tx.insert(stockMovimientos).values({
      productoId: input.productoId,
      tipo: input.tipo,
      cantidad: input.delta,
      notas: input.notas,
    });

    return { ok: true };
  });
}
