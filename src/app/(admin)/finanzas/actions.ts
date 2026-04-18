"use server";

import { db } from "@/db";
import {
  barberShopAssetPayments,
  capitalMovimientos,
  costosFijosNegocio,
  costosFijosValores,
} from "@/db/schema";
import { requireAsesorSession } from "@/lib/asesor-action";
import { isCapitalMovimientoLinkedToHangar } from "@/lib/hangar-server";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// ——————————————————————————————
// COSTOS FIJOS (ítems base)
// ——————————————————————————————

export type CostoFormState = {
  error?: string;
  fieldErrors?: {
    nombre?: string;
    categoria?: string;
    montoMesActual?: string;
  };
};

export async function crearCosto(
  prevState: CostoFormState,
  formData: FormData
): Promise<CostoFormState> {
  if (!(await requireAsesorSession())) {
    return { error: "Sin permisos para gestionar costos." };
  }

  const nombre = (formData.get("nombre") as string)?.trim();
  const categoria = (formData.get("categoria") as string)?.trim();
  const notas = (formData.get("notas") as string)?.trim() || null;
  const montoStr = (formData.get("montoMesActual") as string)?.trim();

  const fieldErrors: CostoFormState["fieldErrors"] = {};
  if (!nombre) fieldErrors.nombre = "El nombre es requerido";
  if (!categoria) fieldErrors.categoria = "La categoría es requerida";
  if (montoStr && (isNaN(Number(montoStr)) || Number(montoStr) < 0))
    fieldErrors.montoMesActual = "Ingresá un monto válido";

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  try {
    const [created] = await db
      .insert(costosFijosNegocio)
      .values({ nombre, categoria, notas })
      .returning({ id: costosFijosNegocio.id });

    if (montoStr && Number(montoStr) >= 0 && created) {
      const mesActual = new Date()
        .toLocaleDateString("en-CA", { timeZone: "America/Argentina/Buenos_Aires" })
        .slice(0, 7);
      await db.insert(costosFijosValores).values({
        costoId: created.id,
        mes: mesActual,
        monto: montoStr,
      });
    }
  } catch {
    return { error: "No se pudo guardar el costo. Intentá de nuevo." };
  }

  revalidatePath("/finanzas");
  redirect("/finanzas");
}

export async function editarCosto(
  id: string,
  prevState: CostoFormState,
  formData: FormData
): Promise<CostoFormState> {
  if (!(await requireAsesorSession())) {
    return { error: "Sin permisos para gestionar costos." };
  }

  const nombre = (formData.get("nombre") as string)?.trim();
  const categoria = (formData.get("categoria") as string)?.trim();
  const notas = (formData.get("notas") as string)?.trim() || null;

  const fieldErrors: CostoFormState["fieldErrors"] = {};
  if (!nombre) fieldErrors.nombre = "El nombre es requerido";
  if (!categoria) fieldErrors.categoria = "La categoría es requerida";

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  try {
    await db
      .update(costosFijosNegocio)
      .set({ nombre, categoria, notas, updatedAt: new Date() })
      .where(eq(costosFijosNegocio.id, id));
  } catch {
    return { error: "No se pudo actualizar el costo. Intentá de nuevo." };
  }

  revalidatePath("/finanzas");
  redirect("/finanzas");
}

export async function eliminarCosto(id: string): Promise<void> {
  if (!(await requireAsesorSession())) return;
  await db.delete(costosFijosNegocio).where(eq(costosFijosNegocio.id, id));
  revalidatePath("/finanzas");
  redirect("/finanzas");
}

// ——————————————————————————————
// VALORES MENSUALES
// ——————————————————————————————

export type ValoresMesFormState = {
  error?: string;
  success?: boolean;
};

export async function guardarValoresMes(
  mes: string,
  prevState: ValoresMesFormState,
  formData: FormData
): Promise<ValoresMesFormState> {
  if (!(await requireAsesorSession())) {
    return { error: "Sin permisos para editar valores." };
  }

  const costos = await db.select({ id: costosFijosNegocio.id }).from(costosFijosNegocio);

  try {
    for (const costo of costos) {
      const raw = (formData.get(`monto_${costo.id}`) as string)?.trim();
      const monto = raw !== "" && raw !== undefined ? raw : null;

      if (monto === null) {
        // Si borraron el valor, eliminar la entrada de ese mes
        await db
          .delete(costosFijosValores)
          .where(
            and(eq(costosFijosValores.costoId, costo.id), eq(costosFijosValores.mes, mes))
          );
        continue;
      }

      // Upsert
      await db
        .insert(costosFijosValores)
        .values({ costoId: costo.id, mes, monto })
        .onConflictDoUpdate({
          target: [costosFijosValores.costoId, costosFijosValores.mes],
          set: { monto, updatedAt: new Date() },
        });
    }
  } catch {
    return { error: "No se pudieron guardar los valores. Intentá de nuevo." };
  }

  revalidatePath("/finanzas");
  return { success: true };
}

export async function copiarMesAnterior(mesActual: string): Promise<void> {
  if (!(await requireAsesorSession())) return;

  const [year, month] = mesActual.split("-").map(Number);
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  const mesPrev = `${prevYear}-${String(prevMonth).padStart(2, "0")}`;

  const valoresPrev = await db
    .select()
    .from(costosFijosValores)
    .where(eq(costosFijosValores.mes, mesPrev));

  if (valoresPrev.length === 0) {
    revalidatePath("/finanzas");
    redirect(`/finanzas?mes=${mesActual}`);
  }

  for (const val of valoresPrev) {
    await db
      .insert(costosFijosValores)
      .values({ costoId: val.costoId, mes: mesActual, monto: val.monto })
      .onConflictDoUpdate({
        target: [costosFijosValores.costoId, costosFijosValores.mes],
        set: { monto: val.monto, updatedAt: new Date() },
      });
  }

  revalidatePath("/finanzas");
  redirect(`/finanzas/mes/${mesActual}/editar`);
}

// ——————————————————————————————
// CAPITAL E INVERSIÓN
// ——————————————————————————————

export type MovimientoFormState = {
  error?: string;
  fieldErrors?: {
    fecha?: string;
    tipo?: string;
    monto?: string;
  };
};

export async function crearMovimiento(
  prevState: MovimientoFormState,
  formData: FormData
): Promise<MovimientoFormState> {
  if (!(await requireAsesorSession())) {
    return { error: "Sin permisos para registrar movimientos." };
  }

  const fecha = (formData.get("fecha") as string)?.trim();
  const tipo = (formData.get("tipo") as string)?.trim();
  const montoStr = (formData.get("monto") as string)?.trim();
  const descripcion = (formData.get("descripcion") as string)?.trim() || null;

  const fieldErrors: MovimientoFormState["fieldErrors"] = {};
  if (!fecha) fieldErrors.fecha = "La fecha es requerida";
  if (!tipo || !["aporte", "retiro", "inversion_activo"].includes(tipo)) {
    fieldErrors.tipo = "Selecciona un tipo";
  }
  if (!montoStr || isNaN(Number(montoStr)) || Number(montoStr) <= 0)
    fieldErrors.monto = "Ingresá un monto mayor a 0";

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  try {
    await db.insert(capitalMovimientos).values({ fecha, tipo, monto: montoStr, descripcion });
  } catch {
    return { error: "No se pudo registrar el movimiento. Intentá de nuevo." };
  }

  revalidatePath("/finanzas");
  redirect("/finanzas");
}

export async function editarMovimiento(
  id: string,
  prevState: MovimientoFormState,
  formData: FormData
): Promise<MovimientoFormState> {
  if (!(await requireAsesorSession())) {
    return { error: "Sin permisos para editar movimientos." };
  }

  if (await isCapitalMovimientoLinkedToHangar(id)) {
    return { error: "Este movimiento viene de Hangar. Editalo desde el activo." };
  }

  const fecha = (formData.get("fecha") as string)?.trim();
  const tipo = (formData.get("tipo") as string)?.trim();
  const montoStr = (formData.get("monto") as string)?.trim();
  const descripcion = (formData.get("descripcion") as string)?.trim() || null;

  const fieldErrors: MovimientoFormState["fieldErrors"] = {};
  if (!fecha) fieldErrors.fecha = "La fecha es requerida";
  if (!tipo || !["aporte", "retiro", "inversion_activo"].includes(tipo)) {
    fieldErrors.tipo = "Selecciona un tipo";
  }
  if (!montoStr || isNaN(Number(montoStr)) || Number(montoStr) <= 0)
    fieldErrors.monto = "Ingresá un monto mayor a 0";

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  try {
    await db
      .update(capitalMovimientos)
      .set({ fecha, tipo, monto: montoStr, descripcion })
      .where(eq(capitalMovimientos.id, id));
  } catch {
    return { error: "No se pudo actualizar el movimiento. Intentá de nuevo." };
  }

  revalidatePath("/finanzas");
  redirect("/finanzas");
}

export async function eliminarMovimiento(id: string): Promise<void> {
  if (!(await requireAsesorSession())) return;
  const linkedPayment = await db.query.barberShopAssetPayments.findFirst({
    where: eq(barberShopAssetPayments.capitalMovimientoId, id),
  });
  if (linkedPayment) {
    revalidatePath("/finanzas");
    redirect("/finanzas");
  }
  await db.delete(capitalMovimientos).where(eq(capitalMovimientos.id, id));
  revalidatePath("/finanzas");
  redirect("/finanzas");
}
