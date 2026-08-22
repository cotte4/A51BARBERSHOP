"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { presupuestoLineas } from "@/db/schema";
import { requireAdminSession } from "@/lib/admin-action";
import { toMoneyNumber } from "@/lib/hangar";
import {
  isPresupuestoCategoria,
  isPresupuestoScope,
  type PresupuestoCategoria,
  type PresupuestoScope,
} from "@/lib/presupuesto";
import {
  getNextOrden,
  getOrCreatePresupuesto,
  touchPresupuesto,
} from "@/lib/presupuesto-server";

export type PresupuestoLineaFormState = {
  error?: string;
  success?: string;
  fieldErrors?: {
    nombre?: string;
    categoria?: string;
    montoEstimado?: string;
  };
};

/**
 * Gate: admin | asesor. A diferencia de las acciones de activos (que usan
 * requireOwnerSession = solo admin), el presupuesto lo carga el asesor, y
 * coincide con el gate de lectura de /negocio/activos.
 */
async function requirePresupuestoAccess() {
  return requireAdminSession();
}

function revalidatePresupuesto() {
  revalidatePath("/negocio/activos");
}

function parseScope(formData: FormData): PresupuestoScope {
  const raw = (formData.get("scope") as string | null)?.trim();
  return isPresupuestoScope(raw) ? raw : "memas";
}

export async function crearLineaPresupuestoAction(
  prevState: PresupuestoLineaFormState,
  formData: FormData
): Promise<PresupuestoLineaFormState> {
  if (!(await requirePresupuestoAccess())) {
    return { error: "No autorizado" };
  }

  const scope = parseScope(formData);
  const nombre = (formData.get("nombre") as string | null)?.trim();
  const categoria = (formData.get("categoria") as string | null)?.trim();
  const montoRaw = (formData.get("montoEstimado") as string | null)?.trim();
  const notas = (formData.get("notas") as string | null)?.trim() || null;

  const fieldErrors: PresupuestoLineaFormState["fieldErrors"] = {};

  if (!nombre) fieldErrors.nombre = "Carga un nombre.";
  if (!isPresupuestoCategoria(categoria)) fieldErrors.categoria = "Elegi una categoria valida.";

  const monto = toMoneyNumber(montoRaw);
  if (monto < 0) fieldErrors.montoEstimado = "El monto no puede ser negativo.";

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  const presupuesto = await getOrCreatePresupuesto(scope);
  const orden = await getNextOrden(presupuesto.id);

  await db.insert(presupuestoLineas).values({
    presupuestoId: presupuesto.id,
    categoria: categoria as PresupuestoCategoria,
    nombre: nombre as string,
    montoEstimado: monto.toFixed(2),
    notas,
    orden,
  });

  await touchPresupuesto(presupuesto.id);
  revalidatePresupuesto();

  return { success: "Linea agregada." };
}

export async function actualizarLineaPresupuestoAction(
  prevState: PresupuestoLineaFormState,
  formData: FormData
): Promise<PresupuestoLineaFormState> {
  if (!(await requirePresupuestoAccess())) {
    return { error: "No autorizado" };
  }

  const scope = parseScope(formData);
  const lineaId = (formData.get("lineaId") as string | null)?.trim();
  const nombre = (formData.get("nombre") as string | null)?.trim();
  const categoria = (formData.get("categoria") as string | null)?.trim();
  const montoRaw = (formData.get("montoEstimado") as string | null)?.trim();
  const notas = (formData.get("notas") as string | null)?.trim() || null;

  if (!lineaId) {
    return { error: "Falta la linea a editar." };
  }

  const fieldErrors: PresupuestoLineaFormState["fieldErrors"] = {};

  if (!nombre) fieldErrors.nombre = "Carga un nombre.";
  if (!isPresupuestoCategoria(categoria)) fieldErrors.categoria = "Elegi una categoria valida.";

  const monto = toMoneyNumber(montoRaw);
  if (monto < 0) fieldErrors.montoEstimado = "El monto no puede ser negativo.";

  if (Object.keys(fieldErrors).length > 0) {
    return { fieldErrors };
  }

  const presupuesto = await getOrCreatePresupuesto(scope);

  // El filtro por presupuestoId evita editar una linea de otro scope.
  const updated = await db
    .update(presupuestoLineas)
    .set({
      categoria: categoria as PresupuestoCategoria,
      nombre: nombre as string,
      montoEstimado: monto.toFixed(2),
      notas,
    })
    .where(
      and(
        eq(presupuestoLineas.id, lineaId),
        eq(presupuestoLineas.presupuestoId, presupuesto.id)
      )
    )
    .returning({ id: presupuestoLineas.id });

  if (updated.length === 0) {
    return { error: "No encontramos esa linea." };
  }

  await touchPresupuesto(presupuesto.id);
  revalidatePresupuesto();

  return { success: "Linea actualizada." };
}

export async function borrarLineaPresupuestoAction(formData: FormData) {
  if (!(await requirePresupuestoAccess())) {
    return;
  }

  const scope = parseScope(formData);
  const lineaId = (formData.get("lineaId") as string | null)?.trim();

  if (!lineaId) {
    return;
  }

  const presupuesto = await getOrCreatePresupuesto(scope);

  await db
    .delete(presupuestoLineas)
    .where(
      and(
        eq(presupuestoLineas.id, lineaId),
        eq(presupuestoLineas.presupuestoId, presupuesto.id)
      )
    );

  await touchPresupuesto(presupuesto.id);
  revalidatePresupuesto();
}
