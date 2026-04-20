"use server";

import { requireMarcianoClient } from "@/lib/marciano-portal";
import { spinRuletaForClient } from "@/lib/ovnis-ruleta";

type SpinActionResult =
  | { success: true; prize: { label: string; type: string; ovnisAmount: number } }
  | { success: false; error: string };

export async function girarRuletaAction(): Promise<SpinActionResult> {
  const { client } = await requireMarcianoClient();

  const result = await spinRuletaForClient(client.id);

  if (!result.success) {
    const messages: Record<string, string> = {
      already_spun: "Ya giraste la ruleta. Solo se gira una vez en la vida Marciana.",
      client_not_marciano: "Tu membresía Marciano está inactiva.",
      no_prizes_configured: "La ruleta todavia no tiene premios configurados.",
    };
    return {
      success: false,
      error: messages[result.reason] ?? "No se pudo girar. Intentá de nuevo.",
    };
  }

  return {
    success: true,
    prize: {
      label: result.prize.label,
      type: result.prize.type,
      ovnisAmount: result.prize.ovnisAmount,
    },
  };
}
