/**
 * Setup de usuarios reales para producción
 *
 * Crea (o actualiza el password de) Pinky y Gabote usando contraseñas
 * definidas como variables de entorno — nunca hardcodeadas.
 *
 * Variables requeridas en .env.local (o en Vercel env vars):
 *   PINKY_PASSWORD=<password seguro para Pinky>
 *   GABOTE_PASSWORD=<password seguro para Gabote>
 *
 * Cómo correr localmente contra la DB de producción:
 *   PINKY_PASSWORD=xxx GABOTE_PASSWORD=yyy npx tsx src/db/setup-prod-users.ts
 *
 * O poner los passwords en .env.local y correr:
 *   npx tsx src/db/setup-prod-users.ts
 */

import "./load-env";

import { db } from "@/db";
import { auth } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { user } from "@/db/schema";

const PINKY_PASSWORD = process.env.PINKY_PASSWORD;
const GABOTE_PASSWORD = process.env.GABOTE_PASSWORD;

if (!PINKY_PASSWORD || !GABOTE_PASSWORD) {
  console.error("Error: PINKY_PASSWORD y GABOTE_PASSWORD deben estar definidos.");
  console.error("  Ejemplo: PINKY_PASSWORD=xxx GABOTE_PASSWORD=yyy npx tsx src/db/setup-prod-users.ts");
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("Error: DATABASE_URL no está configurada.");
  process.exit(1);
}

async function setupProdUsers() {
  console.log("=== Setup de usuarios de producción A51 Barber ===\n");

  await setupUser({
    email: "pinky@a51barber.com",
    name: "Pinky",
    password: PINKY_PASSWORD!,
    role: "admin",
  });

  await setupUser({
    email: "gabote@a51barber.com",
    name: "Gabote",
    password: GABOTE_PASSWORD!,
    role: "barbero",
  });

  console.log("\n✓ Setup completado.");
  console.log("  Pinky:  pinky@a51barber.com  (admin)");
  console.log("  Gabote: gabote@a51barber.com (barbero)");
}

async function setupUser({
  email,
  name,
  password,
  role,
}: {
  email: string;
  name: string;
  password: string;
  role: "admin" | "barbero";
}) {
  const existing = await db.query.user.findFirst({
    where: (u, { eq }) => eq(u.email, email),
  });

  if (!existing) {
    // Crear usuario nuevo
    const created = await auth.api.createUser({
      body: { email, password, name, role },
    });
    console.log(`  ✓ ${name} creado (ID: ${created.user.id})`);
  } else {
    // Usuario ya existe — actualizar password y rol
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (auth.api.setPassword as any)({
      body: { newPassword: password, userId: existing.id },
    });
    // Asegurarse de que el rol sea correcto
    await db
      .update(user)
      .set({ role })
      .where(eq(user.id, existing.id));
    console.log(`  ✓ ${name} actualizado (password + rol: ${role})`);
  }
}

setupProdUsers().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
