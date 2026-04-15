"use server";

import { db } from "@/db";
import { productos, stockMovimientos } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type ProductoFormState = {
  error?: string;
  fieldErrors?: {
    nombre?: string;
    stockMinimo?: string;
    precioVenta?: string;
    costoCompra?: string;
    esConsumicion?: string;
  };
};

export async function crearProducto(
  prevState: ProductoFormState,
  formData: FormData
): Promise<ProductoFormState> {
  const session = await auth.api.getSession({ headers: await headers() });
  const userRole = (session?.user as { role?: string })?.role;
  if (userRole !== "admin" && userRole !== "asesor") return { error: "Solo el administrador puede crear productos." };

  const nombre = (formData.get("nombre") as string)?.trim();
  const descripcion = (formData.get("descripcion") as string)?.trim() || null;
  const precioVentaRaw = (formData.get("precioVenta") as string)?.trim();
  const costoCompraRaw = (formData.get("costoCompra") as string)?.trim();
  const stockMinimoRaw = (formData.get("stockMinimo") as string)?.trim();
  const esConsumicion = String(formData.get("esConsumicion") ?? "") === "on";

  const fieldErrors: ProductoFormState["fieldErrors"] = {};
  if (!nombre) fieldErrors.nombre = "El nombre es requerido";

  const stockMinimo = stockMinimoRaw !== "" ? parseInt(stockMinimoRaw, 10) : 5;
  if (isNaN(stockMinimo) || stockMinimo < 0) fieldErrors.stockMinimo = "El stock minimo debe ser 0 o mayor";

  const precioVenta = precioVentaRaw !== "" ? parseFloat(precioVentaRaw) : null;
  if (precioVentaRaw !== "" && (precioVenta === null || isNaN(precioVenta))) {
    fieldErrors.precioVenta = "Ingresa un precio valido";
  }

  const costoCompra = costoCompraRaw !== "" ? parseFloat(costoCompraRaw) : null;
  if (costoCompraRaw !== "" && (costoCompra === null || isNaN(costoCompra))) {
    fieldErrors.costoCompra = "Ingresa un costo valido";
  }

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  try {
    await db.insert(productos).values({
      nombre,
      descripcion,
      precioVenta: precioVenta !== null ? String(precioVenta.toFixed(2)) : null,
      costoCompra: costoCompra !== null ? String(costoCompra.toFixed(2)) : null,
      stockActual: 0,
      stockMinimo,
      esConsumicion,
      activo: true,
    });
  } catch (error) {
    console.error("Error creando producto:", error);
    return { error: "No se pudo crear el producto. Intenta de nuevo." };
  }

  revalidatePath("/inventario");
  revalidatePath("/inventario/rotacion");
  revalidatePath("/dashboard");
  redirect("/inventario");
}

export async function editarProducto(
  id: string,
  prevState: ProductoFormState,
  formData: FormData
): Promise<ProductoFormState> {
  const session = await auth.api.getSession({ headers: await headers() });
  const userRole = (session?.user as { role?: string })?.role;
  if (userRole !== "admin" && userRole !== "asesor") return { error: "Solo el administrador puede editar productos." };

  const nombre = (formData.get("nombre") as string)?.trim();
  const descripcion = (formData.get("descripcion") as string)?.trim() || null;
  const precioVentaRaw = (formData.get("precioVenta") as string)?.trim();
  const costoCompraRaw = (formData.get("costoCompra") as string)?.trim();
  const stockMinimoRaw = (formData.get("stockMinimo") as string)?.trim();
  const esConsumicion = String(formData.get("esConsumicion") ?? "") === "on";

  const fieldErrors: ProductoFormState["fieldErrors"] = {};
  if (!nombre) fieldErrors.nombre = "El nombre es requerido";

  const stockMinimo = stockMinimoRaw !== "" ? parseInt(stockMinimoRaw, 10) : 5;
  if (isNaN(stockMinimo) || stockMinimo < 0) fieldErrors.stockMinimo = "El stock minimo debe ser 0 o mayor";

  const precioVenta = precioVentaRaw !== "" ? parseFloat(precioVentaRaw) : null;
  if (precioVentaRaw !== "" && (precioVenta === null || isNaN(precioVenta))) {
    fieldErrors.precioVenta = "Ingresa un precio valido";
  }

  const costoCompra = costoCompraRaw !== "" ? parseFloat(costoCompraRaw) : null;
  if (costoCompraRaw !== "" && (costoCompra === null || isNaN(costoCompra))) {
    fieldErrors.costoCompra = "Ingresa un costo valido";
  }

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  try {
    const [existing] = await db
      .select({ id: productos.id })
      .from(productos)
      .where(eq(productos.id, id))
      .limit(1);

    if (!existing) return { error: "Producto no encontrado." };

    await db
      .update(productos)
      .set({
        nombre,
        descripcion,
        precioVenta: precioVenta !== null ? String(precioVenta.toFixed(2)) : null,
        costoCompra: costoCompra !== null ? String(costoCompra.toFixed(2)) : null,
        stockMinimo,
        esConsumicion,
      })
      .where(eq(productos.id, id));
  } catch (error) {
    console.error("Error editando producto:", error);
    return { error: "No se pudo actualizar el producto. Intenta de nuevo." };
  }

  revalidatePath(`/inventario/${id}`);
  revalidatePath("/inventario");
  revalidatePath("/inventario/rotacion");
  revalidatePath("/dashboard");
  redirect(`/inventario/${id}`);
}

export type MovimientoFormState = {
  error?: string;
  fieldErrors?: {
    tipo?: string;
    cantidad?: string;
    notas?: string;
  };
  success?: boolean;
};

export type QuickStockAdjustState = {
  error?: string;
  success?: boolean;
};

export async function registrarMovimiento(
  productoId: string,
  prevState: MovimientoFormState,
  formData: FormData
): Promise<MovimientoFormState> {
  const session = await auth.api.getSession({ headers: await headers() });
  const userRole = (session?.user as { role?: string })?.role;
  if (userRole !== "admin" && userRole !== "asesor") return { error: "Solo el administrador puede registrar movimientos." };

  const tipo = (formData.get("tipo") as string)?.trim();
  const cantidadRaw = (formData.get("cantidad") as string)?.trim();
  const notas = (formData.get("notas") as string)?.trim() || null;

  const fieldErrors: MovimientoFormState["fieldErrors"] = {};
  const tiposValidos = ["entrada", "uso_interno", "ajuste"];

  if (!tipo || !tiposValidos.includes(tipo)) {
    fieldErrors.tipo = "Selecciona un tipo valido";
  }

  const cantidadInput = cantidadRaw !== "" ? parseInt(cantidadRaw, 10) : NaN;
  if (isNaN(cantidadInput) || cantidadInput <= 0) {
    fieldErrors.cantidad = "La cantidad debe ser un numero entero mayor a cero";
  }

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  let cantidad = cantidadInput;
  if (tipo === "uso_interno") {
    cantidad = -cantidadInput;
  }

  try {
    const [producto] = await db
      .select({ stockActual: productos.stockActual })
      .from(productos)
      .where(eq(productos.id, productoId))
      .limit(1);

    if (!producto) return { error: "Producto no encontrado." };

    const stockResultante = (producto.stockActual ?? 0) + cantidad;
    if (stockResultante < 0) {
      return {
        error: `Stock insuficiente. Stock actual: ${producto.stockActual ?? 0}. No puede quedar negativo.`,
      };
    }

    await db
      .update(productos)
      .set({ stockActual: sql`${productos.stockActual} + ${cantidad}` })
      .where(eq(productos.id, productoId));

    await db.insert(stockMovimientos).values({
      productoId,
      tipo,
      cantidad,
      notas,
    });
  } catch (error) {
    console.error("Error registrando movimiento:", error);
    return { error: "No se pudo registrar el movimiento. Intenta de nuevo." };
  }

  revalidatePath(`/inventario/${productoId}`);
  revalidatePath("/inventario");
  revalidatePath("/inventario/rotacion");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function ajustarStockRapido(
  productoId: string,
  delta: number,
  prevState: QuickStockAdjustState
): Promise<QuickStockAdjustState> {
  const session = await auth.api.getSession({ headers: await headers() });
  const userRole = (session?.user as { role?: string })?.role;
  if (userRole !== "admin" && userRole !== "asesor") return { error: "Solo el administrador puede ajustar stock." };

  if (!Number.isInteger(delta) || delta === 0) {
    return { error: "El ajuste rápido es inválido." };
  }

  try {
    const [producto] = await db
      .select({ stockActual: productos.stockActual })
      .from(productos)
      .where(eq(productos.id, productoId))
      .limit(1);

    if (!producto) {
      return { error: "Producto no encontrado." };
    }

    const stockResultante = (producto.stockActual ?? 0) + delta;
    if (stockResultante < 0) {
      return { error: "No hay stock suficiente para descontar." };
    }

    await db
      .update(productos)
      .set({ stockActual: sql`${productos.stockActual} + ${delta}` })
      .where(eq(productos.id, productoId));

    await db.insert(stockMovimientos).values({
      productoId,
      tipo: delta > 0 ? "ajuste" : "uso_interno",
      cantidad: delta,
      notas: delta > 0 ? "Ajuste rápido desde inventario" : "Descuento rápido desde inventario",
    });
  } catch (error) {
    console.error("Error ajustando stock rápido:", error);
    return { error: "No se pudo actualizar el stock." };
  }

  revalidatePath(`/inventario/${productoId}`);
  revalidatePath("/inventario");
  revalidatePath("/inventario/rotacion");
  revalidatePath("/dashboard");
  return { success: true };
}
