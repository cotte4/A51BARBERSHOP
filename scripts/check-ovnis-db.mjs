import dotenv from "dotenv";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

dotenv.config({ path: ".env.local" });

const expectedTables = [
  "ovnis_balance",
  "ovnis_pending_credits",
  "ovnis_transactions",
  "ovnis_redemption_items",
  "ovnis_redemptions",
  "ovnis_ruleta_prizes",
  "ovnis_ruleta_spins",
  "ovnis_games",
  "ovnis_bets",
];

const expectedColumns = {
  servicios: ["ovnis_value"],
  productos: ["ovnis_value"],
  ovnis_balance: ["client_id", "balance", "pending_balance", "updated_at"],
  ovnis_pending_credits: ["id", "client_id", "atencion_id", "amount", "expires_at", "redeemed_at"],
  ovnis_transactions: ["id", "client_id", "amount", "type", "related_bet_id", "related_redemption_id", "idempotency_key"],
  ovnis_redemption_items: ["id", "label", "type", "cost_ovnis", "activo", "stock"],
  ovnis_redemptions: ["id", "client_id", "item_id", "cost_ovnis", "status"],
  ovnis_ruleta_prizes: ["id", "label", "type", "ovnis_amount", "redemption_item_id", "weight", "activo"],
  ovnis_ruleta_spins: ["client_id", "prize_id", "spun_at"],
  ovnis_games: ["id", "nombre", "type", "external_url", "activo"],
  ovnis_bets: ["id", "game_id", "challenger_id", "opponent_id", "amount", "status", "claim_attempts", "acceptance_expires_at", "play_expires_at"],
};

const expectedConstraints = [
  "ovnis_balance_non_negative",
  "ovnis_pending_credits_amount_positive",
  "ovnis_transactions_type_check",
  "ovnis_transactions_amount_nonzero",
  "ovnis_redemption_items_type_check",
  "ovnis_redemption_items_cost_positive",
  "ovnis_redemption_items_stock_nonneg",
  "ovnis_ruleta_prizes_type_check",
  "ovnis_ruleta_prizes_weight_positive",
  "ovnis_ruleta_prizes_type_consistency",
  "ovnis_bets_status_check",
  "ovnis_bets_claim_attempts_max",
  "ovnis_bets_amount_positive",
  "ovnis_bets_distinct_players",
];

const expectedIndexes = [
  "ovnis_pending_credits_atencion_id_idx",
  "ovnis_transactions_idempotency_key_idx",
  "ovnis_bets_status_idx",
  "ovnis_bets_acceptance_expiry_idx",
  "ovnis_bets_play_expiry_idx",
];

function fail(message) {
  console.error(`FAIL ${message}`);
  process.exitCode = 1;
}

function pass(message) {
  console.log(`OK ${message}`);
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

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not configured");
}

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function sql(strings, ...values) {
  if (typeof strings === "string") {
    const result = await pool.query(strings);
    return result.rows;
  }

  let text = "";
  for (let index = 0; index < strings.length; index += 1) {
    text += strings[index];
    if (index < values.length) {
      text += `$${index + 1}`;
    }
  }

  const result = await pool.query(text, values);
  return result.rows;
}

const tables = await sql`
  select table_name
  from information_schema.tables
  where table_schema = 'public'
    and table_name = any(${expectedTables})
  order by table_name
`;

const foundTables = new Set(tables.map((row) => row.table_name));
for (const table of expectedTables) {
  if (foundTables.has(table)) pass(`table ${table} exists`);
  else fail(`missing table ${table}`);
}

const columnRows = await sql`
  select table_name, column_name
  from information_schema.columns
  where table_schema = 'public'
    and table_name = any(${Object.keys(expectedColumns)})
`;

const columnsByTable = new Map();
for (const row of columnRows) {
  const columns = columnsByTable.get(row.table_name) ?? new Set();
  columns.add(row.column_name);
  columnsByTable.set(row.table_name, columns);
}

for (const [table, columns] of Object.entries(expectedColumns)) {
  const found = columnsByTable.get(table) ?? new Set();
  for (const column of columns) {
    if (found.has(column)) pass(`column ${table}.${column} exists`);
    else fail(`missing column ${table}.${column}`);
  }
}

const constraints = await sql`
  select conname
  from pg_constraint
  where connamespace = 'public'::regnamespace
    and conname = any(${expectedConstraints})
`;
const foundConstraints = new Set(constraints.map((row) => row.conname));
for (const constraint of expectedConstraints) {
  if (foundConstraints.has(constraint)) pass(`constraint ${constraint} exists`);
  else fail(`missing constraint ${constraint}`);
}

const indexes = await sql`
  select indexname
  from pg_indexes
  where schemaname = 'public'
    and indexname = any(${expectedIndexes})
`;
const foundIndexes = new Set(indexes.map((row) => row.indexname));
for (const index of expectedIndexes) {
  if (foundIndexes.has(index)) pass(`index ${index} exists`);
  else fail(`missing index ${index}`);
}

const counts = {};
for (const table of expectedTables) {
  const [row] = await sql(`select count(*)::int as count from public.${table}`);
  counts[table] = row.count;
}

console.log("COUNTS", JSON.stringify(counts, null, 2));

const [balanceRow] = await sql`
  select
    coalesce(sum(balance), 0)::int as in_balance,
    coalesce(sum(pending_balance), 0)::int as in_pending_balance
  from ovnis_balance
`;

const [redemptionsRow] = await sql`
  select coalesce(sum(cost_ovnis), 0)::int as in_pending_redemptions
  from ovnis_redemptions
  where status = 'pending'
`;

const [serviceConfigRow] = await sql`
  select
    count(*)::int as total,
    count(*) filter (where ovnis_value > 0)::int as with_ovnis
  from servicios
`;

const [productConfigRow] = await sql`
  select
    count(*)::int as total,
    count(*) filter (where ovnis_value > 0)::int as with_ovnis
  from productos
`;

const txRows = await sql`
  select
    t.amount::int as amount,
    t.type,
    r.status as redemption_status,
    b.status as bet_status
  from ovnis_transactions t
  left join ovnis_redemptions r on t.related_redemption_id = r.id
  left join ovnis_bets b on t.related_bet_id = b.id
`;

let emittedTotal = 0;
let burnedTotal = 0;
for (const row of txRows) {
  const kind = classify(row);
  if (kind === "emitted") emittedTotal += row.amount;
  if (kind === "burned") burnedTotal += Math.abs(row.amount);
}

const inBalance = balanceRow.in_balance;
const inPendingBalance = balanceRow.in_pending_balance;
const inPendingRedemptions = redemptionsRow.in_pending_redemptions;
const netInSystem = emittedTotal - burnedTotal;
const accountedFor = inBalance + inPendingBalance + inPendingRedemptions;

console.log(
  "INVARIANT",
  JSON.stringify(
    {
      emittedTotal,
      burnedTotal,
      netInSystem,
      inBalance,
      inPendingBalance,
      inPendingRedemptions,
      accountedFor,
      driftAlert: netInSystem !== accountedFor,
    },
    null,
    2
  )
);

console.log(
  "EARNING_CONFIG",
  JSON.stringify(
    {
      servicios: serviceConfigRow,
      productos: productConfigRow,
    },
    null,
    2
  )
);

if (serviceConfigRow.total > 0 && serviceConfigRow.with_ovnis === 0) {
  fail("services exist but none have ovnis_value > 0");
}

if (productConfigRow.total > 0 && productConfigRow.with_ovnis === 0) {
  fail("products exist but none have ovnis_value > 0");
}

if (netInSystem !== accountedFor) {
  fail("OVNIS invariant does not close on live data");
}

await pool.end();
