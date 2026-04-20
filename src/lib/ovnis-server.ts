import "server-only";

import { randomUUID } from "node:crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  clients,
  ovnisBets,
  ovnisBalance,
  ovnisPendingCredits,
  ovnisRedemptionItems,
  ovnisRedemptions,
  ovnisTransactions,
} from "@/db/schema";
import { calculateOvnisLedgerTotals } from "@/lib/ovnis-economy";
import {
  OVNIS_WELCOME_BONUS,
  PENDING_CREDIT_TTL_DAYS,
  type OvnisTransactionType,
} from "@/lib/ovnis";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// ─── Bootstrap ────────────────────────────────────────────────────────────────

export async function ensureBalanceRow(tx: Tx, clientId: string): Promise<void> {
  await tx
    .insert(ovnisBalance)
    .values({ clientId, balance: 0, pendingBalance: 0 })
    .onConflictDoNothing();
}

export async function grantWelcomeBonus(
  input: { clientId: string }
): Promise<{ alreadyGranted: boolean }> {
  const idempotencyKey = `welcome:${input.clientId}`;

  return db.transaction(async (tx) => {
    await ensureBalanceRow(tx, input.clientId);

    const existing = await tx
      .select({ id: ovnisTransactions.id })
      .from(ovnisTransactions)
      .where(eq(ovnisTransactions.idempotencyKey, idempotencyKey))
      .limit(1);

    if (existing.length > 0) return { alreadyGranted: true };

    await tx.insert(ovnisTransactions).values({
      clientId: input.clientId,
      amount: OVNIS_WELCOME_BONUS,
      type: "welcome" satisfies OvnisTransactionType,
      description: `Bienvenido al universo Marciano — ${OVNIS_WELCOME_BONUS} OVNIS de bienvenida`,
      idempotencyKey,
    });

    await tx
      .update(ovnisBalance)
      .set({
        balance: sql`${ovnisBalance.balance} + ${OVNIS_WELCOME_BONUS}`,
        updatedAt: new Date(),
      })
      .where(eq(ovnisBalance.clientId, input.clientId));

    return { alreadyGranted: false };
  });
}

// ─── Pending credits (QR flow) ────────────────────────────────────────────────

export async function createPendingCreditInTx(
  tx: Tx,
  input: { clientId: string; atencionId: string; amount: number; description: string }
): Promise<{ id: string }> {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + PENDING_CREDIT_TTL_DAYS);

  const [row] = await tx
    .insert(ovnisPendingCredits)
    .values({
      clientId: input.clientId,
      atencionId: input.atencionId,
      amount: input.amount,
      description: input.description,
      expiresAt,
    })
    .onConflictDoNothing()
    .returning({ id: ovnisPendingCredits.id });

  return { id: row?.id ?? "" };
}

type RedeemResult =
  | { success: true; amount: number; description: string }
  | { success: false; reason: "not_found" | "already_redeemed" | "expired" | "wrong_client" | "client_not_marciano" };

export async function redeemPendingCredit(input: {
  pendingCreditId: string;
  scannedByClientId: string;
}): Promise<RedeemResult> {
  return db.transaction(async (tx) => {
    const [credit] = await tx
      .select()
      .from(ovnisPendingCredits)
      .where(eq(ovnisPendingCredits.id, input.pendingCreditId))
      .limit(1)
      .for("update");

    if (!credit) return { success: false, reason: "not_found" };
    if (credit.redeemedAt !== null) return { success: false, reason: "already_redeemed" };
    if (credit.expiresAt < new Date()) return { success: false, reason: "expired" };
    if (credit.clientId !== input.scannedByClientId) return { success: false, reason: "wrong_client" };

    const [client] = await tx
      .select({ esMarciano: clients.esMarciano })
      .from(clients)
      .where(eq(clients.id, input.scannedByClientId))
      .limit(1);

    if (!client?.esMarciano) return { success: false, reason: "client_not_marciano" };

    await tx
      .update(ovnisPendingCredits)
      .set({ redeemedAt: new Date() })
      .where(eq(ovnisPendingCredits.id, credit.id));

    await ensureBalanceRow(tx, input.scannedByClientId);

    await tx.insert(ovnisTransactions).values({
      clientId: input.scannedByClientId,
      amount: credit.amount,
      type: "atencion" satisfies OvnisTransactionType,
      description: credit.description,
      relatedAtencionId: credit.atencionId,
    });

    await tx
      .update(ovnisBalance)
      .set({
        balance: sql`${ovnisBalance.balance} + ${credit.amount}`,
        updatedAt: new Date(),
      })
      .where(eq(ovnisBalance.clientId, input.scannedByClientId));

    return { success: true, amount: credit.amount, description: credit.description };
  });
}

// ─── Direct credits / debits ──────────────────────────────────────────────────

export async function creditOvnis(input: {
  clientId: string;
  amount: number;
  type: OvnisTransactionType;
  description: string;
  relatedClientId?: string;
  relatedRedemptionId?: string;
  relatedBetId?: string;
  idempotencyKey?: string;
}): Promise<void> {
  await db.transaction(async (tx) => {
    await ensureBalanceRow(tx, input.clientId);

    await tx.insert(ovnisTransactions).values({
      clientId: input.clientId,
      amount: input.amount,
      type: input.type,
      description: input.description,
      relatedClientId: input.relatedClientId,
      relatedRedemptionId: input.relatedRedemptionId,
      relatedBetId: input.relatedBetId,
      idempotencyKey: input.idempotencyKey,
    });

    await tx
      .update(ovnisBalance)
      .set({
        balance: sql`${ovnisBalance.balance} + ${input.amount}`,
        updatedAt: new Date(),
      })
      .where(eq(ovnisBalance.clientId, input.clientId));
  });
}

type DebitResult = { success: true } | { success: false; reason: "insufficient_funds" };

export async function debitOvnis(input: {
  clientId: string;
  amount: number;
  type: OvnisTransactionType;
  description: string;
  relatedRedemptionId?: string;
  relatedBetId?: string;
}): Promise<DebitResult> {
  return db.transaction(async (tx) => {
    const result = await tx
      .update(ovnisBalance)
      .set({
        balance: sql`${ovnisBalance.balance} - ${input.amount}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(ovnisBalance.clientId, input.clientId),
          sql`${ovnisBalance.balance} >= ${input.amount}`
        )
      )
      .returning({ id: ovnisBalance.clientId });

    if (result.length === 0) return { success: false, reason: "insufficient_funds" };

    await tx.insert(ovnisTransactions).values({
      clientId: input.clientId,
      amount: -input.amount,
      type: input.type,
      description: input.description,
      relatedRedemptionId: input.relatedRedemptionId,
      relatedBetId: input.relatedBetId,
    });

    return { success: true };
  });
}

type TransferResult =
  | { success: true }
  | { success: false; reason: "invalid_amount" | "insufficient_funds" | "same_client" | "recipient_not_marciano" };

export async function transferOvnis(input: {
  fromClientId: string;
  toClientId: string;
  amount: number;
  description: string;
}): Promise<TransferResult> {
  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    return { success: false, reason: "invalid_amount" };
  }

  if (input.fromClientId === input.toClientId) {
    return { success: false, reason: "same_client" };
  }

  return db.transaction(async (tx) => {
    const [recipient] = await tx
      .select({ esMarciano: clients.esMarciano })
      .from(clients)
      .where(eq(clients.id, input.toClientId))
      .limit(1);

    if (!recipient?.esMarciano) return { success: false, reason: "recipient_not_marciano" };

    const debitResult = await tx
      .update(ovnisBalance)
      .set({
        balance: sql`${ovnisBalance.balance} - ${input.amount}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(ovnisBalance.clientId, input.fromClientId),
          sql`${ovnisBalance.balance} >= ${input.amount}`
        )
      )
      .returning({ id: ovnisBalance.clientId });

    if (debitResult.length === 0) return { success: false, reason: "insufficient_funds" };

    await ensureBalanceRow(tx, input.toClientId);

    await tx
      .update(ovnisBalance)
      .set({
        balance: sql`${ovnisBalance.balance} + ${input.amount}`,
        updatedAt: new Date(),
      })
      .where(eq(ovnisBalance.clientId, input.toClientId));

    const idempotencyKey = `donation:${input.fromClientId}:${input.toClientId}:${randomUUID()}`;

    await tx.insert(ovnisTransactions).values([
      {
        clientId: input.fromClientId,
        amount: -input.amount,
        type: "donation_sent" satisfies OvnisTransactionType,
        description: input.description,
        relatedClientId: input.toClientId,
        idempotencyKey: `${idempotencyKey}:sent`,
      },
      {
        clientId: input.toClientId,
        amount: input.amount,
        type: "donation_received" satisfies OvnisTransactionType,
        description: input.description,
        relatedClientId: input.fromClientId,
        idempotencyKey: `${idempotencyKey}:received`,
      },
    ]);

    return { success: true };
  });
}

// ─── Redemptions ──────────────────────────────────────────────────────────────

type CreateRedemptionResult =
  | { success: true; redemptionId: string }
  | { success: false; reason: "item_not_found" | "item_inactive" | "out_of_stock" | "insufficient_funds" };

export async function createRedemption(input: {
  clientId: string;
  itemId: string;
}): Promise<CreateRedemptionResult> {
  return db.transaction(async (tx) => {
    const [item] = await tx
      .select()
      .from(ovnisRedemptionItems)
      .where(eq(ovnisRedemptionItems.id, input.itemId))
      .limit(1);

    if (!item) return { success: false, reason: "item_not_found" };
    if (!item.activo) return { success: false, reason: "item_inactive" };

    if (item.stock !== null) {
      const stockResult = await tx
        .update(ovnisRedemptionItems)
        .set({ stock: sql`${ovnisRedemptionItems.stock} - 1` })
        .where(
          and(
            eq(ovnisRedemptionItems.id, input.itemId),
            sql`${ovnisRedemptionItems.stock} > 0`
          )
        )
        .returning({ id: ovnisRedemptionItems.id });

      if (stockResult.length === 0) return { success: false, reason: "out_of_stock" };
    }

    const debitResult = await tx
      .update(ovnisBalance)
      .set({
        balance: sql`${ovnisBalance.balance} - ${item.costOvnis}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(ovnisBalance.clientId, input.clientId),
          sql`${ovnisBalance.balance} >= ${item.costOvnis}`
        )
      )
      .returning({ id: ovnisBalance.clientId });

    if (debitResult.length === 0) {
      if (item.stock !== null) {
        await tx
          .update(ovnisRedemptionItems)
          .set({ stock: sql`${ovnisRedemptionItems.stock} + 1` })
          .where(eq(ovnisRedemptionItems.id, input.itemId));
      }
      return { success: false, reason: "insufficient_funds" };
    }

    const [redemption] = await tx
      .insert(ovnisRedemptions)
      .values({
        clientId: input.clientId,
        itemId: input.itemId,
        costOvnis: item.costOvnis,
        status: "pending",
      })
      .returning({ id: ovnisRedemptions.id });

    await tx.insert(ovnisTransactions).values({
      clientId: input.clientId,
      amount: -item.costOvnis,
      type: "redemption" satisfies OvnisTransactionType,
      description: `Canje: ${item.label}`,
      relatedRedemptionId: redemption.id,
    });

    return { success: true, redemptionId: redemption.id };
  });
}

type CreatePrizeRedemptionResult =
  | { success: true; redemptionId: string }
  | { success: false; reason: "item_not_found" | "item_inactive" | "out_of_stock" };

export async function createPrizeRedemption(input: {
  clientId: string;
  itemId: string;
}): Promise<CreatePrizeRedemptionResult> {
  return db.transaction(async (tx) => {
    const [item] = await tx
      .select()
      .from(ovnisRedemptionItems)
      .where(eq(ovnisRedemptionItems.id, input.itemId))
      .limit(1)
      .for("update");

    if (!item) return { success: false, reason: "item_not_found" };
    if (!item.activo) return { success: false, reason: "item_inactive" };

    if (item.stock !== null) {
      const stockResult = await tx
        .update(ovnisRedemptionItems)
        .set({ stock: sql`${ovnisRedemptionItems.stock} - 1` })
        .where(
          and(
            eq(ovnisRedemptionItems.id, input.itemId),
            sql`${ovnisRedemptionItems.stock} > 0`
          )
        )
        .returning({ id: ovnisRedemptionItems.id });

      if (stockResult.length === 0) return { success: false, reason: "out_of_stock" };
    }

    const [redemption] = await tx
      .insert(ovnisRedemptions)
      .values({
        clientId: input.clientId,
        itemId: input.itemId,
        costOvnis: 0,
        status: "pending",
        notas: "Premio ganado en ruleta Marciana",
      })
      .returning({ id: ovnisRedemptions.id });

    return { success: true, redemptionId: redemption.id };
  });
}

type DeliverResult = { success: true } | { success: false; reason: "not_found" | "not_pending" };

export async function deliverRedemption(input: {
  redemptionId: string;
  deliveredByBarberoId: string;
  notas?: string;
}): Promise<DeliverResult> {
  return db.transaction(async (tx) => {
    const [r] = await tx
      .select()
      .from(ovnisRedemptions)
      .where(eq(ovnisRedemptions.id, input.redemptionId))
      .limit(1)
      .for("update");

    if (!r) return { success: false, reason: "not_found" };
    if (r.status !== "pending") return { success: false, reason: "not_pending" };

    await tx
      .update(ovnisRedemptions)
      .set({
        status: "delivered",
        deliveredAt: new Date(),
        deliveredByBarberoId: input.deliveredByBarberoId,
        notas: input.notas ?? null,
      })
      .where(eq(ovnisRedemptions.id, input.redemptionId));

    return { success: true };
  });
}

type CancelResult = { success: true } | { success: false; reason: "not_found" | "not_pending" };

export async function cancelRedemption(input: {
  redemptionId: string;
  cancelledByUserId: string;
  reason: string;
}): Promise<CancelResult> {
  return db.transaction(async (tx) => {
    const [r] = await tx
      .select()
      .from(ovnisRedemptions)
      .where(eq(ovnisRedemptions.id, input.redemptionId))
      .limit(1)
      .for("update");

    if (!r) return { success: false, reason: "not_found" };
    if (r.status !== "pending") return { success: false, reason: "not_pending" };

    await tx
      .update(ovnisRedemptions)
      .set({
        status: "cancelled",
        cancelledAt: new Date(),
        cancelledByUserId: input.cancelledByUserId,
        cancelReason: input.reason,
      })
      .where(eq(ovnisRedemptions.id, input.redemptionId));

    const [item] = await tx
      .select({ stock: ovnisRedemptionItems.stock })
      .from(ovnisRedemptionItems)
      .where(eq(ovnisRedemptionItems.id, r.itemId))
      .limit(1);

    if (item?.stock !== null && item?.stock !== undefined) {
      await tx
        .update(ovnisRedemptionItems)
        .set({ stock: sql`${ovnisRedemptionItems.stock} + 1` })
        .where(eq(ovnisRedemptionItems.id, r.itemId));
    }

    if (r.costOvnis > 0) {
      await ensureBalanceRow(tx, r.clientId);

    await tx
      .update(ovnisBalance)
      .set({
        balance: sql`${ovnisBalance.balance} + ${r.costOvnis}`,
        updatedAt: new Date(),
      })
      .where(eq(ovnisBalance.clientId, r.clientId));

      await tx.insert(ovnisTransactions).values({
      clientId: r.clientId,
      amount: r.costOvnis,
      type: "redemption_refund" satisfies OvnisTransactionType,
      description: `Devolución por cancelación: ${input.reason}`,
      relatedRedemptionId: r.id,
      });
    }

    return { success: true };
  });
}

// ─── Admin tools ──────────────────────────────────────────────────────────────

type AdminAdjustResult = { success: true } | { success: false; reason: "would_go_negative" };

export async function adminAdjustBalance(input: {
  clientId: string;
  delta: number;
  reason: string;
  adminUserId: string;
}): Promise<AdminAdjustResult> {
  return db.transaction(async (tx) => {
    await ensureBalanceRow(tx, input.clientId);

    if (input.delta < 0) {
      const result = await tx
        .update(ovnisBalance)
        .set({
          balance: sql`${ovnisBalance.balance} + ${input.delta}`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(ovnisBalance.clientId, input.clientId),
            sql`${ovnisBalance.balance} + ${input.delta} >= 0`
          )
        )
        .returning({ id: ovnisBalance.clientId });

      if (result.length === 0) return { success: false, reason: "would_go_negative" };
    } else {
      await tx
        .update(ovnisBalance)
        .set({
          balance: sql`${ovnisBalance.balance} + ${input.delta}`,
          updatedAt: new Date(),
        })
        .where(eq(ovnisBalance.clientId, input.clientId));
    }

    await tx.insert(ovnisTransactions).values({
      clientId: input.clientId,
      amount: input.delta,
      type: "admin_adjust" satisfies OvnisTransactionType,
      description: input.reason,
    });

    return { success: true };
  });
}

// ─── Monitoring ───────────────────────────────────────────────────────────────

export async function totalOvnisInCirculation(): Promise<{
  inBalance: number;
  inPendingBalance: number;
  inPendingCredits: number;
  inPendingRedemptions: number;
  emittedTotal: number;
  burnedTotal: number;
  netInSystem: number;
  driftAlert: boolean;
}> {
  const [balanceRow] = await db
    .select({
      inBalance: sql<number>`COALESCE(SUM(${ovnisBalance.balance}), 0)`,
      inPendingBalance: sql<number>`COALESCE(SUM(${ovnisBalance.pendingBalance}), 0)`,
    })
    .from(ovnisBalance);

  const [creditsRow] = await db
    .select({
      inPendingCredits: sql<number>`COALESCE(SUM(${ovnisPendingCredits.amount}), 0)`,
    })
    .from(ovnisPendingCredits)
    .where(and(isNull(ovnisPendingCredits.redeemedAt), sql`${ovnisPendingCredits.expiresAt} > NOW()`));

  const [redemptionsRow] = await db
    .select({
      inPendingRedemptions: sql<number>`COALESCE(SUM(${ovnisRedemptions.costOvnis}), 0)`,
    })
    .from(ovnisRedemptions)
    .where(eq(ovnisRedemptions.status, "pending"));

  const txRows = await db
    .select({
      amount: ovnisTransactions.amount,
      type: ovnisTransactions.type,
      redemptionStatus: ovnisRedemptions.status,
      betStatus: ovnisBets.status,
    })
    .from(ovnisTransactions)
    .leftJoin(ovnisRedemptions, eq(ovnisTransactions.relatedRedemptionId, ovnisRedemptions.id))
    .leftJoin(ovnisBets, eq(ovnisTransactions.relatedBetId, ovnisBets.id));

  const inBalance = Number(balanceRow?.inBalance ?? 0);
  const inPendingBalance = Number(balanceRow?.inPendingBalance ?? 0);
  const inPendingCredits = Number(creditsRow?.inPendingCredits ?? 0);
  const inPendingRedemptions = Number(redemptionsRow?.inPendingRedemptions ?? 0);
  const { emittedTotal, burnedTotal } = calculateOvnisLedgerTotals(
    txRows.map((row) => ({
      amount: Number(row.amount),
      type: row.type as OvnisTransactionType,
      redemptionStatus: row.redemptionStatus,
      betStatus: row.betStatus,
    }))
  );
  const netInSystem = emittedTotal - burnedTotal;
  const accountedFor = inBalance + inPendingBalance + inPendingRedemptions;
  const driftAlert = netInSystem !== accountedFor;

  return {
    inBalance,
    inPendingBalance,
    inPendingCredits,
    inPendingRedemptions,
    emittedTotal,
    burnedTotal,
    netInSystem,
    driftAlert,
  };
}

// ─── Bet balance helpers (used by ovnis-bets.ts) ─────────────────────────────

export async function lockOvnisForBet(
  tx: Tx,
  input: { clientId: string; amount: number; betId: string }
): Promise<{ success: true } | { success: false; reason: "insufficient_funds" }> {
  const result = await tx
    .update(ovnisBalance)
    .set({
      balance: sql`${ovnisBalance.balance} - ${input.amount}`,
      pendingBalance: sql`${ovnisBalance.pendingBalance} + ${input.amount}`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(ovnisBalance.clientId, input.clientId),
        sql`${ovnisBalance.balance} >= ${input.amount}`
      )
    )
    .returning({ id: ovnisBalance.clientId });

  if (result.length === 0) return { success: false, reason: "insufficient_funds" };

  await tx.insert(ovnisTransactions).values({
    clientId: input.clientId,
    amount: -input.amount,
    type: "bet_lock" satisfies OvnisTransactionType,
    description: `OVNIS bloqueados en apuesta`,
    relatedBetId: input.betId,
  });

  return { success: true };
}

export async function unlockOvnisForBet(
  tx: Tx,
  input: { clientId: string; amount: number; betId: string; type: "bet_refund" | "bet_unlock" }
): Promise<void> {
  const result = await tx
    .update(ovnisBalance)
    .set({
      balance: sql`${ovnisBalance.balance} + ${input.amount}`,
      pendingBalance: sql`${ovnisBalance.pendingBalance} - ${input.amount}`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(ovnisBalance.clientId, input.clientId),
        sql`${ovnisBalance.pendingBalance} >= ${input.amount}`
      )
    )
    .returning({ id: ovnisBalance.clientId });

  if (result.length === 0) {
    throw new Error("OVNIS bet unlock would make pending balance negative");
  }

  await tx.insert(ovnisTransactions).values({
    clientId: input.clientId,
    amount: input.amount,
    type: input.type satisfies OvnisTransactionType,
    description: `OVNIS desbloqueados de apuesta`,
    relatedBetId: input.betId,
  });
}

export async function settleBetInTx(
  tx: Tx,
  input: {
    betId: string;
    winnerClientId: string;
    loserClientId: string;
    amount: number;
    resolvedByUserId?: string;
  }
): Promise<void> {
  const winnerResult = await tx
    .update(ovnisBalance)
    .set({
      balance: sql`${ovnisBalance.balance} + ${input.amount * 2}`,
      pendingBalance: sql`${ovnisBalance.pendingBalance} - ${input.amount}`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(ovnisBalance.clientId, input.winnerClientId),
        sql`${ovnisBalance.pendingBalance} >= ${input.amount}`
      )
    )
    .returning({ id: ovnisBalance.clientId });

  if (winnerResult.length === 0) {
    throw new Error("OVNIS bet settlement missing winner lock");
  }

  const loserResult = await tx
    .update(ovnisBalance)
    .set({
      pendingBalance: sql`${ovnisBalance.pendingBalance} - ${input.amount}`,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(ovnisBalance.clientId, input.loserClientId),
        sql`${ovnisBalance.pendingBalance} >= ${input.amount}`
      )
    )
    .returning({ id: ovnisBalance.clientId });

  if (loserResult.length === 0) {
    throw new Error("OVNIS bet settlement missing loser lock");
  }

  await tx.insert(ovnisTransactions).values([
    {
      clientId: input.winnerClientId,
      amount: input.amount * 2,
      type: "bet_win" satisfies OvnisTransactionType,
      description: `Victoria en apuesta - ganaste ${input.amount * 2} OVNIS`,
      relatedBetId: input.betId,
    },
    {
      clientId: input.loserClientId,
      amount: -input.amount,
      type: "bet_burn" satisfies OvnisTransactionType,
      description: `Derrota en apuesta - perdiste ${input.amount} OVNIS`,
      relatedBetId: input.betId,
    },
  ]);
}

export async function settleBet(input: {
  betId: string;
  winnerClientId: string;
  loserClientId: string;
  amount: number;
  resolvedByUserId?: string;
}): Promise<void> {
  await db.transaction(async (tx) => {
    await settleBetInTx(tx, input);
    /*
    await tx.insert(ovnisTransactions).values([
      {
        clientId: input.winnerClientId,
        amount: input.amount * 2,
        type: "bet_win" satisfies OvnisTransactionType,
        description: `Victoria en apuesta — ganaste ${input.amount * 2} OVNIS`,
        relatedBetId: input.betId,
      },
      {
        clientId: input.loserClientId,
        amount: -input.amount,
        type: "bet_burn" satisfies OvnisTransactionType,
        description: `Derrota en apuesta — perdiste ${input.amount} OVNIS`,
        relatedBetId: input.betId,
      },
    ]);
    */
  });
}

export async function burnBetOvnisInTx(
  tx: Tx,
  input: {
    betId: string;
    challengerId: string;
    opponentId: string;
    amount: number;
    status: "both_lost" | "stale_burned";
  }
): Promise<void> {
  const description =
    input.status === "both_lost"
      ? "No hubo acuerdo. OVNIS quemados."
      : "Apuesta abandonada (30 dias sin claims). OVNIS quemados.";

  for (const clientId of [input.challengerId, input.opponentId]) {
    const result = await tx
      .update(ovnisBalance)
      .set({
        pendingBalance: sql`${ovnisBalance.pendingBalance} - ${input.amount}`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(ovnisBalance.clientId, clientId),
          sql`${ovnisBalance.pendingBalance} >= ${input.amount}`
        )
      )
      .returning({ id: ovnisBalance.clientId });

    if (result.length === 0) {
      throw new Error("OVNIS bet burn missing locked balance");
    }

    await tx.insert(ovnisTransactions).values({
      clientId,
      amount: -input.amount,
      type: "bet_burn" satisfies OvnisTransactionType,
      description,
      relatedBetId: input.betId,
    });
  }
}

export async function burnBetOvnis(input: {
  betId: string;
  challengerId: string;
  opponentId: string;
  amount: number;
  status: "both_lost" | "stale_burned";
}): Promise<void> {
  await db.transaction(async (tx) => {
    await burnBetOvnisInTx(tx, input);
  });
  /*
  const description =
    input.status === "both_lost"
      ? "Por pelotudos — no se pusieron de acuerdo. OVNIS quemados."
      : "Apuesta abandonada (30 días sin claims). OVNIS quemados.";

  await db.transaction(async (tx) => {
    for (const clientId of [input.challengerId, input.opponentId]) {
      await tx
        .update(ovnisBalance)
        .set({
          pendingBalance: sql`${ovnisBalance.pendingBalance} - ${input.amount}`,
          updatedAt: new Date(),
        })
        .where(eq(ovnisBalance.clientId, clientId));

      await tx.insert(ovnisTransactions).values({
        clientId,
        amount: -input.amount,
        type: "bet_burn" satisfies OvnisTransactionType,
        description,
        relatedBetId: input.betId,
      });
    }
  });
  */
}
