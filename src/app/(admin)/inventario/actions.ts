"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminActorContext } from "@/lib/dal/authz";
import {
  ajustarStockRapidoDesdeInput,
  crearProductoDesdeInput,
  editarProductoDesdeInput,
  registrarMovimientoInventario,
  type ProductoInput,
} from "@/lib/inventario-service";

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

const TIPOS_MOVIMIENTO = ["entrada", "uso_interno", "ajuste"] as const;
type TipoMovimiento = (typeof TIPOS_MOVIMIENTO)[number];

async function requireInventoryAdmin(error: string) {
  const actor = await getAdminActorContext();
  return actor ? null : { error };
}

function parseProductoInput(formData: FormData): {
  input?: ProductoInput;
  fieldErrors?: ProductoFormState["fieldErrors"];
} {
  const nombre = (formData.get("nombre") as string)?.trim();
  const descripcion = (formData.get("descripcion") as string)?.trim() || null;
  const precioVentaRaw = (formData.get("precioVenta") as string)?.trim();
  const costoCompraRaw = (formData.get("costoCompra") as string)?.trim();
  const stockMinimoRaw = (formData.get("stockMinimo") as string)?.trim();
  const esConsumicion = String(formData.get("esConsumicion") ?? "") === "on";

  const fieldErrors: ProductoFormState["fieldErrors"] = {};
  if (!nombre) fieldErrors.nombre = "El nombre es requerido";

  const stockMinimo = stockMinimoRaw !== "" ? parseInt(stockMinimoRaw, 10) : 5;
  if (isNaN(stockMinimo) || stockMinimo < 0) {
    fieldErrors.stockMinimo = "El stock minimo debe ser 0 o mayor";
  }

  const precioVenta = precioVentaRaw !== "" ? parseFloat(precioVentaRaw) : null;
  if (precioVentaRaw !== "" && (precioVenta === null || isNaN(precioVenta))) {
    fieldErrors.precioVenta = "Ingresa un precio valido";
  }

  const costoCompra = costoCompraRaw !== "" ? parseFloat(costoCompraRaw) : null;
  if (costoCompraRaw !== "" && (costoCompra === null || isNaN(costoCompra))) {
    fieldErrors.costoCompra = "Ingresa un costo valido";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  return {
    input: {
      nombre,
      descripcion,
      precioVenta,
      costoCompra,
      stockMinimo,
      esConsumicion,
    },
  };
}

export async function crearProducto(
  prevState: ProductoFormState,
  formData: FormData
): Promise<ProductoFormState> {
  const authError = await requireInventoryAdmin("Solo el administrador puede crear productos.");
  if (authError) return authError;

  const parsed = parseProductoInput(formData);
  if (!parsed.input) return { fieldErrors: parsed.fieldErrors };

  try {
    await crearProductoDesdeInput(parsed.input);
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
  const authError = await requireInventoryAdmin("Solo el administrador puede editar productos.");
  if (authError) return authError;

  const parsed = parseProductoInput(formData);
  if (!parsed.input) return { fieldErrors: parsed.fieldErrors };

  try {
    const result = await editarProductoDesdeInput(id, parsed.input);
    if (!result.ok) return { error: result.error };
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

export async function registrarMovimiento(
  productoId: string,
  prevState: MovimientoFormState,
  formData: FormData
): Promise<MovimientoFormState> {
  const authError = await requireInventoryAdmin("Solo el administrador puede registrar movimientos.");
  if (authError) return authError;

  const tipoRaw = (formData.get("tipo") as string)?.trim();
  const cantidadRaw = (formData.get("cantidad") as string)?.trim();
  const notas = (formData.get("notas") as string)?.trim() || null;

  const fieldErrors: MovimientoFormState["fieldErrors"] = {};
  const tipo = TIPOS_MOVIMIENTO.includes(tipoRaw as TipoMovimiento)
    ? (tipoRaw as TipoMovimiento)
    : null;

  if (!tipo) {
    fieldErrors.tipo = "Selecciona un tipo valido";
  }

  const cantidadInput = cantidadRaw !== "" ? parseInt(cantidadRaw, 10) : NaN;
  if (isNaN(cantidadInput) || cantidadInput <= 0) {
    fieldErrors.cantidad = "La cantidad debe ser un numero entero mayor a cero";
  }

  if (Object.keys(fieldErrors).length > 0 || !tipo) {
    return { fieldErrors };
  }

  const cantidad = tipo === "uso_interno" ? -cantidadInput : cantidadInput;

  try {
    const result = await registrarMovimientoInventario({
      productoId,
      tipo,
      cantidad,
      notas,
    });

    if (!result.ok) return { error: result.error };
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
  const authError = await requireInventoryAdmin("Solo el administrador puede ajustar stock.");
  if (authError) return authError;

  if (!Number.isInteger(delta) || delta === 0) {
    return { error: "El ajuste rapido es invalido." };
  }

  try {
    const result = await ajustarStockRapidoDesdeInput(productoId, delta);
    if (!result.ok) return { error: result.error };
  } catch (error) {
    console.error("Error ajustando stock rapido:", error);
    return { error: "No se pudo actualizar el stock." };
  }

  revalidatePath(`/inventario/${productoId}`);
  revalidatePath("/inventario");
  revalidatePath("/inventario/rotacion");
  revalidatePath("/dashboard");
  return { success: true };
}
