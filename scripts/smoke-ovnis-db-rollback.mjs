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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function classify(row) {
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

async function main() {
  const client = await pool.connect();
  const ids = {
    user: `ovnis-smoke-${randomUUID()}`,
    challenger: randomUUID(),
    opponent: randomUUID(),
    item: randomUUID(),
    redemption: randomUUID(),
    game: randomUUID(),
    bet: randomUUID(),
  };

  async function q(text, params = []) {
    const result = await client.query(text, params);
    return result.rows;
  }

  async function expectDbFailure(label, fn) {
    await q("savepoint smoke_expected_failure");
    let failed = false;
    try {
      await fn();
    } catch {
      failed = true;
    }
    await q("rollback to savepoint smoke_expected_failure");
    await q("release savepoint smoke_expected_failure");
    assert(failed, `${label} unexpectedly succeeded`);
    console.log(`OK ${label} rejected by database`);
  }

  async function assertInvariant(label, expectedNet) {
    const scopedClients = [ids.challenger, ids.opponent];
    const [balanceRow] = await q(
      `
        select
          coalesce(sum(balance), 0)::int as in_balance,
          coalesce(sum(pending_balance), 0)::int as in_pending_balance
        from ovnis_balance
        where client_id = any($1::uuid[])
      `,
      [scopedClients]
    );

    const [redemptionsRow] = await q(
      `
        select coalesce(sum(cost_ovnis), 0)::int as in_pending_redemptions
        from ovnis_redemptions
        where client_id = any($1::uuid[])
          and status = 'pending'
      `,
      [scopedClients]
    );

    const txRows = await q(
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
      [scopedClients]
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
    assert(netInSystem === expectedNet, `${label} expected net ${expectedNet}, got ${netInSystem}`);
    console.log(`OK ${label} invariant closes at ${netInSystem} OVNIS`);
  }

  try {
    await q("begin");

    await q(
      `
        insert into "user" (id, name, email, email_verified, created_at, updated_at)
        values ($1, 'OVNIS smoke user', $2, true, now(), now())
      `,
      [ids.user, `${ids.user}@example.invalid`]
    );

    await q(
      `
        insert into clients (id, name, email, phone_normalized, es_marciano, marciano_desde, created_by_user_id)
        values
          ($1, 'OVNIS Smoke Challenger', $2, $3, true, now(), $7),
          ($4, 'OVNIS Smoke Opponent', $5, $6, true, now(), $7)
      `,
      [
        ids.challenger,
        `${ids.challenger}@example.invalid`,
        `+549${ids.challenger.replaceAll("-", "").slice(0, 10)}`,
        ids.opponent,
        `${ids.opponent}@example.invalid`,
        `+549${ids.opponent.replaceAll("-", "").slice(0, 10)}`,
        ids.user,
      ]
    );

    await q(
      `
        insert into ovnis_balance (client_id, balance, pending_balance)
        values ($1, 200, 0), ($2, 100, 0)
      `,
      [ids.challenger, ids.opponent]
    );

    await q(
      `
        insert into ovnis_transactions (client_id, amount, type, description)
        values
          ($1, 200, 'admin_adjust', 'Smoke initial supply'),
          ($2, 100, 'admin_adjust', 'Smoke initial supply')
      `,
      [ids.challenger, ids.opponent]
    );

    await assertInvariant("initial supply", 300);

    await expectDbFailure("negative balance", () =>
      q(
        `
          update ovnis_balance
          set balance = -1
          where client_id = $1
        `,
        [ids.challenger]
      )
    );

    await q(
      `
        insert into ovnis_redemption_items (id, label, type, cost_ovnis, value, activo, stock)
        values ($1, 'Smoke consumicion', 'consumicion', 50, 0, true, 1)
      `,
      [ids.item]
    );

    await q(
      `
        insert into ovnis_redemptions (id, client_id, item_id, cost_ovnis, status)
        values ($1, $2, $3, 50, 'pending')
      `,
      [ids.redemption, ids.challenger, ids.item]
    );

    await q(
      `
        update ovnis_balance
        set balance = balance - 50, updated_at = now()
        where client_id = $1
      `,
      [ids.challenger]
    );

    await q(
      `
        insert into ovnis_transactions (client_id, amount, type, description, related_redemption_id)
        values ($1, -50, 'redemption', 'Smoke pending redemption', $2)
      `,
      [ids.challenger, ids.redemption]
    );

    await assertInvariant("pending redemption", 300);

    await q(
      `
        insert into ovnis_games (id, nombre, type, activo)
        values ($1, 'Smoke challenge', 'physical', true)
      `,
      [ids.game]
    );

    await expectDbFailure("self bet", () =>
      q(
        `
          insert into ovnis_bets (id, game_id, challenger_id, opponent_id, amount, status, acceptance_expires_at)
          values ($1, $2, $3, $3, 10, 'pending', now() + interval '1 hour')
        `,
        [randomUUID(), ids.game, ids.challenger]
      )
    );

    await q(
      `
        insert into ovnis_bets (id, game_id, challenger_id, opponent_id, amount, status, accepted_at, acceptance_expires_at, play_expires_at)
        values ($1, $2, $3, $4, 20, 'accepted', now(), now() + interval '1 hour', now() + interval '2 hours')
      `,
      [ids.bet, ids.game, ids.challenger, ids.opponent]
    );

    await q(
      `
        update ovnis_balance
        set balance = balance - 20, pending_balance = pending_balance + 20, updated_at = now()
        where client_id in ($1, $2)
      `,
      [ids.challenger, ids.opponent]
    );

    await q(
      `
        insert into ovnis_transactions (client_id, amount, type, description, related_bet_id)
        values
          ($1, -20, 'bet_lock', 'Smoke challenger lock', $3),
          ($2, -20, 'bet_lock', 'Smoke opponent lock', $3)
      `,
      [ids.challenger, ids.opponent, ids.bet]
    );

    await assertInvariant("accepted bet lock", 300);

    await q(
      `
        update ovnis_bets
        set status = 'challenger_won', resolved_at = now()
        where id = $1
      `,
      [ids.bet]
    );

    await q(
      `
        update ovnis_balance
        set balance = balance + 40, pending_balance = pending_balance - 20, updated_at = now()
        where client_id = $1
      `,
      [ids.challenger]
    );

    await q(
      `
        update ovnis_balance
        set pending_balance = pending_balance - 20, updated_at = now()
        where client_id = $1
      `,
      [ids.opponent]
    );

    await q(
      `
        insert into ovnis_transactions (client_id, amount, type, description, related_bet_id)
        values
          ($1, 40, 'bet_win', 'Smoke challenger won', $3),
          ($2, -20, 'bet_burn', 'Smoke opponent lost to challenger', $3)
      `,
      [ids.challenger, ids.opponent, ids.bet]
    );

    await assertInvariant("settled challenger win", 300);

    await q(
      `
        update ovnis_redemptions
        set status = 'delivered', delivered_at = now()
        where id = $1
      `,
      [ids.redemption]
    );

    await assertInvariant("delivered redemption burn", 250);

    await q("rollback");
    console.log("OK smoke transaction rolled back");

    const [residual] = await q(
      `
        select
          (select count(*)::int from "user" where id = $1) as users,
          (select count(*)::int from clients where id = any($2::uuid[])) as clients,
          (select count(*)::int from ovnis_balance where client_id = any($2::uuid[])) as balances,
          (select count(*)::int from ovnis_transactions where client_id = any($2::uuid[])) as transactions,
          (select count(*)::int from ovnis_redemptions where id = $3) as redemptions,
          (select count(*)::int from ovnis_bets where id = $4) as bets
      `,
      [ids.user, [ids.challenger, ids.opponent], ids.redemption, ids.bet]
    );

    assert(
      Object.values(residual).every((count) => count === 0),
      `rollback left residual rows: ${JSON.stringify(residual)}`
    );
    console.log("OK rollback left no smoke rows behind");
  } catch (error) {
    await q("rollback").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

try {
  await main();
} finally {
  await pool.end();
}
