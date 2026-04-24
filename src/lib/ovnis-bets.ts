import "server-only";

import { randomUUID } from "crypto";
import { and, eq, inArray, lt, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { clients, ovnisBets, ovnisBalance } from "@/db/schema";
import {
  burnBetOvnisInTx,
  lockOvnisForBet,
  settleBetInTx,
  unlockOvnisForBet,
} from "@/lib/ovnis-server";
import { BET_ACCEPTANCE_HOURS, BET_MAX_ACTIVE, BET_MAX_CLAIM_ATTEMPTS, BET_MIN_AMOUNT } from "@/lib/ovnis";

// ─── Create ───────────────────────────────────────────────────────────────────

type CreateBetResult =
  | { success: true; betId: string }
  | {
      success: false;
      reason:
        | "insufficient_funds"
        | "same_player"
        | "challenger_not_marciano"
        | "opponent_not_marciano"
        | "amount_below_min"
        | "game_not_found"
        | "game_inactive"
        | "too_many_active_bets";
    };

export async function createBet(input: {
  challengerId: string;
  opponentId: string;
  gameId: string;
  amount: number;
}): Promise<CreateBetResult> {
  if (input.challengerId === input.opponentId) return { success: false, reason: "same_player" };
  if (input.amount < BET_MIN_AMOUNT) return { success: false, reason: "amount_below_min" };

  return db.transaction(async (tx) => {
    const [challenger, opponent, activeBets] = await Promise.all([
      tx.select({ esMarciano: clients.esMarciano }).from(clients).where(eq(clients.id, input.challengerId)).limit(1),
      tx.select({ esMarciano: clients.esMarciano }).from(clients).where(eq(clients.id, input.opponentId)).limit(1),
      tx.select({ id: ovnisBets.id }).from(ovnisBets).where(
        and(
          or(eq(ovnisBets.challengerId, input.challengerId), eq(ovnisBets.opponentId, input.challengerId)),
          inArray(ovnisBets.status, ["pending", "accepted", "disputed"])
        )
      ),
    ]);

    if (!challenger[0]?.esMarciano) return { success: false, reason: "challenger_not_marciano" };
    if (!opponent[0]?.esMarciano) return { success: false, reason: "opponent_not_marciano" };
    if (activeBets.length >= BET_MAX_ACTIVE) return { success: false, reason: "too_many_active_bets" };

    const { ovnisGames } = await import("@/db/schema");
    const [game] = await tx.select().from(ovnisGames).where(eq(ovnisGames.id, input.gameId)).limit(1);
    if (!game) return { success: false, reason: "game_not_found" };
    if (!game.activo) return { success: false, reason: "game_inactive" };

    const acceptanceExpiresAt = new Date();
    acceptanceExpiresAt.setHours(acceptanceExpiresAt.getHours() + BET_ACCEPTANCE_HOURS);

    const betId = randomUUID();

    const lockResult = await lockOvnisForBet(tx, {
      clientId: input.challengerId,
      amount: input.amount,
      betId,
    });

    if (!lockResult.success) return { success: false, reason: "insufficient_funds" };

    await tx.insert(ovnisBets).values({
      id: betId,
      gameId: input.gameId,
      challengerId: input.challengerId,
      opponentId: input.opponentId,
      amount: input.amount,
      status: "pending",
      acceptanceExpiresAt,
    });

    return { success: true, betId };
  });
}

// ─── Accept ───────────────────────────────────────────────────────────────────

type AcceptBetResult =
  | { success: true }
  | { success: false; reason: "not_found" | "wrong_opponent" | "not_pending" | "expired" | "insufficient_funds" };

export async function acceptBet(input: {
  betId: string;
  opponentClientId: string;
}): Promise<AcceptBetResult> {
  return db.transaction(async (tx) => {
    const [bet] = await tx
      .select()
      .from(ovnisBets)
      .where(eq(ovnisBets.id, input.betId))
      .limit(1)
      .for("update");

    if (!bet) return { success: false, reason: "not_found" };
    if (bet.opponentId !== input.opponentClientId) return { success: false, reason: "wrong_opponent" };
    if (bet.status !== "pending") return { success: false, reason: "not_pending" };
    if (bet.acceptanceExpiresAt < new Date()) return { success: false, reason: "expired" };

    const lockResult = await lockOvnisForBet(tx, {
      clientId: input.opponentClientId,
      amount: bet.amount,
      betId: bet.id,
    });

    if (!lockResult.success) return { success: false, reason: "insufficient_funds" };

    const playExpiresAt = new Date();
    playExpiresAt.setDate(playExpiresAt.getDate() + 30);

    await tx
      .update(ovnisBets)
      .set({ status: "accepted", acceptedAt: new Date(), playExpiresAt })
      .where(eq(ovnisBets.id, input.betId));

    return { success: true };
  });
}

// ─── Cancel ───────────────────────────────────────────────────────────────────

type CancelBetResult =
  | { success: true }
  | { success: false; reason: "not_found" | "not_challenger" | "not_cancellable" };

export async function cancelBet(input: {
  betId: string;
  byClientId: string;
}): Promise<CancelBetResult> {
  return db.transaction(async (tx) => {
    const [bet] = await tx
      .select()
      .from(ovnisBets)
      .where(eq(ovnisBets.id, input.betId))
      .limit(1)
      .for("update");

    if (!bet) return { success: false, reason: "not_found" };
    if (bet.challengerId !== input.byClientId) return { success: false, reason: "not_challenger" };
    if (bet.status !== "pending") return { success: false, reason: "not_cancellable" };

    await unlockOvnisForBet(tx, {
      clientId: input.byClientId,
      amount: bet.amount,
      betId: bet.id,
      type: "bet_refund",
    });

    await tx
      .update(ovnisBets)
      .set({ status: "cancelled", resolvedAt: new Date() })
      .where(eq(ovnisBets.id, input.betId));

    return { success: true };
  });
}

// ─── Reject ───────────────────────────────────────────────────────────────────

type RejectBetResult =
  | { success: true }
  | { success: false; reason: "not_found" | "wrong_opponent" | "not_pending" };

export async function rejectBet(input: {
  betId: string;
  opponentClientId: string;
}): Promise<RejectBetResult> {
  return db.transaction(async (tx) => {
    const [bet] = await tx
      .select()
      .from(ovnisBets)
      .where(eq(ovnisBets.id, input.betId))
      .limit(1)
      .for("update");

    if (!bet) return { success: false, reason: "not_found" };
    if (bet.opponentId !== input.opponentClientId) return { success: false, reason: "wrong_opponent" };
    if (bet.status !== "pending") return { success: false, reason: "not_pending" };

    await unlockOvnisForBet(tx, {
      clientId: bet.challengerId,
      amount: bet.amount,
      betId: bet.id,
      type: "bet_refund",
    });

    await tx
      .update(ovnisBets)
      .set({ status: "rejected", resolvedAt: new Date() })
      .where(eq(ovnisBets.id, input.betId));

    return { success: true };
  });
}

// ─── Claim ────────────────────────────────────────────────────────────────────

type ClaimResult =
  | { success: true; outcome: "waiting_other" | "settled" | "disputed" | "both_lost" }
  | { success: false; reason: "not_found" | "not_participant" | "not_active" | "already_claimed_this_round" };

export async function claimBetResult(input: {
  betId: string;
  clientId: string;
  claim: "won" | "lost" | "forfeit";
}): Promise<ClaimResult> {
  return db.transaction(async (tx) => {
    const [bet] = await tx
      .select()
      .from(ovnisBets)
      .where(eq(ovnisBets.id, input.betId))
      .limit(1)
      .for("update");

    if (!bet) return { success: false, reason: "not_found" };

    const isChallenger = bet.challengerId === input.clientId;
    const isOpponent = bet.opponentId === input.clientId;
    if (!isChallenger && !isOpponent) return { success: false, reason: "not_participant" };
    if (bet.status !== "accepted" && bet.status !== "disputed") return { success: false, reason: "not_active" };

    const myCurrentClaim = isChallenger ? bet.challengerClaim : bet.opponentClaim;
    if (myCurrentClaim !== null) return { success: false, reason: "already_claimed_this_round" };

    // Forfeit: immediate settlement, other player wins
    if (input.claim === "forfeit") {
      const winnerClientId = isChallenger ? bet.opponentId : bet.challengerId;
      const loserClientId = input.clientId;

      await tx
        .update(ovnisBets)
        .set({ status: isChallenger ? "opponent_won" : "challenger_won", resolvedAt: new Date() })
        .where(eq(ovnisBets.id, input.betId));

      await settleBetInTx(tx, { betId: bet.id, winnerClientId, loserClientId, amount: bet.amount });
      return { success: true, outcome: "settled" };
    }

    // Set this player's claim
    const updateData = isChallenger
      ? { challengerClaim: input.claim }
      : { opponentClaim: input.claim };

    await tx.update(ovnisBets).set(updateData).where(eq(ovnisBets.id, input.betId));

    const updatedChallengerClaim = isChallenger ? input.claim : bet.challengerClaim;
    const updatedOpponentClaim = isOpponent ? input.claim : bet.opponentClaim;

    // Only one has claimed so far
    if (!updatedChallengerClaim || !updatedOpponentClaim) {
      return { success: true, outcome: "waiting_other" };
    }

    // Both claimed — check consistency
    const consistent =
      (updatedChallengerClaim === "won" && updatedOpponentClaim === "lost") ||
      (updatedChallengerClaim === "lost" && updatedOpponentClaim === "won");

    if (consistent) {
      const winnerClientId = updatedChallengerClaim === "won" ? bet.challengerId : bet.opponentId;
      const loserClientId = winnerClientId === bet.challengerId ? bet.opponentId : bet.challengerId;

      await tx
        .update(ovnisBets)
        .set({
          status: winnerClientId === bet.challengerId ? "challenger_won" : "opponent_won",
          resolvedAt: new Date(),
        })
        .where(eq(ovnisBets.id, input.betId));

      await settleBetInTx(tx, { betId: bet.id, winnerClientId, loserClientId, amount: bet.amount });
      return { success: true, outcome: "settled" };
    }

    // Inconsistent — increment attempts
    const newAttempts = bet.claimAttempts + 1;

    if (newAttempts >= BET_MAX_CLAIM_ATTEMPTS) {
      await tx
        .update(ovnisBets)
        .set({ status: "both_lost", claimAttempts: newAttempts, resolvedAt: new Date() })
        .where(eq(ovnisBets.id, input.betId));

      await burnBetOvnisInTx(tx, {
        betId: bet.id,
        challengerId: bet.challengerId,
        opponentId: bet.opponentId,
        amount: bet.amount,
        status: "both_lost",
      });

      return { success: true, outcome: "both_lost" };
    }

    // Reset claims for next attempt
    await tx
      .update(ovnisBets)
      .set({
        status: "disputed",
        claimAttempts: newAttempts,
        challengerClaim: null,
        opponentClaim: null,
      })
      .where(eq(ovnisBets.id, input.betId));

    return { success: true, outcome: "disputed" };
  });
}

// ─── Admin resolve ────────────────────────────────────────────────────────────

type AdminResolveResult =
  | { success: true }
  | { success: false; reason: "not_found" | "not_resolvable" | "invalid_winner" };

export async function adminResolveDispute(input: {
  betId: string;
  winnerClientId: string;
  resolvedByUserId: string;
}): Promise<AdminResolveResult> {
  return db.transaction(async (tx) => {
    const [bet] = await tx
      .select()
      .from(ovnisBets)
      .where(eq(ovnisBets.id, input.betId))
      .limit(1)
      .for("update");

    if (!bet) return { success: false, reason: "not_found" };
    if (!["accepted", "disputed"].includes(bet.status)) return { success: false, reason: "not_resolvable" };
    if (input.winnerClientId !== bet.challengerId && input.winnerClientId !== bet.opponentId) {
      return { success: false, reason: "invalid_winner" };
    }

    const loserClientId = input.winnerClientId === bet.challengerId ? bet.opponentId : bet.challengerId;
    const winnerIsChallenger = input.winnerClientId === bet.challengerId;

    await tx
      .update(ovnisBets)
      .set({
        status: winnerIsChallenger ? "challenger_won" : "opponent_won",
        resolvedAt: new Date(),
        resolvedByUserId: input.resolvedByUserId,
      })
      .where(eq(ovnisBets.id, input.betId));

    await settleBetInTx(tx, {
      betId: bet.id,
      winnerClientId: input.winnerClientId,
      loserClientId,
      amount: bet.amount,
      resolvedByUserId: input.resolvedByUserId,
    });

    return { success: true };
  });
}

// ─── Cron jobs ────────────────────────────────────────────────────────────────

export async function refundExpiredBet(betId: string): Promise<{ refunded: boolean }> {
  let didRefund = false;

  await db.transaction(async (tx) => {
    const [bet] = await tx
      .select()
      .from(ovnisBets)
      .where(
        and(
          eq(ovnisBets.id, betId),
          eq(ovnisBets.status, "pending"),
          lt(ovnisBets.acceptanceExpiresAt, new Date())
        )
      )
      .limit(1)
      .for("update");

    if (!bet) return;

    await unlockOvnisForBet(tx, {
      clientId: bet.challengerId,
      amount: bet.amount,
      betId: bet.id,
      type: "bet_refund",
    });

    await tx
      .update(ovnisBets)
      .set({ status: "refunded", resolvedAt: new Date() })
      .where(eq(ovnisBets.id, bet.id));

    didRefund = true;
  });

  return { refunded: didRefund };
}

export async function refundUnacceptedBets(): Promise<{ refunded: number }> {
  const expiredBets = await db
    .select({ id: ovnisBets.id })
    .from(ovnisBets)
    .where(and(eq(ovnisBets.status, "pending"), lt(ovnisBets.acceptanceExpiresAt, new Date())));

  let refunded = 0;

  for (const expiredBet of expiredBets) {
    const result = await refundExpiredBet(expiredBet.id);
    if (result.refunded) refunded++;
  }

  return { refunded };
}

export async function burnStaleBets(): Promise<{ burned: number }> {
  const staleBets = await db
    .select()
    .from(ovnisBets)
    .where(
      and(
        inArray(ovnisBets.status, ["accepted", "disputed"]),
        lt(ovnisBets.playExpiresAt, new Date())
      )
    );

  let burned = 0;

  for (const staleBet of staleBets) {
    let didBurn = false;

    await db.transaction(async (tx) => {
      const [bet] = await tx
        .select()
        .from(ovnisBets)
        .where(
          and(
            eq(ovnisBets.id, staleBet.id),
            inArray(ovnisBets.status, ["accepted", "disputed"]),
            lt(ovnisBets.playExpiresAt, new Date())
          )
        )
        .limit(1)
        .for("update");

      if (!bet) return;

      await tx
        .update(ovnisBets)
        .set({ status: "stale_burned", resolvedAt: new Date() })
        .where(eq(ovnisBets.id, bet.id));

      await burnBetOvnisInTx(tx, {
        betId: bet.id,
        challengerId: bet.challengerId,
        opponentId: bet.opponentId,
        amount: bet.amount,
        status: "stale_burned",
      });

      didBurn = true;
    });

    if (didBurn) burned++;
  }

  return { burned };
}
