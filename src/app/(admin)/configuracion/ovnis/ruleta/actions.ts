"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ovnisRuletaPrizes } from "@/db/schema";
import { getAdminActorContext } from "@/lib/dal/authz";

type RuletaPrizeData = {
  label: string;
  type: "ovnis" | "redemption_item" | "nada";
  ovnisAmount: number;
  redemptionItemId?: string | null;
  weight: number;
};

export async function createRuletaPrizeAction(
  data: RuletaPrizeData
): Promise<{ success: true } | { success: false; error: string }> {
  const ctx = await getAdminActorContext();
  if (!ctx) return { success: false, error: "No autorizado" };

  if (!data.label.trim()) return { success: false, error: "El nombre es requerido" };
  if (data.weight <= 0) return { success: false, error: "El peso debe ser mayor a 0" };

  try {
    await db.insert(ovnisRuletaPrizes).values({
      label: data.label.trim(),
      type: data.type,
      ovnisAmount: data.ovnisAmount,
      redemptionItemId: data.redemptionItemId ?? null,
      weight: data.weight,
      activo: true,
    });
    revalidatePath("/configuracion/ovnis/ruleta");
    return { success: true };
  } catch {
    return { success: false, error: "No se pudo guardar. Intentá de nuevo." };
  }
}

export async function updateRuletaPrizeWeightAction(
  id: string,
  weight: number
): Promise<{ success: true } | { success: false; error: string }> {
  const ctx = await getAdminActorContext();
  if (!ctx) return { success: false, error: "No autorizado" };

  if (!Number.isInteger(weight) || weight <= 0) {
    return { success: false, error: "El peso debe ser un entero mayor a 0" };
  }

  try {
    await db.update(ovnisRuletaPrizes).set({ weight }).where(eq(ovnisRuletaPrizes.id, id));
    revalidatePath("/configuracion/ovnis/ruleta");
    return { success: true };
  } catch {
    return { success: false, error: "No se pudo actualizar. Intentá de nuevo." };
  }
}

export async function toggleRuletaPrizeActivoAction(
  id: string,
  activo: boolean
): Promise<{ success: true } | { success: false; error: string }> {
  const ctx = await getAdminActorContext();
  if (!ctx) return { success: false, error: "No autorizado" };

  try {
    await db.update(ovnisRuletaPrizes).set({ activo }).where(eq(ovnisRuletaPrizes.id, id));
    revalidatePath("/configuracion/ovnis/ruleta");
    return { success: true };
  } catch {
    return { success: false, error: "No se pudo actualizar. Intentá de nuevo." };
  }
}
