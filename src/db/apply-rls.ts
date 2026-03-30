import "./load-env";

import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL_UNPOOLED!);

async function applyRLS() {
  console.log("Aplicando políticas RLS...");

  await sql`ALTER TABLE atenciones ENABLE ROW LEVEL SECURITY`;
  await sql`ALTER TABLE liquidaciones ENABLE ROW LEVEL SECURITY`;

  await sql`DROP POLICY IF EXISTS "admin_all_atenciones" ON atenciones`;
  await sql`CREATE POLICY "admin_all_atenciones" ON atenciones FOR ALL USING (true) WITH CHECK (true)`;

  await sql`DROP POLICY IF EXISTS "admin_all_liquidaciones" ON liquidaciones`;
  await sql`CREATE POLICY "admin_all_liquidaciones" ON liquidaciones FOR ALL USING (true) WITH CHECK (true)`;

  console.log("✓ RLS aplicado exitosamente.");
}

applyRLS().catch(console.error);
