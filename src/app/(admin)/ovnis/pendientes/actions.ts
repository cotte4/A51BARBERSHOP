"use server";

import { revalidatePath } from "next/cache";
import { getAdminActorContext, getLinkedBarberoIdForUser } from "@/lib/dal/authz";
import { deliverRedemption, cancelRedemption } from "@/lib/ovnis-server";

export async function entregarRedemptionAction(
  redemptionId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const ctx = await getAdminActorContext();
  if (!ctx) return { success: false, error: "No autorizado" };

  const barberoId = await getLinkedBarberoIdForUser(ctx.userId);
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
  const ctx = await getAdminActorContext();
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
