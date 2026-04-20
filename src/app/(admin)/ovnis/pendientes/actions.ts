"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { barberos } from "@/db/schema";
import { getAdminSessionContext } from "@/lib/admin-action";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { deliverRedemption, cancelRedemption } from "@/lib/ovnis-server";

async function getAdminBarberoId(userId: string): Promise<string | null> {
  const [barbero] = await db
    .select({ id: barberos.id })
    .from(barberos)
    .where(eq(barberos.userId, userId))
    .limit(1);
  return barbero?.id ?? null;
}

export async function entregarRedemptionAction(
  redemptionId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const ctx = await getAdminSessionContext();
  if (!ctx) return { success: false, error: "No autorizado" };

  const barberoId = await getAdminBarberoId(ctx.userId);
  if (!barberoId) return { success: false, error: "Tu usuario no tiene barbero vinculado" };

  const result = await deliverRedemption({ redemptionId, deliveredByBarberoId: barberoId });
  if (!result.success) {
    return {
      success: false,
      error: result.reason === "not_found" ? "Premio no encontrado" : "El premio ya fue entregado o cancelado",
    };
  }

  revalidatePath("/ovnis/pendientes");
  return { success: true };
}

export async function cancelarRedemptionAction(
  redemptionId: string,
  reason: string
): Promise<{ success: true } | { success: false; error: string }> {
  const ctx = await getAdminSessionContext();
  if (!ctx) return { success: false, error: "No autorizado" };

  if (!reason.trim()) return { success: false, error: "El motivo es requerido" };

  const result = await cancelRedemption({
    redemptionId,
    cancelledByUserId: ctx.userId,
    reason: reason.trim(),
  });

  if (!result.success) {
    return {
      success: false,
      error: result.reason === "not_found" ? "Premio no encontrado" : "El premio ya fue procesado",
    };
  }

  revalidatePath("/ovnis/pendientes");
  return { success: true };
}
