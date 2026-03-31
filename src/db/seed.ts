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

import "./load-env";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
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
      console.log("  ~ Pinky ya existe, obteniendo user.id desde tabla user...");
      const existingUser = await db.query.user.findFirst({
        where: (u, { eq }) => eq(u.email, "pinky@a51barber.com"),
      });
      if (!existingUser) throw new Error("No se encontró el usuario Pinky en la tabla user");
      pinkyUserId = existingUser.id;
      console.log(`  ~ Pinky user.id: ${pinkyUserId}`);
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
      console.log("  ~ Gabote ya existe, obteniendo user.id desde tabla user...");
      const existingUser = await db.query.user.findFirst({
        where: (u, { eq }) => eq(u.email, "gabote@a51barber.com"),
      });
      if (!existingUser) throw new Error("No se encontró el usuario Gabote en la tabla user");
      gaboteUserId = existingUser.id;
      console.log(`  ~ Gabote user.id: ${gaboteUserId}`);
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
      porcentajeComision: "60.00",
      alquilerBancoMensual: null,
      sueldoMinimoGarantizado: null,
      activo: true,
    })
    .onConflictDoNothing()
    .returning();

  if (pinky) console.log(`  ✓ Barbero Pinky (ID: ${pinky.id})`);
  if (gabote) console.log(`  ✓ Barbero Gabote (ID: ${gabote.id})`);

  // Siempre actualizar userId en barberos — así funciona tanto en primera ejecución
  // como en re-ejecuciones donde el insert fue ignorado por onConflictDoNothing
  console.log("\nVinculando barberos con usuarios Better Auth...");

  await db
    .update(schema.barberos)
    .set({ userId: pinkyUserId })
    .where(eq(schema.barberos.nombre, "Pinky"));
  console.log(`  ✓ Pinky.userId = ${pinkyUserId}`);

  await db
    .update(schema.barberos)
    .set({ userId: gaboteUserId })
    .where(eq(schema.barberos.nombre, "Gabote"));
  console.log(`  ✓ Gabote.userId = ${gaboteUserId}`);

  // ————————————————————————————
  // 3. Insertar servicios
  // ————————————————————————————
  console.log("\nInsertando servicios...");

  let corte = await db.query.servicios.findFirst({ where: (s, { eq }) => eq(s.nombre, "Corte") });
  if (!corte) {
    [corte] = await db.insert(schema.servicios).values({ nombre: "Corte", precioBase: "13000.00", activo: true }).returning();
    console.log(`  ✓ Servicio "Corte" creado (ID: ${corte!.id})`);
  } else {
    console.log(`  ~ Servicio "Corte" ya existe (ID: ${corte.id})`);
  }

  let corteBarba = await db.query.servicios.findFirst({ where: (s, { eq }) => eq(s.nombre, "Corte y Barba") });
  if (!corteBarba) {
    [corteBarba] = await db.insert(schema.servicios).values({ nombre: "Corte y Barba", precioBase: "16000.00", activo: true }).returning();
    console.log(`  ✓ Servicio "Corte y Barba" creado (ID: ${corteBarba!.id})`);
  } else {
    console.log(`  ~ Servicio "Corte y Barba" ya existe (ID: ${corteBarba.id})`);
  }

  // ————————————————————————————
  // 4. Historial de precios (vigente desde inicio Otoño 2026)
  // ————————————————————————————
  console.log("\nRegistrando historial de precios...");

  const barberoRef = pinky ?? (await db.query.barberos.findFirst({ where: (b, { eq }) => eq(b.nombre, "Pinky") }));

  if (barberoRef && corte && corteBarba) {
    const historialCorte = await db.query.serviciosPreciosHistorial.findFirst({
      where: (h, { eq }) => eq(h.servicioId, corte!.id),
    });
    if (!historialCorte) {
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
    } else {
      console.log("  ~ Historial de precios ya existe, saltando...");
    }
  }

  // ————————————————————————————
  // 5. Insertar medios de pago
  // ————————————————————————————
  console.log("\nInsertando medios de pago...");

  const mediosPagoData = [
    { nombre: "Efectivo", comisionPorcentaje: "0.00" },
    { nombre: "MP QR", comisionPorcentaje: "6.00" },
    { nombre: "Transferencia", comisionPorcentaje: "0.00" },
    { nombre: "Posnet débito", comisionPorcentaje: "1.50" },
    { nombre: "Posnet crédito", comisionPorcentaje: "3.50" },
  ];

  for (const medio of mediosPagoData) {
    const existing = await db.query.mediosPago.findFirst({ where: (m, { eq }) => eq(m.nombre, medio.nombre) });
    if (!existing) {
      await db.insert(schema.mediosPago).values({ ...medio, activo: true });
      console.log(`  ✓ ${medio.nombre} (${medio.comisionPorcentaje}%)`);
    } else {
      console.log(`  ~ ${medio.nombre} ya existe, saltando...`);
    }
  }

  // ————————————————————————————
  // 6. Temporada Otoño 2026
  // ————————————————————————————
  console.log("\nInsertando temporada Otoño 2026...");

  const temporadaExisting = await db.query.temporadas.findFirst({ where: (t, { eq }) => eq(t.nombre, "Otoño 2026") });
  if (!temporadaExisting) {
    await db.insert(schema.temporadas).values({
      nombre: "Otoño 2026",
      fechaInicio: "2026-05-01",
      fechaFin: "2026-06-30",
      cortesDiaProyectados: 15,
      precioBaseProyectado: "13000.00",
    });
    console.log("  ✓ Temporada Otoño 2026 (01/05/2026 – 30/06/2026, 15 cortes/día proyectados)");
  } else {
    console.log("  ~ Temporada Otoño 2026 ya existe, saltando...");
  }

  // ————————————————————————————
  // 7. Repago Memas (deuda llave)
  // ————————————————————————————
  console.log("\nInsertando repago Memas...");

  const repagoExisting = await db.query.repagoMemas.findFirst();
  if (!repagoExisting) {
    await db.insert(schema.repagoMemas).values({
      valorLlaveTotal: "2384571.00",
      cuotaMensual: "400000.00",
      cuotasPagadas: 0,
      saldoPendiente: "2384571.00",
      fechaInicio: "2026-05-01",
      pagadoCompleto: false,
      deudaUsd: "1500.00",
      tasaAnualUsd: "0.1000",
      cantidadCuotasPactadas: 12,
    });
    console.log("  ✓ Deuda llave: $2.384.571 / u$d 1.500 en 12 cuotas (10% anual)");
  } else {
    console.log("  ~ Repago Memas ya configurado, saltando...");
  }

  // ————————————————————————————
  // 8. Configuración del negocio (singleton)
  // ————————————————————————————
  console.log("\nInsertando configuracion_negocio...");

  await db.insert(schema.configuracionNegocio).values({
    presupuestoMensualGastos: 1956686,
    actualizadoPor: "seed",
  }).onConflictDoNothing();
  console.log("  ✓ Presupuesto mensual: $1.956.686 (actualizado_por: seed)");

  console.log("\n✓ Seed completado exitosamente.\n");
  console.log("\nInsertando gastos fijos sugeridos...");

  const sugeridos = [
    "Filo de navajas",
    "Alcohol",
    "Papel cuello",
    "Gel de afeitar",
    "Desinfectante 5 en 1",
    "Kit basico (comprar x2 cada vez)",
    "Gastos de limpieza iniciales",
    "Gastos de limpieza periodicos",
  ];

  const fechaReferencia = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });

  for (const descripcion of sugeridos) {
    const existente = await db.query.gastos.findFirst({
      where: (g, { and, eq, isNull, or }) =>
        and(eq(g.descripcion, descripcion), or(eq(g.tipo, "fijo"), isNull(g.tipo))),
    });

    if (!existente) {
      await db.insert(schema.gastos).values({
        descripcion,
        monto: "0.00",
        fecha: fechaReferencia,
        tipo: "fijo",
        esRecurrente: true,
        frecuencia: "mensual",
        notas: "Sugerido por seed. Completar monto real cuando corresponda.",
      });
      console.log(`  âœ“ Sugerido: ${descripcion}`);
    } else {
      console.log(`  ~ Sugerido ya existe: ${descripcion}`);
    }
  }

  console.log("Usuarios creados:");
  console.log("  Admin:   pinky@a51barber.com  / pinky1234");
  console.log("  Barbero: gabote@a51barber.com / gabote1234");
}

seed().catch((err) => {
  console.error("Error en seed:", err);
  process.exit(1);
});
