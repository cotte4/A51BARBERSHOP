"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { ovnisRedemptionItems } from "@/db/schema";
import { getAdminSessionContext } from "@/lib/admin-action";

type PremioData = {
  label: string;
  type: "consumicion" | "descuento_pct" | "descuento_fijo" | "producto";
  costOvnis: number;
  value: number;
  stock?: number | null;
};

export async function createPremioAction(
  data: PremioData
): Promise<{ success: true } | { success: false; error: string }> {
  const ctx = await getAdminSessionContext();
  if (!ctx) return { success: false, error: "No autorizado" };

  if (!data.label.trim()) return { success: false, error: "El nombre es requerido" };
  if (data.costOvnis <= 0) return { success: false, error: "El costo debe ser mayor a 0" };

  try {
    await db.insert(ovnisRedemptionItems).values({
      label: data.label.trim(),
      type: data.type,
      costOvnis: data.costOvnis,
      value: data.value,
      stock: data.stock ?? null,
      activo: true,
    });
    revalidatePath("/configuracion/ovnis/premios");
    return { success: true };
  } catch {
    return { success: false, error: "No se pudo guardar. Intentá de nuevo." };
  }
}

export async function togglePremioActivoAction(
  id: string,
  activo: boolean
): Promise<{ success: true } | { success: false; error: string }> {
  const ctx = await getAdminSessionContext();
  if (!ctx) return { success: false, error: "No autorizado" };

  try {
    await db.update(ovnisRedemptionItems).set({ activo }).where(eq(ovnisRedemptionItems.id, id));
    revalidatePath("/configuracion/ovnis/premios");
    return { success: true };
  } catch {
    return { success: false, error: "No se pudo actualizar. Intentá de nuevo." };
  }
}
