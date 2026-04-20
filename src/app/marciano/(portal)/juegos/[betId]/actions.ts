"use server";

import { revalidatePath } from "next/cache";
import { requireMarcianoClient } from "@/lib/marciano-portal";
import { claimBetResult } from "@/lib/ovnis-bets";

type ClaimActionResult =
  | { success: true; outcome: string }
  | { success: false; error: string };

export async function claimResultAction(
  betId: string,
  claim: "won" | "lost" | "forfeit"
): Promise<ClaimActionResult> {
  const { client } = await requireMarcianoClient();

  const result = await claimBetResult({ betId, clientId: client.id, claim });

  if (!result.success) {
    const messages: Record<string, string> = {
      not_found: "Apuesta no encontrada.",
      not_participant: "No sos parte de esta apuesta.",
      not_active: "La apuesta no está activa.",
      already_claimed_this_round: "Ya enviaste tu claim. Esperando al otro jugador.",
    };
    return {
      success: false,
      error: messages[result.reason] ?? "No se pudo enviar el claim.",
    };
  }

  revalidatePath(`/marciano/juegos/${betId}`);
  revalidatePath("/marciano/juegos");
  return { success: true, outcome: result.outcome };
}
