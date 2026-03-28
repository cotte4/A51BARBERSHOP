/**
 * Seed inicial de A51 Barber
 *
 * Qué crea:
 * - Usuarios Better Auth: Pinky (admin) y Gabote (barbero)
 * - Barberos en tabla barberos (vinculados a los users por nombre)
 * - Servicios: Corte + Corte y Barba con historial de precio Otoño 2026
 * - Medios de pago: Efectivo, MP QR, Transferencia, Posnet débito, Posnet crédito
 * - Temporada: Otoño 2026 (Mayo–Junio 2026)
 *
 * Cómo correr:
 *   npx tsx src/db/seed.ts
 *
 * Requiere DATABASE_URL en .env.local
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import { auth } from "../lib/auth";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL no está configurada en .env.local");
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql, { schema });

async function seed() {
  console.log("Iniciando seed de A51 Barber...\n");

  // ————————————————————————————
  // 1. Crear usuarios Better Auth
  // ————————————————————————————
  console.log("Creando usuarios Better Auth...");

  let pinkyUserId: string;
  let gaboteUserId: string;

  try {
    const pinkyUser = await auth.api.createUser({
      body: {
        email: "pinky@a51barber.com",
        password: "pinky1234",
        name: "Pinky",
        role: "admin",
      },
    });
    pinkyUserId = pinkyUser.user.id;
    console.log(`  ✓ Pinky creado (ID: ${pinkyUserId})`);
  } catch (e: unknown) {
    if (
      e instanceof Error &&
      e.message.toLowerCase().includes("already exists")
    ) {
      console.log("  ~ Pinky ya existe, saltando...");
      // Obtener el ID del usuario existente
      const existing = await db.query.barberos.findFirst({
        where: (b, { eq }) => eq(b.nombre, "Pinky"),
      });
      pinkyUserId = existing?.id ?? "pinky-placeholder";
    } else {
      throw e;
    }
  }

  try {
    const gaboteUser = await auth.api.createUser({
      body: {
        email: "gabote@a51barber.com",
        password: "gabote1234",
        name: "Gabote",
        role: "barbero",
      },
    });
    gaboteUserId = gaboteUser.user.id;
    console.log(`  ✓ Gabote creado (ID: ${gaboteUserId})`);
  } catch (e: unknown) {
    if (
      e instanceof Error &&
      e.message.toLowerCase().includes("already exists")
    ) {
      console.log("  ~ Gabote ya existe, saltando...");
      const existing = await db.query.barberos.findFirst({
        where: (b, { eq }) => eq(b.nombre, "Gabote"),
      });
      gaboteUserId = existing?.id ?? "gabote-placeholder";
    } else {
      throw e;
    }
  }

  // ————————————————————————————
  // 2. Insertar barberos
  // ————————————————————————————
  console.log("\nInsertando barberos...");

  const [pinky] = await db
    .insert(schema.barberos)
    .values({
      nombre: "Pinky",
      rol: "admin",
      tipoModelo: "variable",
      porcentajeComision: "100.00",
      alquilerBancoMensual: null,
      sueldoMinimoGarantizado: null,
      activo: true,
    })
    .onConflictDoNothing()
    .returning();

  const [gabote] = await db
    .insert(schema.barberos)
    .values({
      nombre: "Gabote",
      rol: "barbero",
      tipoModelo: "hibrido",
      porcentajeComision: "75.00",
      alquilerBancoMensual: "300000.00",
      sueldoMinimoGarantizado: null,
      activo: true,
    })
    .onConflictDoNothing()
    .returning();

  if (pinky) console.log(`  ✓ Barbero Pinky (ID: ${pinky.id})`);
  if (gabote) console.log(`  ✓ Barbero Gabote (ID: ${gabote.id})`);

  // ————————————————————————————
  // 3. Insertar servicios
  // ————————————————————————————
  console.log("\nInsertando servicios...");

  const [corte] = await db
    .insert(schema.servicios)
    .values({
      nombre: "Corte",
      precioBase: "13000.00",
      activo: true,
    })
    .returning();

  const [corteBarba] = await db
    .insert(schema.servicios)
    .values({
      nombre: "Corte y Barba",
      precioBase: "16000.00",
      activo: true,
    })
    .returning();

  console.log(`  ✓ Servicio "Corte" a $13.000 (ID: ${corte.id})`);
  console.log(`  ✓ Servicio "Corte y Barba" a $16.000 (ID: ${corteBarba.id})`);

  // ————————————————————————————
  // 4. Historial de precios (vigente desde inicio Otoño 2026)
  // ————————————————————————————
  console.log("\nRegistrando historial de precios...");

  const barberoRef = pinky ?? (await db.query.barberos.findFirst({ where: (b, { eq }) => eq(b.nombre, "Pinky") }));

  if (barberoRef) {
    await db.insert(schema.serviciosPreciosHistorial).values({
      servicioId: corte.id,
      precio: "13000.00",
      vigenteDesdе: "2026-05-01",
      motivo: "Precio inicial Otoño 2026",
      creadoPor: barberoRef.id,
    });

    await db.insert(schema.serviciosPreciosHistorial).values({
      servicioId: corteBarba.id,
      precio: "16000.00",
      vigenteDesdе: "2026-05-01",
      motivo: "Precio inicial Otoño 2026",
      creadoPor: barberoRef.id,
    });

    console.log("  ✓ Historial de precios registrado");
  }

  // ————————————————————————————
  // 5. Insertar medios de pago
  // ————————————————————————————
  console.log("\nInsertando medios de pago...");

  const mediosPago = [
    { nombre: "Efectivo", comisionPorcentaje: "0.00" },
    { nombre: "MP QR", comisionPorcentaje: "6.00" },
    { nombre: "Transferencia", comisionPorcentaje: "0.00" },
    { nombre: "Posnet débito", comisionPorcentaje: "1.50" },
    { nombre: "Posnet crédito", comisionPorcentaje: "3.50" },
  ];

  for (const medio of mediosPago) {
    await db
      .insert(schema.mediosPago)
      .values({ ...medio, activo: true })
      .returning();
    console.log(`  ✓ ${medio.nombre} (${medio.comisionPorcentaje}%)`);
  }

  // ————————————————————————————
  // 6. Temporada Otoño 2026
  // ————————————————————————————
  console.log("\nInsertando temporada Otoño 2026...");

  await db.insert(schema.temporadas).values({
    nombre: "Otoño 2026",
    fechaInicio: "2026-05-01",
    fechaFin: "2026-06-30",
    cortesDiaProyectados: 15,
    precioBaseProyectado: "13000.00",
  });

  console.log("  ✓ Temporada Otoño 2026 (01/05/2026 – 30/06/2026, 15 cortes/día proyectados)");

  console.log("\n✓ Seed completado exitosamente.\n");
  console.log("Usuarios creados:");
  console.log("  Admin:   pinky@a51barber.com  / pinky1234");
  console.log("  Barbero: gabote@a51barber.com / gabote1234");
}

seed().catch((err) => {
  console.error("Error en seed:", err);
  process.exit(1);
});
