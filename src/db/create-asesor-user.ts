/**
 * Crea el usuario Was (asesor financiero) en producción.
 *
 * Cómo correr:
 *   WAS_PASSWORD=tupassword npx tsx src/db/create-asesor-user.ts
 *
 * O con .env.local ya configurado:
 *   npx tsx src/db/create-asesor-user.ts
 */

import "./load-env";

import { db } from "@/db";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { user } from "@/db/schema";

const WAS_PASSWORD = process.env.WAS_PASSWORD ?? "A51asesor2025!";
const WAS_EMAIL = "contact@memas.agency";

if (!process.env.DATABASE_URL) {
  console.error("Error: DATABASE_URL no está configurada.");
  process.exit(1);
}

async function createAsesorUser() {
  console.log("=== Creando usuario Asesor (Was) ===\n");

  const existing = await db.query.user.findFirst({
    where: (u, { eq }) => eq(u.email, WAS_EMAIL),
  });

  if (!existing) {
    // Crear con rol barbero y luego forzar "asesor" (el admin plugin no conoce este rol custom)
    const created = await auth.api.createUser({
      body: {
        email: WAS_EMAIL,
        password: WAS_PASSWORD,
        name: "Was",
        role: "barbero",
      },
    });
    await db
      .update(user)
      .set({ role: "asesor" })
      .where(eq(user.id, created.user.id));
    console.log(`✓ Usuario Was creado (ID: ${created.user.id})`);
  } else {
    await (auth.api.setPassword as any)({
      body: { newPassword: WAS_PASSWORD, userId: existing.id },
    });
    await db
      .update(user)
      .set({ role: "asesor" })
      .where(eq(user.id, existing.id));
    console.log(`✓ Usuario Was actualizado (ID: ${existing.id})`);
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  Email:    ${WAS_EMAIL}`);
  console.log(`  Password: ${WAS_PASSWORD}`);
  console.log(`  Rol:      asesor`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

createAsesorUser().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
