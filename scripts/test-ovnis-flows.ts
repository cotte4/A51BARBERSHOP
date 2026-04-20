import { randomUUID } from "node:crypto";
import dotenv from "dotenv";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

dotenv.config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not configured");
}

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

type DbRow = Record<string, unknown>;
type Result = { success: true } | { success: false; reason: string };

const ids = {
  user: `ovnis-flow-${randomUUID()}`,
  barbero: randomUUID(),
  clients: {
    challenger: randomUUID(),
    opponent: randomUUID(),
    inactive: randomUUID(),
    poor: randomUUID(),
  },
  items: {
    active: randomUUID(),
    inactive: randomUUID(),
    outOfStock: randomUUID(),
    expensive: randomUUID(),
    prize: randomUUID(),
  },
  games: {
    active: randomUUID(),
    inactive: randomUUID(),
  },
  prizes: {
    nada: randomUUID(),
  },
  redemptions: [] as string[],
  bets: [] as string[],
};

const clientIds = Object.values(ids.clients);
const itemIds = Object.values(ids.items);
const gameIds = Object.values(ids.games);
const prizeIds = Object.values(ids.prizes);

async function q<T extends DbRow = DbRow>(text: string, params: unknown[] = []): Promise<T[]> {
  const result = await pool.query(text, params);
  return result.rows as T[];
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function pass(message: string): void {
  console.log(`OK ${message}`);
}

function expectSuccess<T extends Result>(result: T, label: string): asserts result is T & { success: true } {
  assert(result.success, `${label} expected success, got ${JSON.stringify(result)}`);
  pass(label);
}

function expectReason(result: Result, reason: string, label: string): void {
  assert(!result.success, `${label} expected failure ${reason}, got success`);
  assert(result.reason === reason, `${label} expected ${reason}, got ${result.reason}`);
  pass(`${label} -> ${reason}`);
}

function classify(row: { amount: number; type: string; redemption_status: string | null; bet_status: string | null }): "emitted" | "burned" | "internal" {
  if (row.amount > 0) {
    if (["welcome", "atencion", "ruleta", "admin_adjust"].includes(row.type)) return "emitted";
    return "internal";
  }

  if (row.amount < 0) {
    if (row.type === "admin_adjust") return "burned";
    if (row.type === "redemption" && row.redemption_status === "delivered") return "burned";
    if (
      row.type === "bet_burn" &&
      (row.bet_status === "both_lost" || row.bet_status === "stale_burned")
    ) {
      return "burned";
    }
  }

  return "internal";
}

async function balanceOf(clientId: string): Promise<{ balance: number; pending: number }> {
  const [row] = await q<{ balance: number; pending_balance: number }>(
    `
      select balance::int, pending_balance::int
      from ovnis_balance
      where client_id = $1
    `,
    [clientId]
  );

  return {
    balance: row?.balance ?? 0,
    pending: row?.pending_balance ?? 0,
  };
}

async function assertScopedInvariant(label: string): Promise<void> {
  const [balanceRow] = await q<{ in_balance: number; in_pending_balance: number }>(
    `
      select
        coalesce(sum(balance), 0)::int as in_balance,
        coalesce(sum(pending_balance), 0)::int as in_pending_balance
      from ovnis_balance
      where client_id = any($1::uuid[])
    `,
    [clientIds]
  );

  const [redemptionsRow] = await q<{ in_pending_redemptions: number }>(
    `
      select coalesce(sum(cost_ovnis), 0)::int as in_pending_redemptions
      from ovnis_redemptions
      where client_id = any($1::uuid[])
        and status = 'pending'
    `,
    [clientIds]
  );

  const txRows = await q<{ amount: number; type: string; redemption_status: string | null; bet_status: string | null }>(
    `
      select
        t.amount::int as amount,
        t.type,
        r.status as redemption_status,
        b.status as bet_status
      from ovnis_transactions t
      left join ovnis_redemptions r on t.related_redemption_id = r.id
      left join ovnis_bets b on t.related_bet_id = b.id
      where t.client_id = any($1::uuid[])
    `,
    [clientIds]
  );

  let emittedTotal = 0;
  let burnedTotal = 0;
  for (const row of txRows) {
    const kind = classify(row);
    if (kind === "emitted") emittedTotal += row.amount;
    if (kind === "burned") burnedTotal += Math.abs(row.amount);
  }

  const netInSystem = emittedTotal - burnedTotal;
  const accountedFor =
    balanceRow.in_balance + balanceRow.in_pending_balance + redemptionsRow.in_pending_redemptions;

  assert(netInSystem === accountedFor, `${label} invariant drifted: net=${netInSystem}, accounted=${accountedFor}`);
  pass(`${label} invariant closes at ${netInSystem} OVNIS`);
}

async function seedFixtures(): Promise<void> {
  await q(
    `
      insert into "user" (id, name, email, email_verified, created_at, updated_at)
      values ($1, 'OVNIS flow user', $2, true, now(), now())
    `,
    [ids.user, `${ids.user}@example.invalid`]
  );

  await q(
    `
      insert into barberos (id, nombre, rol, activo)
      values ($1, 'OVNIS Flow Barbero', 'barbero', true)
    `,
    [ids.barbero]
  );

  await q(
    `
      insert into clients (id, name, email, phone_normalized, es_marciano, marciano_desde, created_by_user_id)
      values
        ($1, 'OVNIS Flow Challenger', $2, $3, true, now(), $13),
        ($4, 'OVNIS Flow Opponent', $5, $6, true, now(), $13),
        ($7, 'OVNIS Flow Inactive', $8, $9, false, null, $13),
        ($10, 'OVNIS Flow Poor', $11, $12, true, now(), $13)
    `,
    [
      ids.clients.challenger,
      `${ids.clients.challenger}@example.invalid`,
      `+549${ids.clients.challenger.replaceAll("-", "").slice(0, 10)}`,
      ids.clients.opponent,
      `${ids.clients.opponent}@example.invalid`,
      `+549${ids.clients.opponent.replaceAll("-", "").slice(0, 10)}`,
      ids.clients.inactive,
      `${ids.clients.inactive}@example.invalid`,
      `+549${ids.clients.inactive.replaceAll("-", "").slice(0, 10)}`,
      ids.clients.poor,
      `${ids.clients.poor}@example.invalid`,
      `+549${ids.clients.poor.replaceAll("-", "").slice(0, 10)}`,
      ids.user,
    ]
  );

  await q(
    `
      insert into ovnis_redemption_items (id, label, type, cost_ovnis, value, activo, stock)
      values
        ($1, 'Flow active item', 'consumicion', 10, 0, true, 2),
        ($2, 'Flow inactive item', 'consumicion', 10, 0, false, 1),
        ($3, 'Flow out item', 'consumicion', 10, 0, true, 0),
        ($4, 'Flow expensive item', 'consumicion', 9999, 0, true, 1),
        ($5, 'Flow prize item', 'consumicion', 50, 0, true, 1)
    `,
    [ids.items.active, ids.items.inactive, ids.items.outOfStock, ids.items.expensive, ids.items.prize]
  );

  await q(
    `
      insert into ovnis_games (id, nombre, type, activo)
      values
        ($1, 'Flow active game', 'physical', true),
        ($2, 'Flow inactive game', 'physical', false)
    `,
    [ids.games.active, ids.games.inactive]
  );
}

async function cleanup(): Promise<void> {
  await q("delete from ovnis_ruleta_spins where client_id = any($1::uuid[])", [clientIds]).catch(() => {});
  await q(
    `
      delete from ovnis_transactions
      where client_id = any($1::uuid[])
        or related_client_id = any($1::uuid[])
        or related_redemption_id = any($2::uuid[])
        or related_bet_id = any($3::uuid[])
    `,
    [clientIds, ids.redemptions, ids.bets]
  ).catch(() => {});
  await q("delete from ovnis_redemptions where client_id = any($1::uuid[]) or id = any($2::uuid[])", [
    clientIds,
    ids.redemptions,
  ]).catch(() => {});
  await q(
    `
      delete from ovnis_bets
      where id = any($1::uuid[])
        or challenger_id = any($2::uuid[])
        or opponent_id = any($2::uuid[])
    `,
    [ids.bets, clientIds]
  ).catch(() => {});
  await q("delete from ovnis_ruleta_prizes where id = any($1::uuid[]) or redemption_item_id = any($2::uuid[])", [
    prizeIds,
    itemIds,
  ]).catch(() => {});
  await q("delete from ovnis_redemption_items where id = any($1::uuid[])", [itemIds]).catch(() => {});
  await q("delete from ovnis_games where id = any($1::uuid[])", [gameIds]).catch(() => {});
  await q("delete from ovnis_balance where client_id = any($1::uuid[])", [clientIds]).catch(() => {});
  await q("delete from clients where id = any($1::uuid[])", [clientIds]).catch(() => {});
  await q("delete from barberos where id = $1", [ids.barbero]).catch(() => {});
  await q('delete from "user" where id = $1', [ids.user]).catch(() => {});
}

async function trackRedemption<T extends { success: boolean; redemptionId?: string }>(resultOrPromise: T | Promise<T>): Promise<T> {
  const result = await resultOrPromise;
  if (result.success && result.redemptionId) ids.redemptions.push(result.redemptionId);
  return result;
}

async function trackBet<T extends { success: boolean; betId?: string }>(resultOrPromise: T | Promise<T>): Promise<T> {
  const result = await resultOrPromise;
  if (result.success && result.betId) ids.bets.push(result.betId);
  return result;
}

async function assertNoOutsideCronTargets(): Promise<void> {
  const [row] = await q<{ expired_pending: number; stale_active: number }>(
    `
      select
        (
          select count(*)::int
          from ovnis_bets
          where status = 'pending'
            and acceptance_expires_at < now()
            and not (id = any($1::uuid[]))
        ) as expired_pending,
        (
          select count(*)::int
          from ovnis_bets
          where status in ('accepted', 'disputed')
            and play_expires_at < now()
            and not (id = any($1::uuid[]))
        ) as stale_active
    `,
    [ids.bets]
  );

  assert(row.expired_pending === 0, "Refusing cron refund test: unrelated expired pending bets exist");
  assert(row.stale_active === 0, "Refusing cron stale-burn test: unrelated stale active bets exist");
}

async function main(): Promise<void> {
  const server = await import("../src/lib/ovnis-server");
  const bets = await import("../src/lib/ovnis-bets");
  const ruleta = await import("../src/lib/ovnis-ruleta");

  await cleanup();
  await seedFixtures();

  const [activePrizeCount] = await q<{ count: number }>(
    "select count(*)::int as count from ovnis_ruleta_prizes where activo = true"
  );
  if (activePrizeCount.count === 0) {
    expectReason(
      await ruleta.spinRuletaForClient(ids.clients.challenger),
      "no_prizes_configured",
      "ruleta without configured prizes"
    );
  } else {
    console.log("SKIP ruleta without configured prizes because active prizes already exist");
  }

  const firstWelcome = await server.grantWelcomeBonus({ clientId: ids.clients.challenger });
  assert(!firstWelcome.alreadyGranted, "welcome bonus should grant the first time");
  pass("welcome bonus grants once");
  const duplicateWelcome = await server.grantWelcomeBonus({ clientId: ids.clients.challenger });
  assert(duplicateWelcome.alreadyGranted, "duplicate welcome bonus should be idempotent");
  pass("welcome bonus duplicate is idempotent");

  expectReason(
    await server.adminAdjustBalance({
      clientId: ids.clients.challenger,
      delta: -9999,
      reason: "Flow negative guard",
      adminUserId: ids.user,
    }),
    "would_go_negative",
    "admin negative adjustment"
  );

  expectReason(
    await server.transferOvnis({
      fromClientId: ids.clients.challenger,
      toClientId: ids.clients.opponent,
      amount: -1,
      description: "Invalid donation",
    }),
    "invalid_amount",
    "donation negative amount"
  );
  expectReason(
    await server.transferOvnis({
      fromClientId: ids.clients.challenger,
      toClientId: ids.clients.challenger,
      amount: 1,
      description: "Self donation",
    }),
    "same_client",
    "donation to self"
  );
  expectReason(
    await server.transferOvnis({
      fromClientId: ids.clients.challenger,
      toClientId: ids.clients.inactive,
      amount: 1,
      description: "Inactive recipient donation",
    }),
    "recipient_not_marciano",
    "donation to non-Marciano"
  );
  expectReason(
    await server.transferOvnis({
      fromClientId: ids.clients.challenger,
      toClientId: ids.clients.opponent,
      amount: 9999,
      description: "Too much donation",
    }),
    "insufficient_funds",
    "donation over balance"
  );

  const originalNow = Date.now;
  Date.now = () => 1234567890;
  try {
    expectSuccess(
      await server.transferOvnis({
        fromClientId: ids.clients.challenger,
        toClientId: ids.clients.opponent,
        amount: 5,
        description: "Double-submit donation A",
      }),
      "donation first double-submit"
    );
    expectSuccess(
      await server.transferOvnis({
        fromClientId: ids.clients.challenger,
        toClientId: ids.clients.opponent,
        amount: 5,
        description: "Double-submit donation B",
      }),
      "donation second double-submit"
    );
  } finally {
    Date.now = originalNow;
  }

  expectReason(
    await trackRedemption(server.createRedemption({ clientId: ids.clients.challenger, itemId: ids.items.inactive })),
    "item_inactive",
    "redemption inactive item"
  );
  expectReason(
    await trackRedemption(server.createRedemption({ clientId: ids.clients.challenger, itemId: ids.items.outOfStock })),
    "out_of_stock",
    "redemption out of stock"
  );
  expectReason(
    await trackRedemption(server.createRedemption({ clientId: ids.clients.challenger, itemId: ids.items.expensive })),
    "insufficient_funds",
    "redemption insufficient balance"
  );
  const [expensiveStock] = await q<{ stock: number }>("select stock::int from ovnis_redemption_items where id = $1", [
    ids.items.expensive,
  ]);
  assert(expensiveStock.stock === 1, "insufficient redemption should restore stock");
  pass("insufficient redemption restores stock");

  const cancelledRedemption = await trackRedemption(
    server.createRedemption({ clientId: ids.clients.challenger, itemId: ids.items.active })
  );
  expectSuccess(cancelledRedemption, "redemption creates pending canje");
  expectSuccess(
    await server.cancelRedemption({
      redemptionId: cancelledRedemption.redemptionId,
      cancelledByUserId: ids.user,
      reason: "Flow cancel",
    }),
    "redemption cancel refunds"
  );

  const deliveredRedemption = await trackRedemption(
    server.createRedemption({ clientId: ids.clients.challenger, itemId: ids.items.active })
  );
  expectSuccess(deliveredRedemption, "redemption creates delivery canje");
  expectSuccess(
    await server.deliverRedemption({
      redemptionId: deliveredRedemption.redemptionId,
      deliveredByBarberoId: ids.barbero,
      notas: "Flow deliver",
    }),
    "redemption delivery burns"
  );
  expectReason(
    await server.cancelRedemption({
      redemptionId: deliveredRedemption.redemptionId,
      cancelledByUserId: ids.user,
      reason: "Too late",
    }),
    "not_pending",
    "delivered redemption cannot be cancelled"
  );

  const prizeRedemption = await trackRedemption(
    server.createPrizeRedemption({ clientId: ids.clients.challenger, itemId: ids.items.prize })
  );
  expectSuccess(prizeRedemption, "ruleta prize redemption costs zero");
  expectReason(
    await trackRedemption(server.createPrizeRedemption({ clientId: ids.clients.opponent, itemId: ids.items.prize })),
    "out_of_stock",
    "ruleta prize redemption respects stock"
  );
  expectSuccess(
    await server.cancelRedemption({
      redemptionId: prizeRedemption.redemptionId,
      cancelledByUserId: ids.user,
      reason: "Flow prize cancel",
    }),
    "ruleta prize cancel restores stock without refund"
  );

  await q(
    `
      insert into ovnis_ruleta_prizes (id, label, type, ovnis_amount, weight, activo)
      values ($1, 'Flow nada', 'nada', 0, 1, true)
    `,
    [ids.prizes.nada]
  );

  expectReason(
    await ruleta.spinRuletaForClient(ids.clients.inactive),
    "client_not_marciano",
    "ruleta inactive Marciano"
  );
  expectSuccess(await ruleta.spinRuletaForClient(ids.clients.challenger), "ruleta first spin succeeds");
  expectReason(await ruleta.spinRuletaForClient(ids.clients.challenger), "already_spun", "ruleta second spin");

  expectSuccess(
    await server.adminAdjustBalance({
      clientId: ids.clients.challenger,
      delta: 200,
      reason: "Flow bet top-up",
      adminUserId: ids.user,
    }),
    "admin top-up challenger"
  );
  expectSuccess(
    await server.adminAdjustBalance({
      clientId: ids.clients.opponent,
      delta: 200,
      reason: "Flow bet top-up",
      adminUserId: ids.user,
    }),
    "admin top-up opponent"
  );

  expectReason(
    await trackBet(
      bets.createBet({
        challengerId: ids.clients.challenger,
        opponentId: ids.clients.challenger,
        gameId: ids.games.active,
        amount: 20,
      })
    ),
    "same_player",
    "bet against self"
  );
  expectReason(
    await trackBet(
      bets.createBet({
        challengerId: ids.clients.challenger,
        opponentId: ids.clients.opponent,
        gameId: ids.games.active,
        amount: 1,
      })
    ),
    "amount_below_min",
    "bet below minimum"
  );
  expectReason(
    await trackBet(
      bets.createBet({
        challengerId: ids.clients.inactive,
        opponentId: ids.clients.opponent,
        gameId: ids.games.active,
        amount: 20,
      })
    ),
    "challenger_not_marciano",
    "bet inactive challenger"
  );
  expectReason(
    await trackBet(
      bets.createBet({
        challengerId: ids.clients.challenger,
        opponentId: ids.clients.inactive,
        gameId: ids.games.active,
        amount: 20,
      })
    ),
    "opponent_not_marciano",
    "bet inactive opponent"
  );
  expectReason(
    await trackBet(
      bets.createBet({
        challengerId: ids.clients.challenger,
        opponentId: ids.clients.opponent,
        gameId: ids.games.inactive,
        amount: 20,
      })
    ),
    "game_inactive",
    "bet inactive game"
  );

  const cancellableBet = await trackBet(
    bets.createBet({
      challengerId: ids.clients.challenger,
      opponentId: ids.clients.opponent,
      gameId: ids.games.active,
      amount: 20,
    })
  );
  expectSuccess(cancellableBet, "bet create locks challenger");
  expectReason(
    await bets.acceptBet({ betId: cancellableBet.betId, opponentClientId: ids.clients.challenger }),
    "wrong_opponent",
    "bet accept wrong opponent"
  );
  expectReason(
    await bets.cancelBet({ betId: cancellableBet.betId, byClientId: ids.clients.opponent }),
    "not_challenger",
    "bet cancel wrong client"
  );
  expectSuccess(
    await bets.cancelBet({ betId: cancellableBet.betId, byClientId: ids.clients.challenger }),
    "bet cancel unlocks challenger"
  );

  const poorBet = await trackBet(
    bets.createBet({
      challengerId: ids.clients.challenger,
      opponentId: ids.clients.poor,
      gameId: ids.games.active,
      amount: 20,
    })
  );
  expectSuccess(poorBet, "bet create against poor opponent");
  expectReason(
    await bets.acceptBet({ betId: poorBet.betId, opponentClientId: ids.clients.poor }),
    "insufficient_funds",
    "bet accept insufficient opponent funds"
  );
  expectSuccess(await bets.cancelBet({ betId: poorBet.betId, byClientId: ids.clients.challenger }), "poor bet cleanup cancel");

  const settledBet = await trackBet(
    bets.createBet({
      challengerId: ids.clients.challenger,
      opponentId: ids.clients.opponent,
      gameId: ids.games.active,
      amount: 20,
    })
  );
  expectSuccess(settledBet, "bet create for settlement");
  expectSuccess(await bets.acceptBet({ betId: settledBet.betId, opponentClientId: ids.clients.opponent }), "bet accept locks opponent");
  const challengerClaim = await bets.claimBetResult({
    betId: settledBet.betId,
    clientId: ids.clients.challenger,
    claim: "won",
  });
  assert(challengerClaim.success && challengerClaim.outcome === "waiting_other", "challenger claim should wait");
  pass("bet first claim waits");
  expectReason(
    await bets.claimBetResult({ betId: settledBet.betId, clientId: ids.clients.challenger, claim: "won" }),
    "already_claimed_this_round",
    "bet duplicate claim"
  );
  const opponentClaim = await bets.claimBetResult({
    betId: settledBet.betId,
    clientId: ids.clients.opponent,
    claim: "lost",
  });
  assert(opponentClaim.success && opponentClaim.outcome === "settled", "consistent claims should settle");
  pass("bet consistent claims settle");

  const disputedBet = await trackBet(
    bets.createBet({
      challengerId: ids.clients.challenger,
      opponentId: ids.clients.opponent,
      gameId: ids.games.active,
      amount: 20,
    })
  );
  expectSuccess(disputedBet, "bet create for dispute");
  expectSuccess(await bets.acceptBet({ betId: disputedBet.betId, opponentClientId: ids.clients.opponent }), "dispute bet accepted");
  await bets.claimBetResult({ betId: disputedBet.betId, clientId: ids.clients.challenger, claim: "won" });
  const disputeClaim = await bets.claimBetResult({ betId: disputedBet.betId, clientId: ids.clients.opponent, claim: "won" });
  assert(disputeClaim.success && disputeClaim.outcome === "disputed", "conflicting claims should dispute");
  pass("bet conflicting claims dispute");
  expectReason(
    await bets.adminResolveDispute({
      betId: disputedBet.betId,
      winnerClientId: randomUUID(),
      resolvedByUserId: ids.user,
    }),
    "invalid_winner",
    "admin dispute invalid winner"
  );
  expectSuccess(
    await bets.adminResolveDispute({
      betId: disputedBet.betId,
      winnerClientId: ids.clients.opponent,
      resolvedByUserId: ids.user,
    }),
    "admin dispute resolves"
  );

  const bothLostBet = await trackBet(
    bets.createBet({
      challengerId: ids.clients.challenger,
      opponentId: ids.clients.opponent,
      gameId: ids.games.active,
      amount: 20,
    })
  );
  expectSuccess(bothLostBet, "bet create for both-lost");
  expectSuccess(await bets.acceptBet({ betId: bothLostBet.betId, opponentClientId: ids.clients.opponent }), "both-lost bet accepted");
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await bets.claimBetResult({ betId: bothLostBet.betId, clientId: ids.clients.challenger, claim: "won" });
    const result = await bets.claimBetResult({ betId: bothLostBet.betId, clientId: ids.clients.opponent, claim: "won" });
    if (attempt < 3) {
      assert(result.success && result.outcome === "disputed", `attempt ${attempt} should dispute`);
    } else {
      assert(result.success && result.outcome === "both_lost", "third dispute should burn both locks");
    }
  }
  pass("bet third conflicting round burns both players");

  await assertNoOutsideCronTargets();
  const expiredBet = await trackBet(
    bets.createBet({
      challengerId: ids.clients.challenger,
      opponentId: ids.clients.opponent,
      gameId: ids.games.active,
      amount: 20,
    })
  );
  expectSuccess(expiredBet, "bet create for expiry refund");
  await q("update ovnis_bets set acceptance_expires_at = now() - interval '1 hour' where id = $1", [expiredBet.betId]);
  await assertNoOutsideCronTargets();
  const refundResult = await bets.refundUnacceptedBets();
  assert(refundResult.refunded >= 1, "refund cron should refund expired bet");
  pass("cron refunds expired pending bet");

  const staleBet = await trackBet(
    bets.createBet({
      challengerId: ids.clients.challenger,
      opponentId: ids.clients.opponent,
      gameId: ids.games.active,
      amount: 20,
    })
  );
  expectSuccess(staleBet, "bet create for stale burn");
  expectSuccess(await bets.acceptBet({ betId: staleBet.betId, opponentClientId: ids.clients.opponent }), "stale bet accepted");
  await q("update ovnis_bets set play_expires_at = now() - interval '1 hour' where id = $1", [staleBet.betId]);
  await assertNoOutsideCronTargets();
  const burnResult = await bets.burnStaleBets();
  assert(burnResult.burned >= 1, "stale cron should burn stale bet");
  pass("cron burns stale accepted bet");

  await assertScopedInvariant("full OVNIS flow");

  const challengerBalance = await balanceOf(ids.clients.challenger);
  const opponentBalance = await balanceOf(ids.clients.opponent);
  assert(challengerBalance.balance >= 0 && challengerBalance.pending >= 0, "challenger balance should stay non-negative");
  assert(opponentBalance.balance >= 0 && opponentBalance.pending >= 0, "opponent balance should stay non-negative");
  pass("final balances stay non-negative");
}

main()
  .then(async () => {
    await cleanup();
    await pool.end();
    pass("flow test cleanup removed all fixtures");
    process.exit(0);
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await cleanup();
    await pool.end();
    process.exit(1);
  });
