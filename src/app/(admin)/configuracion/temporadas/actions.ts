"use server";

import { db } from "@/db";
import { temporadas } from "@/db/schema";
import { requireAdminSession } from "@/lib/admin-action";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type TemporadaFormState = {
  error?: string;
  fieldErrors?: {
    nombre?: string;
    fechaInicio?: string;
    fechaFin?: string;
  };
};

export async function crearTemporada(
  prevState: TemporadaFormState,
  formData: FormData
): Promise<TemporadaFormState> {
  if (!(await requireAdminSession())) {
    return { error: "Solo el administrador puede gestionar temporadas." };
  }

  const nombre = formData.get("nombre") as string;
  const fechaInicio = formData.get("fechaInicio") as string;
  const fechaFin = (formData.get("fechaFin") as string) || "";
  const cortesDiaStr = (formData.get("cortesDiaProyectados") as string) || "";
  const precioBaseStr = (formData.get("precioBaseProyectado") as string) || "";

  const fieldErrors: TemporadaFormState["fieldErrors"] = {};

  if (!nombre || nombre.trim() === "") {
    fieldErrors.nombre = "El nombre es requerido";
  }

  if (!fechaInicio || fechaInicio.trim() === "") {
    fieldErrors.fechaInicio = "La fecha de inicio es requerida";
  }

  if (fechaFin && fechaInicio) {
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    if (!isNaN(inicio.getTime()) && !isNaN(fin.getTime()) && fin < inicio) {
      fieldErrors.fechaFin = "La fecha de fin no puede ser anterior a la de inicio";
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  const cortesDia =
    cortesDiaStr !== "" && !isNaN(Number(cortesDiaStr))
      ? Number(cortesDiaStr)
      : null;

  try {
    await db.insert(temporadas).values({
      nombre: nombre.trim(),
      fechaInicio,
      fechaFin: fechaFin !== "" ? fechaFin : null,
      cortesDiaProyectados: cortesDia,
      precioBaseProyectado: precioBaseStr !== "" ? precioBaseStr : null,
    });
  } catch {
    return { error: "No se pudo guardar la temporada. Intentá de nuevo." };
  }

  revalidatePath("/configuracion/temporadas");
  revalidatePath("/dashboard/temporadas");
  redirect("/configuracion/temporadas");
}

export async function actualizarTemporada(
  id: string,
  prevState: TemporadaFormState,
  formData: FormData
): Promise<TemporadaFormState> {
  if (!(await requireAdminSession())) {
    return { error: "Solo el administrador puede gestionar temporadas." };
  }

  const nombre = formData.get("nombre") as string;
  const fechaInicio = formData.get("fechaInicio") as string;
  const fechaFin = (formData.get("fechaFin") as string) || "";
  const cortesDiaStr = (formData.get("cortesDiaProyectados") as string) || "";
  const precioBaseStr = (formData.get("precioBaseProyectado") as string) || "";

  const fieldErrors: TemporadaFormState["fieldErrors"] = {};

  if (!nombre || nombre.trim() === "") {
    fieldErrors.nombre = "El nombre es requerido";
  }

  if (!fechaInicio || fechaInicio.trim() === "") {
    fieldErrors.fechaInicio = "La fecha de inicio es requerida";
  }

  if (fechaFin && fechaInicio) {
    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);
    if (!isNaN(inicio.getTime()) && !isNaN(fin.getTime()) && fin < inicio) {
      fieldErrors.fechaFin = "La fecha de fin no puede ser anterior a la de inicio";
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  const cortesDia =
    cortesDiaStr !== "" && !isNaN(Number(cortesDiaStr))
      ? Number(cortesDiaStr)
      : null;

  try {
    await db
      .update(temporadas)
      .set({
        nombre: nombre.trim(),
        fechaInicio,
        fechaFin: fechaFin !== "" ? fechaFin : null,
        cortesDiaProyectados: cortesDia,
        precioBaseProyectado: precioBaseStr !== "" ? precioBaseStr : null,
      })
      .where(eq(temporadas.id, id));
  } catch {
    return { error: "No se pudo actualizar la temporada. Intentá de nuevo." };
  }

  revalidatePath("/configuracion/temporadas");
  revalidatePath("/dashboard/temporadas");
  redirect("/configuracion/temporadas");
}

export async function eliminarTemporada(id: string): Promise<void> {
  if (!(await requireAdminSession())) {
    redirect("/configuracion/temporadas");
  }

  await db.delete(temporadas).where(eq(temporadas.id, id));

  revalidatePath("/configuracion/temporadas");
  revalidatePath("/dashboard/temporadas");
  redirect("/configuracion/temporadas");
}
