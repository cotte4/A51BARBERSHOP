/**
 * Seed de datos reales de producción — A51 Barber
 *
 * Carga:
 * - Barberos (Pinky admin, Gabote 60% comisión), vinculados a usuarios Better Auth
 * - Servicios: Corte ($14.000), Corte y Barba ($16.000) con historial de precio
 * - Adicional: Diseño ($2.000) para ambos servicios
 * - Medios de pago: Efectivo (0%), Transferencia (0%)
 * - Temporada: Otoño 2026 (Mayo–Junio 2026)
 * - Categoría de gasto: Locación
 * - Gasto fijo: Alquiler $1.200.000/mes recurrente
 *
 * Idempotente — no duplica si ya existe.
 *
 * Cómo correr:
 *   npx tsx src/db/seed-prod.ts
 */

import "./load-env";

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL no está configurada en .env.local");
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql, { schema });

async function run() {
  console.log("=== Seed de producción A51 Barber ===\n");

  // ————————————————————
  // 1. Vincular barberos a usuarios existentes
  // ————————————————————
  console.log("1. Barberos...");

  const pinkyUser = await db.query.user.findFirst({
    where: (u) => eq(u.email, "pinky@a51barber.com"),
  });
  const gaboteUser = await db.query.user.findFirst({
    where: (u) => eq(u.email, "gabote@a51barber.com"),
  });

  if (!pinkyUser || !gaboteUser) {
    console.error("  ✗ Usuarios no encontrados. Corré setup-prod-users.ts primero.");
    process.exit(1);
  }

  const existingBarberos = await db.query.barberos.findMany();
  const pinkyBarbero = existingBarberos.find((b) => b.userId === pinkyUser.id);
  const gaboteBarbero = existingBarberos.find((b) => b.userId === gaboteUser.id);

  let pinkyId: string;
  let gaboteId: string;

  if (!pinkyBarbero) {
    const [p] = await db
      .insert(schema.barberos)
      .values({
        nombre: "Pinky",
        rol: "admin",
        tipoModelo: null,
        porcentajeComision: null,
        alquilerBancoMensual: null,
        sueldoMinimoGarantizado: null,
        activo: true,
        userId: pinkyUser.id,
      })
      .returning();
    pinkyId = p.id;
    console.log("  ✓ Pinky creado");
  } else {
    pinkyId = pinkyBarbero.id;
    console.log("  — Pinky ya existe");
  }

  if (!gaboteBarbero) {
    const [g] = await db
      .insert(schema.barberos)
      .values({
        nombre: "Gabote",
        rol: "barbero",
        tipoModelo: "variable",
        porcentajeComision: "60.00",
        alquilerBancoMensual: null,
        sueldoMinimoGarantizado: null,
        activo: true,
        userId: gaboteUser.id,
      })
      .returning();
    gaboteId = g.id;
    console.log("  ✓ Gabote creado (60% comisión)");
  } else {
    gaboteId = gaboteBarbero.id;
    console.log("  — Gabote ya existe");
  }

  // ————————————————————
  // 2. Servicios
  // ————————————————————
  console.log("\n2. Servicios...");

  const existingServicios = await db.query.servicios.findMany();
  const hoy = new Date().toISOString().split("T")[0];

  let corteId: string;
  let corteYBarbaId: string;

  const corteExistente = existingServicios.find((s) => s.nombre === "Corte");
  if (!corteExistente) {
    const [c] = await db
      .insert(schema.servicios)
      .values({ nombre: "Corte", precioBase: "14000.00", activo: true })
      .returning();
    corteId = c.id;
    await db.insert(schema.serviciosPreciosHistorial).values({
      servicioId: corteId,
      precio: "14000.00",
      vigenteDesdе: hoy,
      motivo: "Precio inicial apertura",
      creadoPor: pinkyId,
    });
    console.log("  ✓ Corte — $14.000");
  } else {
    corteId = corteExistente.id;
    console.log("  — Corte ya existe");
  }

  const corteYBarbaExistente = existingServicios.find((s) => s.nombre === "Corte y Barba");
  if (!corteYBarbaExistente) {
    const [cb] = await db
      .insert(schema.servicios)
      .values({ nombre: "Corte y Barba", precioBase: "16000.00", activo: true })
      .returning();
    corteYBarbaId = cb.id;
    await db.insert(schema.serviciosPreciosHistorial).values({
      servicioId: corteYBarbaId,
      precio: "16000.00",
      vigenteDesdе: hoy,
      motivo: "Precio inicial apertura",
      creadoPor: pinkyId,
    });
    console.log("  ✓ Corte y Barba — $16.000");
  } else {
    corteYBarbaId = corteYBarbaExistente.id;
    console.log("  — Corte y Barba ya existe");
  }

  // ————————————————————
  // 3. Adicional Diseño
  // ————————————————————
  console.log("\n3. Adicionales...");

  const existingAdicionales = await db.query.serviciosAdicionales.findMany();

  const disenoCorte = existingAdicionales.find(
    (a) => a.nombre === "Diseño" && a.servicioId === corteId
  );
  if (!disenoCorte) {
    await db.insert(schema.serviciosAdicionales).values({
      servicioId: corteId,
      nombre: "Diseño",
      precioExtra: "2000.00",
    });
    console.log("  ✓ Diseño (+$2.000) para Corte");
  } else {
    console.log("  — Diseño para Corte ya existe");
  }

  const disenoCorteYBarba = existingAdicionales.find(
    (a) => a.nombre === "Diseño" && a.servicioId === corteYBarbaId
  );
  if (!disenoCorteYBarba) {
    await db.insert(schema.serviciosAdicionales).values({
      servicioId: corteYBarbaId,
      nombre: "Diseño",
      precioExtra: "2000.00",
    });
    console.log("  ✓ Diseño (+$2.000) para Corte y Barba");
  } else {
    console.log("  — Diseño para Corte y Barba ya existe");
  }

  // ————————————————————
  // 4. Medios de pago
  // ————————————————————
  console.log("\n4. Medios de pago...");

  const existingMedios = await db.query.mediosPago.findMany();

  for (const medio of [
    { nombre: "Efectivo", comisionPorcentaje: "0.00" },
    { nombre: "Transferencia", comisionPorcentaje: "0.00" },
  ]) {
    const existe = existingMedios.find((m) => m.nombre === medio.nombre);
    if (!existe) {
      await db.insert(schema.mediosPago).values({ ...medio, activo: true });
      console.log(`  ✓ ${medio.nombre} — ${medio.comisionPorcentaje}%`);
    } else {
      console.log(`  — ${medio.nombre} ya existe`);
    }
  }

  // ————————————————————
  // 5. Temporada Otoño 2026
  // ————————————————————
  console.log("\n5. Temporadas...");

  const existingTemporadas = await db.query.temporadas.findMany();
  const temporadaExiste = existingTemporadas.find((t) => t.nombre === "Otoño 2026");

  if (!temporadaExiste) {
    await db.insert(schema.temporadas).values({
      nombre: "Otoño 2026",
      fechaInicio: "2026-05-01",
      fechaFin: "2026-06-30",
      cortesDiaProyectados: 10,
      precioBaseProyectado: "14000.00",
    });
    console.log("  ✓ Otoño 2026 (1 Mayo – 30 Junio, 15 cortes/día, $14.000 proyectado)");
  } else {
    console.log("  — Otoño 2026 ya existe");
  }

  // ————————————————————
  // 6. Gastos fijos
  // ————————————————————
  console.log("\n6. Gastos fijos...");

  const existingCategorias = await db.query.categoriasGasto.findMany();
  let categoriaId: string;

  const categoriaExiste = existingCategorias.find((c) => c.nombre === "Locación");
  if (!categoriaExiste) {
    const [cat] = await db
      .insert(schema.categoriasGasto)
      .values({ nombre: "Locación", color: "#f59e0b" })
      .returning();
    categoriaId = cat.id;
    console.log("  ✓ Categoría: Locación");
  } else {
    categoriaId = categoriaExiste.id;
    console.log("  — Categoría Locación ya existe");
  }

  const existingGastos = await db.query.gastos.findMany();
  const alquilerExiste = existingGastos.find((g) => g.descripcion === "Alquiler");

  if (!alquilerExiste) {
    await db.insert(schema.gastos).values({
      categoriaId,
      descripcion: "Alquiler",
      monto: "1200000.00",
      fecha: "2026-05-01",
      tipo: "fijo",
      esRecurrente: true,
      frecuencia: "mensual",
      notas: "Alquiler mensual del local",
    });
    console.log("  ✓ Alquiler — $1.200.000/mes (recurrente)");
  } else {
    console.log("  — Alquiler ya existe");
  }

  for (const descripcion of [
    "Filo de navajas",
    "Alcohol",
    "Papel cuello",
    "Gel de afeitar",
    "Desinfectante 5 en 1",
    "Kit basico (comprar x2 cada vez)",
    "Gastos de limpieza iniciales",
    "Gastos de limpieza periodicos",
  ]) {
    const existe = existingGastos.find((g) => g.descripcion === descripcion);
    if (!existe) {
      await db.insert(schema.gastos).values({
        descripcion,
        monto: "0.00",
        fecha: hoy,
        tipo: "fijo",
        esRecurrente: true,
        frecuencia: "mensual",
        notas: "Sugerido por seed. Completar monto real cuando corresponda.",
      });
      console.log(`  âœ“ Sugerido: ${descripcion}`);
    } else {
      console.log(`  â€” Sugerido ya existe: ${descripcion}`);
    }
  }

  console.log("\n=== Seed completado ===");
  console.log("\nResumen:");
  console.log("  Barberos: Pinky (admin), Gabote (60% comisión)");
  console.log("  Servicios: Corte $14.000, Corte y Barba $16.000");
  console.log("  Adicional: Diseño +$2.000");
  console.log("  Medios de pago: Efectivo 0%, Transferencia 0%");
  console.log("  Temporada: Otoño 2026 (Mayo–Junio)");
  console.log("  Gastos fijos: Alquiler $1.200.000/mes");
}

run().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
