"use server";

import { revalidatePath } from "next/cache";
import { getAdminActorContext } from "@/lib/dal/authz";
import { adminResolveDispute } from "@/lib/ovnis-bets";

export async function resolverDisputaAction(
  betId: string,
  winnerClientId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const ctx = await getAdminActorContext();
  if (!ctx) return { success: false, error: "No autorizado" };

  const result = await adminResolveDispute({
    betId,
    winnerClientId,
    resolvedByUserId: ctx.userId,
  });

  if (!result.success) {
    const messages: Record<string, string> = {
      not_found: "Apuesta no encontrada",
      invalid_winner: "El ganador elegido no participa en esta apuesta",
      not_resolvable: "La apuesta no está en estado resoluble",
    };
    return {
      success: false,
      error: messages[result.reason] ?? "Error al resolver la disputa",
    };
  }

  revalidatePath("/ovnis/disputas");
  return { success: true };
}
