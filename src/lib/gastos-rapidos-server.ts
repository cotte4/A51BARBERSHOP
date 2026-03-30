import { db } from "@/db";
import { sql } from "drizzle-orm";

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
