import { db } from "@/db";
import type { CategoriaGastoRapidoKey } from "@/lib/types";
import { sql } from "drizzle-orm";

export const GASTO_RAPIDO_CATEGORIAS: Array<{
  key: CategoriaGastoRapidoKey;
  emoji: string;
  label: string;
}> = [
  { key: "cafe", emoji: "☕", label: "Cafe / capsulas" },
  { key: "bebida", emoji: "🥤", label: "Bebidas" },
  { key: "comida", emoji: "🍕", label: "Comida / snacks" },
  { key: "barber", emoji: "🧴", label: "Productos barber" },
  { key: "limpieza", emoji: "🧹", label: "Limpieza" },
  { key: "compras", emoji: "📦", label: "Compras / reposicion" },
  { key: "otros", emoji: "💸", label: "Otros" },
];

export const GASTO_RAPIDO_EMOJIS = new Set(
  GASTO_RAPIDO_CATEGORIAS.map((categoria) => categoria.emoji)
);

export function getCategoriaGastoRapidoByEmoji(emoji: string) {
  return GASTO_RAPIDO_CATEGORIAS.find((categoria) => categoria.emoji === emoji) ?? null;
}

export function getCategoriaGastoRapidoByKey(key: string) {
  return GASTO_RAPIDO_CATEGORIAS.find((categoria) => categoria.key === key) ?? null;
}

export async function hasGastosRapidosSchema(): Promise<boolean> {
  try {
    const result = await db.execute(sql`
      select count(*)::int as count
      from information_schema.columns
      where table_name = 'gastos'
        and column_name in ('tipo', 'categoria_visual')
    `);
    const count = Number(result.rows[0]?.count ?? 0);
    return count === 2;
  } catch {
    return false;
  }
}
