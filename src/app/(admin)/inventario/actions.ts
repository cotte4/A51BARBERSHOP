"use server";

import { db } from "@/db";
import { productos, stockMovimientos } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// ─────────────────────────────────────────────
// CREAR PRODUCTO
// ─────────────────────────────────────────────

export type ProductoFormState = {
  error?: string;
  fieldErrors?: {
    nombre?: string;
    stockMinimo?: string;
    precioVenta?: string;
    costoCompra?: string;
  };
};

export async function crearProducto(
  prevState: ProductoFormState,
  formData: FormData
): Promise<ProductoFormState> {
  const session = await auth.api.getSession({ headers: await headers() });
  const userRole = (session?.user as { role?: string })?.role;
  if (userRole !== "admin") return { error: "Solo el administrador puede crear productos." };

  const nombre = (formData.get("nombre") as string)?.trim();
  const descripcion = (formData.get("descripcion") as string)?.trim() || null;
  const precioVentaRaw = (formData.get("precioVenta") as string)?.trim();
  const costoCompraRaw = (formData.get("costoCompra") as string)?.trim();
  const stockMinimoRaw = (formData.get("stockMinimo") as string)?.trim();

  const fieldErrors: ProductoFormState["fieldErrors"] = {};
  if (!nombre) fieldErrors.nombre = "El nombre es requerido";

  const stockMinimo = stockMinimoRaw !== "" ? parseInt(stockMinimoRaw, 10) : 5;
  if (isNaN(stockMinimo) || stockMinimo < 0) fieldErrors.stockMinimo = "El stock mínimo debe ser 0 o mayor";

  const precioVenta = precioVentaRaw !== "" ? parseFloat(precioVentaRaw) : null;
  if (precioVentaRaw !== "" && (precioVenta === null || isNaN(precioVenta))) {
    fieldErrors.precioVenta = "Ingresá un precio válido";
  }

  const costoCompra = costoCompraRaw !== "" ? parseFloat(costoCompraRaw) : null;
  if (costoCompraRaw !== "" && (costoCompra === null || isNaN(costoCompra))) {
    fieldErrors.costoCompra = "Ingresá un costo válido";
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
      activo: true,
    });
  } catch (e) {
    console.error("Error creando producto:", e);
    return { error: "No se pudo crear el producto. Intentá de nuevo." };
  }

  revalidatePath("/inventario");
  revalidatePath("/inventario/rotacion");
  revalidatePath("/dashboard");
  redirect("/inventario");
}

// ─────────────────────────────────────────────
// EDITAR PRODUCTO
// ─────────────────────────────────────────────

export async function editarProducto(
  id: string,
  prevState: ProductoFormState,
  formData: FormData
): Promise<ProductoFormState> {
  const session = await auth.api.getSession({ headers: await headers() });
  const userRole = (session?.user as { role?: string })?.role;
  if (userRole !== "admin") return { error: "Solo el administrador puede editar productos." };

  const nombre = (formData.get("nombre") as string)?.trim();
  const descripcion = (formData.get("descripcion") as string)?.trim() || null;
  const precioVentaRaw = (formData.get("precioVenta") as string)?.trim();
  const costoCompraRaw = (formData.get("costoCompra") as string)?.trim();
  const stockMinimoRaw = (formData.get("stockMinimo") as string)?.trim();

  const fieldErrors: ProductoFormState["fieldErrors"] = {};
  if (!nombre) fieldErrors.nombre = "El nombre es requerido";

  const stockMinimo = stockMinimoRaw !== "" ? parseInt(stockMinimoRaw, 10) : 5;
  if (isNaN(stockMinimo) || stockMinimo < 0) fieldErrors.stockMinimo = "El stock mínimo debe ser 0 o mayor";

  const precioVenta = precioVentaRaw !== "" ? parseFloat(precioVentaRaw) : null;
  if (precioVentaRaw !== "" && (precioVenta === null || isNaN(precioVenta))) {
    fieldErrors.precioVenta = "Ingresá un precio válido";
  }

  const costoCompra = costoCompraRaw !== "" ? parseFloat(costoCompraRaw) : null;
  if (costoCompraRaw !== "" && (costoCompra === null || isNaN(costoCompra))) {
    fieldErrors.costoCompra = "Ingresá un costo válido";
  }

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  try {
    const [existing] = await db.select({ id: productos.id }).from(productos).where(eq(productos.id, id)).limit(1);
    if (!existing) return { error: "Producto no encontrado." };

    await db.update(productos)
      .set({
        nombre,
        descripcion,
        precioVenta: precioVenta !== null ? String(precioVenta.toFixed(2)) : null,
        costoCompra: costoCompra !== null ? String(costoCompra.toFixed(2)) : null,
        stockMinimo,
      })
      .where(eq(productos.id, id));
  } catch (e) {
    console.error("Error editando producto:", e);
    return { error: "No se pudo actualizar el producto. Intentá de nuevo." };
  }

  revalidatePath(`/inventario/${id}`);
  revalidatePath("/inventario");
  revalidatePath("/inventario/rotacion");
  revalidatePath("/dashboard");
  redirect(`/inventario/${id}`);
}

// ─────────────────────────────────────────────
// REGISTRAR MOVIMIENTO
// ─────────────────────────────────────────────

export type MovimientoFormState = {
  error?: string;
  fieldErrors?: {
    tipo?: string;
    cantidad?: string;
    notas?: string;
  };
  success?: boolean;
};

export async function registrarMovimiento(
  productoId: string,
  prevState: MovimientoFormState,
  formData: FormData
): Promise<MovimientoFormState> {
  const session = await auth.api.getSession({ headers: await headers() });
  const userRole = (session?.user as { role?: string })?.role;
  if (userRole !== "admin") return { error: "Solo el administrador puede registrar movimientos." };

  const tipo = (formData.get("tipo") as string)?.trim();
  const cantidadRaw = (formData.get("cantidad") as string)?.trim();
  const notas = (formData.get("notas") as string)?.trim() || null;

  const fieldErrors: MovimientoFormState["fieldErrors"] = {};

  const tiposValidos = ["entrada", "uso_interno", "ajuste"];
  if (!tipo || !tiposValidos.includes(tipo)) fieldErrors.tipo = "Seleccioná un tipo válido";

  const cantidadInput = cantidadRaw !== "" ? parseInt(cantidadRaw, 10) : NaN;
  if (isNaN(cantidadInput) || cantidadInput === 0) {
    fieldErrors.cantidad = "La cantidad debe ser un número entero distinto de cero";
  }

  if (tipo === "entrada" && !isNaN(cantidadInput) && cantidadInput < 0) {
    fieldErrors.cantidad = "Para entrada la cantidad debe ser positiva";
  }

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  // Para uso_interno: si el usuario ingresó positivo, negarlo
  let cantidad = cantidadInput;
  if (tipo === "uso_interno" && cantidad > 0) cantidad = -cantidad;

  try {
    const [producto] = await db
      .select({ stockActual: productos.stockActual })
      .from(productos)
      .where(eq(productos.id, productoId))
      .limit(1);

    if (!producto) return { error: "Producto no encontrado." };

    const stockResultante = (producto.stockActual ?? 0) + cantidad;
    if (stockResultante < 0) {
      return { error: `Stock insuficiente. Stock actual: ${producto.stockActual ?? 0}. No puede quedar negativo.` };
    }

    await db.update(productos)
      .set({ stockActual: sql`${productos.stockActual} + ${cantidad}` })
      .where(eq(productos.id, productoId));

    await db.insert(stockMovimientos).values({
      productoId,
      tipo,
      cantidad,
      notas,
    });
  } catch (e) {
    console.error("Error registrando movimiento:", e);
    return { error: "No se pudo registrar el movimiento. Intentá de nuevo." };
  }

  revalidatePath(`/inventario/${productoId}`);
  revalidatePath("/inventario");
  revalidatePath("/inventario/rotacion");
  revalidatePath("/dashboard");
  return { success: true };
}
