// Compara el esquema de Drizzle (src/db/schema.ts) contra la base real: tablas, columnas, índices,
// checks y FKs que el código espera y la base no tiene. Solo lee.
// Por qué existe: 0020 y 0021 figuraban como aplicadas en __drizzle_migrations sin haber corrido,
// y faltaron 6 tablas en prod durante meses sin que nada avisara (QA 2026-10-20).
// Uso: npm run db:check:esquema   (sale con código 1 si falta algo)
import { is } from "drizzle-orm";
import { getTableConfig, PgTable } from "drizzle-orm/pg-core";
import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";
import * as schemaMod from "../src/db/schema";

dotenv.config({ path: ".env.local" });

// tsx carga schema.ts como CommonJS: los exports quedan en `default`.
const schema = ((schemaMod as unknown as { default?: object }).default ?? schemaMod) as Record<string, unknown>;
// Postgres recorta los nombres a 63 caracteres.
const pgName = (name: string) => name.slice(0, 63);

async function main() {
  const sql = neon(process.env.DATABASE_URL!);
  const [cols, idx, cons] = (await Promise.all([
    sql.query("select table_name t, column_name c from information_schema.columns where table_schema = 'public'"),
    sql.query("select indexname n from pg_indexes where schemaname = 'public'"),
    sql.query("select conname n from pg_constraint c join pg_namespace ns on ns.oid = c.connamespace where nspname = 'public'"),
  ])) as [{ t: string; c: string }[], { n: string }[], { n: string }[]];

  const columnas = new Set(cols.map((r) => `${r.t}.${r.c}`));
  const tablas = new Set(cols.map((r) => r.t));
  const indices = new Set(idx.map((r) => r.n));
  const restricciones = new Set(cons.map((r) => r.n));

  const faltan: string[] = [];
  for (const valor of Object.values(schema)) {
    if (!is(valor, PgTable)) continue;
    const t = getTableConfig(valor);
    if (!tablas.has(t.name)) {
      faltan.push(`tabla ${t.name}`);
      continue;
    }
    for (const c of t.columns) if (!columnas.has(`${t.name}.${c.name}`)) faltan.push(`columna ${t.name}.${c.name}`);
    for (const i of t.indexes) if (i.config.name && !indices.has(pgName(i.config.name))) faltan.push(`índice ${i.config.name}`);
    for (const ch of t.checks) if (!restricciones.has(pgName(ch.name))) faltan.push(`check ${ch.name}`);
    for (const fk of t.foreignKeys) if (!restricciones.has(pgName(fk.getName()))) faltan.push(`fk ${fk.getName()}`);
  }

  if (faltan.length === 0) {
    console.log("✓ La base tiene todo lo que declara el esquema.");
    return;
  }
  console.error(`✗ Faltan ${faltan.length} cosas en la base:\n  ${faltan.join("\n  ")}`);
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
