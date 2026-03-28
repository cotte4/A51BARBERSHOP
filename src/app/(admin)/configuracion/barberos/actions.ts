"use server";

import { db } from "@/db";
import { barberos } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type BarberoFormState = {
  error?: string;
  fieldErrors?: {
    nombre?: string;
    rol?: string;
    tipoModelo?: string;
    porcentajeComision?: string;
    alquilerBancoMensual?: string;
    sueldoMinimoGarantizado?: string;
  };
};

export async function crearBarbero(
  prevState: BarberoFormState,
  formData: FormData
): Promise<BarberoFormState> {
  const nombre = formData.get("nombre") as string;
  const rol = formData.get("rol") as string;
  const tipoModelo = formData.get("tipoModelo") as string;
  const porcentajeComisionStr = formData.get("porcentajeComision") as string;
  const alquilerBancoStr = formData.get("alquilerBancoMensual") as string;
  const sueldoMinimoStr = formData.get("sueldoMinimoGarantizado") as string;

  // Validaciones
  const fieldErrors: BarberoFormState["fieldErrors"] = {};

  if (!nombre || nombre.trim() === "") {
    fieldErrors.nombre = "El nombre es requerido";
  }
  if (!rol || !["admin", "barbero"].includes(rol)) {
    fieldErrors.rol = "El rol es requerido";
  }
  if (!tipoModelo || !["variable", "hibrido", "fijo"].includes(tipoModelo)) {
    fieldErrors.tipoModelo = "El tipo de modelo es requerido";
  }
  if (!porcentajeComisionStr || isNaN(Number(porcentajeComisionStr))) {
    fieldErrors.porcentajeComision = "El porcentaje de comisión es requerido";
  } else if (Number(porcentajeComisionStr) < 0 || Number(porcentajeComisionStr) > 100) {
    fieldErrors.porcentajeComision = "Debe ser entre 0 y 100";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  try {
    await db.insert(barberos).values({
      nombre: nombre.trim(),
      rol,
      tipoModelo,
      porcentajeComision: porcentajeComisionStr,
      alquilerBancoMensual: alquilerBancoStr && alquilerBancoStr !== "" ? alquilerBancoStr : null,
      sueldoMinimoGarantizado: sueldoMinimoStr && sueldoMinimoStr !== "" ? sueldoMinimoStr : null,
      activo: true,
    });
  } catch {
    return { error: "No se pudo guardar el barbero. Revisá los datos e intentá de nuevo." };
  }

  revalidatePath("/configuracion/barberos");
  redirect("/configuracion/barberos");
}

export async function editarBarbero(
  id: string,
  prevState: BarberoFormState,
  formData: FormData
): Promise<BarberoFormState> {
  const nombre = formData.get("nombre") as string;
  const rol = formData.get("rol") as string;
  const tipoModelo = formData.get("tipoModelo") as string;
  const porcentajeComisionStr = formData.get("porcentajeComision") as string;
  const alquilerBancoStr = formData.get("alquilerBancoMensual") as string;
  const sueldoMinimoStr = formData.get("sueldoMinimoGarantizado") as string;

  const fieldErrors: BarberoFormState["fieldErrors"] = {};

  if (!nombre || nombre.trim() === "") {
    fieldErrors.nombre = "El nombre es requerido";
  }
  if (!rol || !["admin", "barbero"].includes(rol)) {
    fieldErrors.rol = "El rol es requerido";
  }
  if (!tipoModelo || !["variable", "hibrido", "fijo"].includes(tipoModelo)) {
    fieldErrors.tipoModelo = "El tipo de modelo es requerido";
  }
  if (!porcentajeComisionStr || isNaN(Number(porcentajeComisionStr))) {
    fieldErrors.porcentajeComision = "El porcentaje de comisión es requerido";
  } else if (Number(porcentajeComisionStr) < 0 || Number(porcentajeComisionStr) > 100) {
    fieldErrors.porcentajeComision = "Debe ser entre 0 y 100";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  try {
    await db
      .update(barberos)
      .set({
        nombre: nombre.trim(),
        rol,
        tipoModelo,
        porcentajeComision: porcentajeComisionStr,
        alquilerBancoMensual: alquilerBancoStr && alquilerBancoStr !== "" ? alquilerBancoStr : null,
        sueldoMinimoGarantizado: sueldoMinimoStr && sueldoMinimoStr !== "" ? sueldoMinimoStr : null,
      })
      .where(eq(barberos.id, id));
  } catch {
    return { error: "No se pudo actualizar el barbero. Intentá de nuevo." };
  }

  revalidatePath("/configuracion/barberos");
  redirect("/configuracion/barberos");
}

export async function toggleActivoBarbero(id: string, activo: boolean) {
  await db
    .update(barberos)
    .set({ activo: !activo })
    .where(eq(barberos.id, id));

  revalidatePath("/configuracion/barberos");
}
