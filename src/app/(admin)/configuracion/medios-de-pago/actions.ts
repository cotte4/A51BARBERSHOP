"use server";

import { db } from "@/db";
import { mediosPago } from "@/db/schema";
import { requireAdminSession } from "@/lib/admin-action";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type MedioPagoFormState = {
  error?: string;
  fieldErrors?: {
    nombre?: string;
    comisionPorcentaje?: string;
  };
};

export async function crearMedioPago(
  prevState: MedioPagoFormState,
  formData: FormData
): Promise<MedioPagoFormState> {
  if (!(await requireAdminSession())) {
    return { error: "Solo el administrador puede gestionar medios de pago." };
  }

  const nombre = formData.get("nombre") as string;
  const comisionStr = (formData.get("comisionPorcentaje") as string) || "0";

  const fieldErrors: MedioPagoFormState["fieldErrors"] = {};

  if (!nombre || nombre.trim() === "") {
    fieldErrors.nombre = "El nombre es requerido";
  }

  const comisionNum = comisionStr === "" ? 0 : Number(comisionStr);
  if (isNaN(comisionNum)) {
    fieldErrors.comisionPorcentaje = "Debe ser un número válido";
  } else if (comisionNum < 0) {
    fieldErrors.comisionPorcentaje = "No puede ser negativo";
  } else if (comisionNum > 100) {
    fieldErrors.comisionPorcentaje = "No puede superar el 100%";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  try {
    await db.insert(mediosPago).values({
      nombre: nombre.trim(),
      comisionPorcentaje: String(comisionNum),
      activo: true,
    });
  } catch {
    return { error: "No se pudo guardar el medio de pago. Intentá de nuevo." };
  }

  revalidatePath("/configuracion/medios-de-pago");
  redirect("/configuracion/medios-de-pago");
}

export async function editarMedioPago(
  id: string,
  prevState: MedioPagoFormState,
  formData: FormData
): Promise<MedioPagoFormState> {
  if (!(await requireAdminSession())) {
    return { error: "Solo el administrador puede gestionar medios de pago." };
  }

  const nombre = formData.get("nombre") as string;
  const comisionStr = (formData.get("comisionPorcentaje") as string) || "0";

  const fieldErrors: MedioPagoFormState["fieldErrors"] = {};

  if (!nombre || nombre.trim() === "") {
    fieldErrors.nombre = "El nombre es requerido";
  }

  const comisionNum = comisionStr === "" ? 0 : Number(comisionStr);
  if (isNaN(comisionNum)) {
    fieldErrors.comisionPorcentaje = "Debe ser un número válido";
  } else if (comisionNum < 0) {
    fieldErrors.comisionPorcentaje = "No puede ser negativo";
  } else if (comisionNum > 100) {
    fieldErrors.comisionPorcentaje = "No puede superar el 100%";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  try {
    await db
      .update(mediosPago)
      .set({
        nombre: nombre.trim(),
        comisionPorcentaje: String(comisionNum),
      })
      .where(eq(mediosPago.id, id));
  } catch {
    return { error: "No se pudo actualizar el medio de pago. Intentá de nuevo." };
  }

  revalidatePath("/configuracion/medios-de-pago");
  redirect("/configuracion/medios-de-pago");
}

export async function toggleActivoMedioPago(id: string, activo: boolean) {
  if (!(await requireAdminSession())) {
    return;
  }

  await db
    .update(mediosPago)
    .set({ activo: !activo })
    .where(eq(mediosPago.id, id));

  revalidatePath("/configuracion/medios-de-pago");
  revalidatePath("/caja/nueva");
  revalidatePath("/caja/vender");
}
