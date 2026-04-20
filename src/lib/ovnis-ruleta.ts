import "server-only";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clients, ovnisRedemptionItems, ovnisRuletaPrizes, ovnisRuletaSpins } from "@/db/schema";
import { createPrizeRedemption, creditOvnis } from "@/lib/ovnis-server";

type Prize = {
  id: string;
  label: string;
  type: string;
  ovnisAmount: number;
  redemptionItemId: string | null;
};
type SpinResult =
  | { success: true; prize: Prize }
  | { success: false; reason: "already_spun" | "client_not_marciano" | "no_prizes_configured" };

export async function spinRuletaForClient(clientId: string): Promise<SpinResult> {
  // Step 1: validate and record the spin atomically
  const spinRecord = await db.transaction(async (tx) => {
    const [client] = await tx
      .select({ esMarciano: clients.esMarciano })
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1);

    if (!client?.esMarciano) return { ok: false as const, reason: "client_not_marciano" as const };

    const existingSpin = await tx
      .select({ clientId: ovnisRuletaSpins.clientId })
      .from(ovnisRuletaSpins)
      .where(eq(ovnisRuletaSpins.clientId, clientId))
      .limit(1);

    if (existingSpin.length > 0) return { ok: false as const, reason: "already_spun" as const };

    const prizes = await tx
      .select()
      .from(ovnisRuletaPrizes)
      .where(eq(ovnisRuletaPrizes.activo, true));

    if (prizes.length === 0) return { ok: false as const, reason: "no_prizes_configured" as const };

    const prizeId = pickWeightedPrize(prizes);
    const prize = prizes.find((p) => p.id === prizeId)!;

    await tx.insert(ovnisRuletaSpins).values({ clientId, prizeId });

    return {
      ok: true as const,
      prize: {
        id: prize.id,
        label: prize.label,
        type: prize.type,
        ovnisAmount: prize.ovnisAmount,
        redemptionItemId: prize.redemptionItemId,
      },
    };
  });

  if (!spinRecord.ok) return { success: false, reason: spinRecord.reason };

  const prize = spinRecord.prize;

  // Step 2: apply prize effects (outside the spin tx to keep it simple)
  if (prize.type === "ovnis" && prize.ovnisAmount > 0) {
    await creditOvnis({
      clientId,
      amount: prize.ovnisAmount,
      type: "ruleta",
      description: `Premio ruleta de bienvenida: +${prize.ovnisAmount} OVNIS`,
      idempotencyKey: `ruleta:${clientId}`,
    });
    return { success: true, prize };
  }

  if (prize.type === "redemption_item" && prize.redemptionItemId) {
    const [item] = await db
      .select({ activo: ovnisRedemptionItems.activo, stock: ovnisRedemptionItems.stock })
      .from(ovnisRedemptionItems)
      .where(eq(ovnisRedemptionItems.id, prize.redemptionItemId))
      .limit(1);

    const isAvailable = item?.activo && (item.stock === null || item.stock > 0);

    if (isAvailable) {
      const redemptionResult = await createPrizeRedemption({ clientId, itemId: prize.redemptionItemId });
      if (!redemptionResult.success) {
        // Race on stock — fallback to nada
        return {
          success: true,
          prize: { ...prize, label: "¡Casi! Mejor suerte la próxima", type: "nada" },
        };
      }
    } else {
      return {
        success: true,
        prize: { ...prize, label: "¡Casi! Mejor suerte la próxima", type: "nada" },
      };
    }
  }

  return { success: true, prize };
}

function pickWeightedPrize(prizes: Array<{ id: string; weight: number }>): string {
  const total = prizes.reduce((sum, p) => sum + p.weight, 0);
  let rand = Math.random() * total;

  for (const prize of prizes) {
    rand -= prize.weight;
    if (rand <= 0) return prize.id;
  }

  return prizes[prizes.length - 1].id;
}
