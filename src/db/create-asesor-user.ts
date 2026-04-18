/**
 * Crea el usuario Was (asesor financiero) en produccion.
 *
 * Como correr:
 *   WAS_PASSWORD=tupassword npx tsx src/db/create-asesor-user.ts
 *
 * O con .env.local ya configurado:
 *   npx tsx src/db/create-asesor-user.ts
 */

import "./load-env";

import { db } from "@/db";
import { user } from "@/db/schema";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";

const WAS_PASSWORD = process.env.WAS_PASSWORD ?? "A51asesor2025!";
const WAS_EMAIL = "contact@memas.agency";

if (!process.env.DATABASE_URL) {
  console.error("Error: DATABASE_URL no esta configurada.");
  process.exit(1);
}

async function createAsesorUser() {
  console.log("=== Creando usuario Asesor (Was) ===\n");

  const existing = await db.query.user.findFirst({
    where: (u, { eq: eqField }) => eqField(u.email, WAS_EMAIL),
  });

  if (!existing) {
    const created = await auth.api.createUser({
      body: {
        email: WAS_EMAIL,
        password: WAS_PASSWORD,
        name: "Was",
        role: "asesor",
      },
    });
    console.log(`Usuario Was creado (ID: ${created.user.id})`);
  } else {
    await (auth.api.setPassword as any)({
      body: { newPassword: WAS_PASSWORD, userId: existing.id },
    });
    await db
      .update(user)
      .set({ role: "asesor" })
      .where(eq(user.id, existing.id));
    console.log(`Usuario Was actualizado (ID: ${existing.id})`);
  }

  console.log("\n-------------------------------------");
  console.log(`  Email:    ${WAS_EMAIL}`);
  console.log(`  Password: ${WAS_PASSWORD}`);
  console.log("  Rol:      asesor");
  console.log("-------------------------------------\n");
}

createAsesorUser().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
