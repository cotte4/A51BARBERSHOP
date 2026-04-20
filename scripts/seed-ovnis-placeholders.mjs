import dotenv from "dotenv";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

dotenv.config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not configured");
}

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const redemptionItems = [
  {
    label: "Consumicion gratis",
    type: "consumicion",
    costOvnis: 200,
    value: 0,
    activo: true,
    stock: null,
  },
  {
    label: "Descuento 10% en tu proximo corte",
    type: "descuento_pct",
    costOvnis: 333,
    value: 10,
    activo: true,
    stock: null,
  },
  {
    label: "Corte gratis",
    type: "descuento_pct",
    costOvnis: 777,
    value: 100,
    activo: true,
    stock: null,
  },
];

const ruletaPrizes = [
  { label: "+111 OVNIS", type: "ovnis", ovnisAmount: 111, weight: 10, activo: true, redemptionItemLabel: null },
  { label: "+55 OVNIS", type: "ovnis", ovnisAmount: 55, weight: 20, activo: true, redemptionItemLabel: null },
  { label: "+22 OVNIS", type: "ovnis", ovnisAmount: 22, weight: 35, activo: true, redemptionItemLabel: null },
  {
    label: "Consumicion gratis",
    type: "redemption_item",
    ovnisAmount: 0,
    weight: 15,
    activo: true,
    redemptionItemLabel: "Consumicion gratis",
  },
  { label: "Suerte la proxima", type: "nada", ovnisAmount: 0, weight: 20, activo: true, redemptionItemLabel: null },
];

const games = [
  {
    nombre: "Subasta Futbongera",
    type: "digital",
    externalUrl: "https://subasta-futbongera.vercel.app/",
    descripcion: "Placeholder digital challenge para apuestas Marcianas.",
    activo: true,
  },
  {
    nombre: "Trucong",
    type: "digital",
    externalUrl: "https://trucong-web.vercel.app/",
    descripcion: "Placeholder digital challenge para apuestas Marcianas.",
    activo: true,
  },
  {
    nombre: "Impostor",
    type: "digital",
    externalUrl: null,
    descripcion: "Juego placeholder inactivo para probar estados admin.",
    activo: false,
  },
  {
    nombre: "Ternas",
    type: "physical",
    externalUrl: null,
    descripcion: "Juego fisico placeholder para apuestas presenciales.",
    activo: true,
  },
];

async function q(text, params = []) {
  const result = await pool.query(text, params);
  return result.rows;
}

async function upsertRedemptionItem(item) {
  const [existing] = await q("select id from ovnis_redemption_items where label = $1 limit 1", [item.label]);

  if (existing) {
    await q(
      `
        update ovnis_redemption_items
        set type = $2,
            cost_ovnis = $3,
            value = $4,
            activo = $5,
            stock = $6
        where id = $1
      `,
      [existing.id, item.type, item.costOvnis, item.value, item.activo, item.stock]
    );
    console.log(`OK updated redemption item: ${item.label}`);
    return existing.id;
  }

  const [created] = await q(
    `
      insert into ovnis_redemption_items (label, type, cost_ovnis, value, activo, stock)
      values ($1, $2, $3, $4, $5, $6)
      returning id
    `,
    [item.label, item.type, item.costOvnis, item.value, item.activo, item.stock]
  );
  console.log(`OK created redemption item: ${item.label}`);
  return created.id;
}

async function upsertRuletaPrize(prize, itemIdsByLabel) {
  const redemptionItemId = prize.redemptionItemLabel ? itemIdsByLabel.get(prize.redemptionItemLabel) : null;
  const [existing] = await q("select id from ovnis_ruleta_prizes where label = $1 limit 1", [prize.label]);

  if (existing) {
    await q(
      `
        update ovnis_ruleta_prizes
        set type = $2,
            ovnis_amount = $3,
            redemption_item_id = $4,
            weight = $5,
            activo = $6
        where id = $1
      `,
      [existing.id, prize.type, prize.ovnisAmount, redemptionItemId, prize.weight, prize.activo]
    );
    console.log(`OK updated ruleta prize: ${prize.label}`);
    return;
  }

  await q(
    `
      insert into ovnis_ruleta_prizes (label, type, ovnis_amount, redemption_item_id, weight, activo)
      values ($1, $2, $3, $4, $5, $6)
    `,
    [prize.label, prize.type, prize.ovnisAmount, redemptionItemId, prize.weight, prize.activo]
  );
  console.log(`OK created ruleta prize: ${prize.label}`);
}

async function upsertGame(game) {
  const [existing] = await q("select id from ovnis_games where nombre = $1 limit 1", [game.nombre]);

  if (existing) {
    await q(
      `
        update ovnis_games
        set type = $2,
            external_url = $3,
            descripcion = $4,
            activo = $5
        where id = $1
      `,
      [existing.id, game.type, game.externalUrl, game.descripcion, game.activo]
    );
    console.log(`OK updated game: ${game.nombre}`);
    return;
  }

  await q(
    `
      insert into ovnis_games (nombre, type, external_url, descripcion, activo)
      values ($1, $2, $3, $4, $5)
    `,
    [game.nombre, game.type, game.externalUrl, game.descripcion, game.activo]
  );
  console.log(`OK created game: ${game.nombre}`);
}

async function seedEarningValues() {
  const serviceRows = await q(
    `
      update servicios
      set ovnis_value = case
        when lower(nombre) like '%premium%'
          or lower(nombre) like '%degrade%'
          or lower(nombre) like '%degradé%'
          or lower(nombre) like '%color%'
          then 167
        when (lower(nombre) like '%barba%' or lower(nombre) like '%beard%')
          and lower(nombre) not like '%corte%'
          then 55
        else 111
      end
      returning id
    `
  );

  const productRows = await q(
    `
      update productos
      set ovnis_value = case
        when es_consumicion = true then 22
        else 44
      end
      returning id
    `
  );

  console.log(`OK configured OVNIS earning values: ${serviceRows.length} services, ${productRows.length} products`);
}

try {
  const itemIdsByLabel = new Map();
  for (const item of redemptionItems) {
    itemIdsByLabel.set(item.label, await upsertRedemptionItem(item));
  }

  for (const prize of ruletaPrizes) {
    await upsertRuletaPrize(prize, itemIdsByLabel);
  }

  for (const game of games) {
    await upsertGame(game);
  }

  await seedEarningValues();

  const [counts] = await q(
    `
      select
        (select count(*)::int from ovnis_redemption_items where activo = true) as active_items,
        (select count(*)::int from ovnis_ruleta_prizes where activo = true) as active_ruleta_prizes,
        (select count(*)::int from ovnis_games where activo = true) as active_games,
        (select count(*)::int from servicios where ovnis_value > 0) as earning_services,
        (select count(*)::int from productos where ovnis_value > 0) as earning_products
    `
  );

  console.log("OK OVNIS placeholders ready", JSON.stringify(counts));
} finally {
  await pool.end();
}
