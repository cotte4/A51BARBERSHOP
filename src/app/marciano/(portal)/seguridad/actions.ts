"use server";

import { and, eq, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import { clients, ovnisBets, user } from "@/db/schema";
import { requireMarcianoClient } from "@/lib/marciano-portal";
import { unlockOvnisForBet } from "@/lib/ovnis-server";

export async function deleteMarcianoAccountAction(): Promise<
  { success: true } | { success: false; error: string }
> {
  const { client, session } = await requireMarcianoClient();

  await db.transaction(async (tx) => {
    // Cancel all active bets — refund both sides
    const activeBets = await tx
      .select()
      .from(ovnisBets)
      .where(
        and(
          or(
            eq(ovnisBets.challengerId, client.id),
            eq(ovnisBets.opponentId, client.id)
          ),
          inArray(ovnisBets.status, ["pending", "accepted", "disputed"])
        )
      )
      .for("update");

    for (const bet of activeBets) {
      // Refund challenger
      await unlockOvnisForBet(tx, {
        clientId: bet.challengerId,
        amount: bet.amount,
        betId: bet.id,
        type: "bet_refund",
      });
      // Refund opponent if already accepted (they locked funds too)
      if (bet.status === "accepted" || bet.status === "disputed") {
        await unlockOvnisForBet(tx, {
          clientId: bet.opponentId,
          amount: bet.amount,
          betId: bet.id,
          type: "bet_refund",
        });
      }
      await tx
        .update(ovnisBets)
        .set({ status: "cancelled", resolvedAt: new Date() })
        .where(eq(ovnisBets.id, bet.id));
    }

    // Detach client record (keep history, remove auth link)
    await tx
      .update(clients)
      .set({ userId: null, archivedAt: new Date(), esMarciano: false })
      .where(eq(clients.id, client.id));

    // Delete Better Auth user — cascades sessions and accounts
    await tx.delete(user).where(eq(user.id, session.user.id));
  });

  return { success: true };
}
