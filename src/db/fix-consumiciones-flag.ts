/**
 * Fix one-shot: setea es_consumicion = true para Cafe y Gaseosa.
 *
 * El seed-go-live.ts original no incluía el flag, así que ambos productos
 * quedaron con es_consumicion = false en producción. Este script lo corrige.
 *
 * Idempotente: se puede correr más de una vez sin efectos secundarios.
 *
 * Cómo correr:
 *   npx tsx src/db/fix-consumiciones-flag.ts
 */

import "./load-env";

import { db } from "@/db";
import { productos } from "@/db/schema";
import { inArray } from "drizzle-orm";

const NOMBRES_CONSUMICION = ["Cafe", "Gaseosa"];

async function fix() {
  console.log("=== Fix: es_consumicion para productos de consumición ===\n");

  const result = await db
    .update(productos)
    .set({ esConsumicion: true })
    .where(inArray(productos.nombre, NOMBRES_CONSUMICION))
    .returning({ id: productos.id, nombre: productos.nombre, esConsumicion: productos.esConsumicion });

  if (result.length === 0) {
    console.log("⚠ No se encontraron productos con esos nombres. Verificar que existen en la DB.");
  } else {
    console.log(`✓ Actualizados ${result.length} producto(s):`);
    for (const r of result) {
      console.log(`  - ${r.nombre} (id: ${r.id}) → esConsumicion: ${r.esConsumicion}`);
    }
  }

  console.log("\nDone.");
}

fix().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
