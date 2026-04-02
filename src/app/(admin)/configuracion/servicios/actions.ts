"use server";

import { db } from "@/db";
import { servicios, serviciosAdicionales, serviciosPreciosHistorial } from "@/db/schema";
import { requireAdminSession } from "@/lib/admin-action";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type ServicioFormState = {
  error?: string;
  fieldErrors?: {
    nombre?: string;
    precioBase?: string;
    duracionMinutos?: string;
  };
};

export async function crearServicio(
  prevState: ServicioFormState,
  formData: FormData
): Promise<ServicioFormState> {
  if (!(await requireAdminSession())) {
    return { error: "Solo el administrador puede gestionar servicios." };
  }

  const nombre = formData.get("nombre") as string;
  const precioBaseStr = formData.get("precioBase") as string;
  const duracionMinutosStr = formData.get("duracionMinutos") as string;

  const fieldErrors: ServicioFormState["fieldErrors"] = {};

  if (!nombre || nombre.trim() === "") {
    fieldErrors.nombre = "El nombre es requerido";
  }
  if (!precioBaseStr || isNaN(Number(precioBaseStr))) {
    fieldErrors.precioBase = "El precio es requerido";
  } else if (Number(precioBaseStr) <= 0) {
    fieldErrors.precioBase = "El precio debe ser mayor a $0";
  }
  if (!duracionMinutosStr || ![30, 45, 60].includes(Number(duracionMinutosStr))) {
    fieldErrors.duracionMinutos = "La duracion debe ser 30, 45 o 60 minutos";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  try {
    const [nuevoServicio] = await db
      .insert(servicios)
      .values({
        nombre: nombre.trim(),
        precioBase: precioBaseStr,
        duracionMinutos: Number(duracionMinutosStr),
        activo: true,
      })
      .returning();

    // Crear primer registro de historial de precios
    await db.insert(serviciosPreciosHistorial).values({
      servicioId: nuevoServicio.id,
      precio: precioBaseStr,
      vigenteDesdе: new Date().toISOString().split("T")[0],
      motivo: "Precio inicial",
    });
  } catch {
    return { error: "No se pudo guardar el servicio. Revisá los datos e intentá de nuevo." };
  }

  revalidatePath("/configuracion/servicios");
  redirect("/configuracion/servicios");
}

export async function editarServicio(
  id: string,
  prevState: ServicioFormState,
  formData: FormData
): Promise<ServicioFormState> {
  if (!(await requireAdminSession())) {
    return { error: "Solo el administrador puede gestionar servicios." };
  }

  const nombre = formData.get("nombre") as string;
  const precioBaseStr = formData.get("precioBase") as string;
  const duracionMinutosStr = formData.get("duracionMinutos") as string;
  const motivoCambioPrecio = formData.get("motivoCambioPrecio") as string;
  const precioCambioStr = formData.get("precioCambio") as string; // solo presente si cambió

  const fieldErrors: ServicioFormState["fieldErrors"] = {};

  if (!nombre || nombre.trim() === "") {
    fieldErrors.nombre = "El nombre es requerido";
  }
  if (!precioBaseStr || isNaN(Number(precioBaseStr))) {
    fieldErrors.precioBase = "El precio es requerido";
  } else if (Number(precioBaseStr) <= 0) {
    fieldErrors.precioBase = "El precio debe ser mayor a $0";
  }
  if (!duracionMinutosStr || ![30, 45, 60].includes(Number(duracionMinutosStr))) {
    fieldErrors.duracionMinutos = "La duracion debe ser 30, 45 o 60 minutos";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  try {
    // Obtener precio actual para comparar
    const [servicioActual] = await db
      .select()
      .from(servicios)
      .where(eq(servicios.id, id))
      .limit(1);

    const precioActual = Number(servicioActual?.precioBase ?? 0);
    const precioNuevo = Number(precioBaseStr);

    // Actualizar servicio
    await db
      .update(servicios)
      .set({
        nombre: nombre.trim(),
        precioBase: precioBaseStr,
        duracionMinutos: Number(duracionMinutosStr),
      })
      .where(eq(servicios.id, id));

    // Si el precio cambió, crear registro en historial
    if (Math.abs(precioActual - precioNuevo) > 0.001) {
      await db.insert(serviciosPreciosHistorial).values({
        servicioId: id,
        precio: precioBaseStr,
        vigenteDesdе: new Date().toISOString().split("T")[0],
        motivo: motivoCambioPrecio?.trim() || null,
      });
    }
  } catch {
    return { error: "No se pudo actualizar el servicio. Intentá de nuevo." };
  }

  revalidatePath("/configuracion/servicios");
  redirect("/configuracion/servicios");
}

export async function toggleActivoServicio(id: string, activo: boolean) {
  if (!(await requireAdminSession())) {
    return;
  }

  await db
    .update(servicios)
    .set({ activo: !activo })
    .where(eq(servicios.id, id));

  revalidatePath("/configuracion/servicios");
  revalidatePath("/caja/nueva");
}

// Acciones para adicionales
export type AdicionalFormState = {
  error?: string;
  success?: boolean;
};

export async function crearAdicional(
  servicioId: string,
  prevState: AdicionalFormState,
  formData: FormData
): Promise<AdicionalFormState> {
  if (!(await requireAdminSession())) {
    return { error: "Solo el administrador puede gestionar servicios." };
  }

  const nombre = formData.get("nombre") as string;
  const precioExtraStr = formData.get("precioExtra") as string;

  if (!nombre || nombre.trim() === "") {
    return { error: "El nombre del adicional es requerido" };
  }
  if (!precioExtraStr || isNaN(Number(precioExtraStr)) || Number(precioExtraStr) < 0) {
    return { error: "El precio extra debe ser 0 o mayor" };
  }

  try {
    await db.insert(serviciosAdicionales).values({
      servicioId,
      nombre: nombre.trim(),
      precioExtra: precioExtraStr,
    });
  } catch {
    return { error: "No se pudo guardar el adicional." };
  }

  revalidatePath(`/configuracion/servicios/${servicioId}/editar`);
  return { success: true };
}

export async function eliminarAdicional(id: string, servicioId: string) {
  if (!(await requireAdminSession())) {
    return;
  }

  await db
    .delete(serviciosAdicionales)
    .where(eq(serviciosAdicionales.id, id));

  revalidatePath(`/configuracion/servicios/${servicioId}/editar`);
  revalidatePath("/caja/nueva");
}
