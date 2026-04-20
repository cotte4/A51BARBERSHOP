"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminActorContext } from "@/lib/dal/authz";
import {
  generarLiquidacionDesdeInput,
  marcarLiquidacionPagada,
} from "@/lib/liquidaciones-service";

export type LiquidacionFormState = {
  error?: string;
  fieldErrors?: {
    barberoId?: string;
    periodoInicio?: string;
    periodoFin?: string;
  };
};

export type MarcarPagadaState = { error?: string };

export async function generarLiquidacion(
  prevState: LiquidacionFormState,
  formData: FormData
): Promise<LiquidacionFormState> {
  const actor = await getAdminActorContext();
  if (!actor) return { error: "Solo el administrador puede generar liquidaciones." };

  const barberoId = formData.get("barberoId") as string;
  const periodoInicio = formData.get("periodoInicio") as string;
  const periodoFin = formData.get("periodoFin") as string;
  const notas = formData.get("notas") as string | null;

  const fieldErrors: LiquidacionFormState["fieldErrors"] = {};
  if (!barberoId) fieldErrors.barberoId = "Selecciona un barbero";
  if (!periodoInicio) fieldErrors.periodoInicio = "La fecha de inicio es requerida";
  if (!periodoFin) fieldErrors.periodoFin = "La fecha de fin es requerida";
  if (periodoInicio && periodoFin && periodoInicio > periodoFin) {
    fieldErrors.periodoFin = "La fecha de fin debe ser posterior al inicio";
  }
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  let liquidacionId: string;

  try {
    const result = await generarLiquidacionDesdeInput({
      barberoId,
      periodoInicio,
      periodoFin,
      notas,
    });

    if (!result.ok) return { error: result.error };

    liquidacionId = result.id;
  } catch (error) {
    console.error("Error generando liquidacion:", error);
    return { error: "No se pudo generar la liquidacion. Intenta de nuevo." };
  }

  revalidatePath("/liquidaciones");
  redirect(`/liquidaciones/${liquidacionId}`);
}

export async function marcarPagada(
  id: string,
  prevState: MarcarPagadaState,
  formData: FormData
): Promise<MarcarPagadaState> {
  const actor = await getAdminActorContext();
  if (!actor) return { error: "Solo el administrador puede marcar liquidaciones como pagadas." };

  try {
    const result = await marcarLiquidacionPagada(id);
    if (!result.ok) return { error: result.error };
  } catch (error) {
    console.error("Error marcando liquidacion:", error);
    return { error: "No se pudo actualizar. Intenta de nuevo." };
  }

  revalidatePath(`/liquidaciones/${id}`);
  revalidatePath("/liquidaciones");
  return {};
}
