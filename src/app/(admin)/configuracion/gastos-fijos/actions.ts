"use server";

import { db } from "@/db";
import { gastos } from "@/db/schema";
import { requireAdminSession } from "@/lib/admin-action";
import { hasGastosRapidosSchema } from "@/lib/gastos-rapidos-server";
import { and, eq, isNull, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type GastoFormState = {
  error?: string;
  fieldErrors?: {
    descripcion?: string;
    monto?: string;
    fecha?: string;
    categoriaId?: string;
    frecuencia?: string;
  };
};

export async function crearGasto(
  prevState: GastoFormState,
  formData: FormData
): Promise<GastoFormState> {
  if (!(await requireAdminSession())) {
    return { error: "Solo el administrador puede gestionar gastos." };
  }

  const descripcion = formData.get("descripcion") as string;
  const montoStr = formData.get("monto") as string;
  const fecha = formData.get("fecha") as string;
  const categoriaId = (formData.get("categoriaId") as string) || "";
  const esRecurrenteRaw = formData.get("esRecurrente") as string;
  const frecuencia = formData.get("frecuencia") as string;
  const notas = (formData.get("notas") as string) || "";

  const fieldErrors: GastoFormState["fieldErrors"] = {};

  if (!descripcion || descripcion.trim() === "") {
    fieldErrors.descripcion = "La descripción es requerida";
  }

  if (!montoStr || montoStr.trim() === "") {
    fieldErrors.monto = "El monto es requerido";
  } else if (isNaN(Number(montoStr)) || Number(montoStr) <= 0) {
    fieldErrors.monto = "El monto debe ser mayor a 0";
  }

  if (!fecha || fecha.trim() === "") {
    fieldErrors.fecha = "La fecha es requerida";
  }

  const esRecurrente = esRecurrenteRaw === "on";
  const hasQuickExpenseColumns = await hasGastosRapidosSchema();

  if (esRecurrente && (!frecuencia || frecuencia.trim() === "")) {
    fieldErrors.frecuencia = "La frecuencia es requerida si el gasto es recurrente";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  try {
    await db.insert(gastos).values({
      descripcion: descripcion.trim(),
      monto: montoStr,
      fecha,
      categoriaId: categoriaId !== "" ? categoriaId : null,
      esRecurrente,
      frecuencia: esRecurrente && frecuencia ? frecuencia : null,
      notas: notas.trim() !== "" ? notas.trim() : null,
      ...(hasQuickExpenseColumns ? { tipo: "fijo" as const, categoriaVisual: null } : {}),
    });
  } catch {
    return { error: "No se pudo guardar el gasto. Intentá de nuevo." };
  }

  revalidatePath("/configuracion/gastos-fijos");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/flujo");
  revalidatePath("/dashboard/pl");
  redirect("/configuracion/gastos-fijos");
}

export async function editarGasto(
  id: string,
  prevState: GastoFormState,
  formData: FormData
): Promise<GastoFormState> {
  if (!(await requireAdminSession())) {
    return { error: "Solo el administrador puede gestionar gastos." };
  }

  const descripcion = formData.get("descripcion") as string;
  const montoStr = formData.get("monto") as string;
  const fecha = formData.get("fecha") as string;
  const categoriaId = (formData.get("categoriaId") as string) || "";
  const esRecurrenteRaw = formData.get("esRecurrente") as string;
  const frecuencia = formData.get("frecuencia") as string;
  const notas = (formData.get("notas") as string) || "";

  const fieldErrors: GastoFormState["fieldErrors"] = {};

  if (!descripcion || descripcion.trim() === "") {
    fieldErrors.descripcion = "La descripción es requerida";
  }

  if (!montoStr || montoStr.trim() === "") {
    fieldErrors.monto = "El monto es requerido";
  } else if (isNaN(Number(montoStr)) || Number(montoStr) <= 0) {
    fieldErrors.monto = "El monto debe ser mayor a 0";
  }

  if (!fecha || fecha.trim() === "") {
    fieldErrors.fecha = "La fecha es requerida";
  }

  const esRecurrente = esRecurrenteRaw === "on";
  const hasQuickExpenseColumns = await hasGastosRapidosSchema();

  if (esRecurrente && (!frecuencia || frecuencia.trim() === "")) {
    fieldErrors.frecuencia = "La frecuencia es requerida si el gasto es recurrente";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  try {
    await db
      .update(gastos)
      .set({
        descripcion: descripcion.trim(),
        monto: montoStr,
        fecha,
        categoriaId: categoriaId !== "" ? categoriaId : null,
        esRecurrente,
        frecuencia: esRecurrente && frecuencia ? frecuencia : null,
        notas: notas.trim() !== "" ? notas.trim() : null,
        ...(hasQuickExpenseColumns ? { tipo: "fijo" as const, categoriaVisual: null } : {}),
      })
      .where(
        hasQuickExpenseColumns
          ? and(eq(gastos.id, id), or(eq(gastos.tipo, "fijo"), isNull(gastos.tipo)))
          : eq(gastos.id, id)
      );
  } catch {
    return { error: "No se pudo actualizar el gasto. Intentá de nuevo." };
  }

  revalidatePath("/configuracion/gastos-fijos");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/flujo");
  revalidatePath("/dashboard/pl");
  redirect("/configuracion/gastos-fijos");
}

export async function eliminarGasto(id: string): Promise<void> {
  if (!(await requireAdminSession())) {
    redirect("/configuracion/gastos-fijos");
  }

  const hasQuickExpenseColumns = await hasGastosRapidosSchema();

  await db
    .delete(gastos)
    .where(
      hasQuickExpenseColumns
        ? and(eq(gastos.id, id), or(eq(gastos.tipo, "fijo"), isNull(gastos.tipo)))
        : eq(gastos.id, id)
    );

  revalidatePath("/configuracion/gastos-fijos");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/flujo");
  revalidatePath("/dashboard/pl");
  redirect("/configuracion/gastos-fijos");
}
