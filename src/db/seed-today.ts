/**
 * seed-today.ts — Inserta 3 atenciones para HOY.
 * Permite correr los tests E2E que requieren caja abierta (editar atención, preview comisión).
 * Es idempotente: borra los registros marcados como 'seed_today' antes de reinsertar.
 *
 * Cómo correr:
 *   cd a51-barber && npx tsx src/db/seed-today.ts
 *
 * Cómo limpiar:
 *   cd a51-barber && npx tsx src/db/seed-today.ts --clean
 */

import "./load-env";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import { calcAtencionFinancials } from "./seed-helpers";

const SEED_MARKER = "seed_today";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL no está configurada");
}

const sqlClient = neon(process.env.DATABASE_URL);
const db = drizzle(sqlClient, { schema });

function todayAR(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

async function cleanup() {
  const deleted = await db
    .delete(schema.atenciones)
    .where(eq(schema.atenciones.notas, SEED_MARKER))
    .returning({ id: schema.atenciones.id });
  console.log(`  ✓ ${deleted.length} atención(es) seed_today eliminada(s)`);
}

async function main() {
  const isClean = process.argv.includes("--clean");

  await cleanup();
  if (isClean) {
    console.log("Limpieza completada.");
    process.exit(0);
  }

  const fecha = todayAR();
  console.log(`Insertando atenciones para ${fecha}...`);

  const barberos = await db.select().from(schema.barberos).where(eq(schema.barberos.activo, true));
  if (barberos.length === 0) throw new Error("No hay barberos activos en la DB");

  const servicios = await db.select().from(schema.servicios).where(eq(schema.servicios.activo, true));
  if (servicios.length === 0) throw new Error("No hay servicios activos en la DB");

  const medios = await db.select().from(schema.mediosPago).where(eq(schema.mediosPago.activo, true));
  if (medios.length === 0) throw new Error("No hay medios de pago activos en la DB");

  // Prefer efectivo (0% commission) for simplicity; fallback to first
  const efectivo = medios.find((m) => /efectivo/i.test(m.nombre ?? "")) ?? medios[0];
  const mpQR = medios.find((m) => /mp.qr/i.test(m.nombre ?? "")) ?? medios[0];

  // Use first available barbero — prefer Pinky (owner), else whatever exists
  const pinky = barberos.find((b) => /pinky/i.test(b.nombre)) ?? barberos[0];
  const gabote = barberos.find((b) => /gabote/i.test(b.nombre));

  const servicio = servicios[0]; // first active service
  const precio = Number(servicio.precioBase ?? 15000);

  const toInsert = [
    {
      barbero: pinky,
      medio: efectivo,
      precio,
      hora: "10:00:00",
    },
    {
      barbero: pinky,
      medio: mpQR,
      precio,
      hora: "11:30:00",
    },
    ...(gabote
      ? [{ barbero: gabote, medio: efectivo, precio, hora: "10:30:00" }]
      : []),
  ];

  for (const entry of toInsert) {
    const mpComisionPct = Number(entry.medio.comisionPorcentaje ?? 0);
    const barberoComisionPct = entry.barbero.porcentajeComision
      ? Number(entry.barbero.porcentajeComision)
      : null;

    const fin = calcAtencionFinancials(
      entry.precio,
      Number(servicio.precioBase ?? entry.precio),
      mpComisionPct,
      barberoComisionPct
    );

    await db.insert(schema.atenciones).values({
      barberoId: entry.barbero.id,
      servicioId: servicio.id,
      medioPagoId: entry.medio.id,
      fecha,
      hora: entry.hora,
      precioBase: String(entry.precio),
      precioCobrado: String(entry.precio),
      comisionMedioPagoPct: fin.comisionMedioPagoPct,
      comisionMedioPagoMonto: fin.comisionMedioPagoMonto,
      montoNeto: fin.montoNeto,
      comisionBarberoPct: fin.comisionBarberoPct,
      comisionBarberoMonto: fin.comisionBarberoMonto,
      notas: SEED_MARKER,
    });

    console.log(
      `  ✓ ${entry.barbero.nombre} — ${servicio.nombre} — ${entry.medio.nombre} — $${entry.precio}`
    );
  }

  console.log(`\nCaja lista para testing. Fecha: ${fecha}`);
  console.log('Para limpiar: npx tsx src/db/seed-today.ts --clean');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
