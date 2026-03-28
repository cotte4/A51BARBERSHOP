/**
 * Limpia duplicados generados por el seed corriendo múltiples veces.
 *
 * Estrategia:
 * - Barberos: mantiene el ID referenciado en atenciones. Para Gabote y Pinky
 *   hay exactamente un ID usado. Actualiza liquidaciones/historial/cierres
 *   antes de borrar los duplicados.
 * - Servicios: mantiene el ID referenciado en atenciones. Actualiza historial.
 * - Medios de pago: mantiene el ID referenciado en atenciones. Para los no
 *   usados (Transferencia, Posnet débito/crédito), mantiene el primero por
 *   orden alfabético de ID.
 *
 * Cómo correr:
 *   npx tsx src/db/cleanup-duplicates.ts
 */

import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";
import { eq, and, ne, inArray } from "drizzle-orm";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL no está configurada en .env.local");
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql, { schema });

async function cleanup() {
  console.log("Iniciando limpieza de duplicados...\n");

  // ─── 1. BARBEROS ────────────────────────────────────────────────────────────
  console.log("=== Barberos ===");

  // IDs referenciados en atenciones (los canónicos)
  const atencionesRaw = await db.select({
    barberoId: schema.atenciones.barberoId,
    servicioId: schema.atenciones.servicioId,
    medioPagoId: schema.atenciones.medioPagoId,
  }).from(schema.atenciones);

  const barberoIdsEnUso = [...new Set(atencionesRaw.map(a => a.barberoId).filter(Boolean))] as string[];
  console.log("  IDs en uso en atenciones:", barberoIdsEnUso);

  // Para cada nombre de barbero, determinar el ID canónico
  const todosBarberos = await db.select().from(schema.barberos);
  const barberosPorNombre = new Map<string, typeof todosBarberos>();
  for (const b of todosBarberos) {
    if (!barberosPorNombre.has(b.nombre)) barberosPorNombre.set(b.nombre, []);
    barberosPorNombre.get(b.nombre)!.push(b);
  }

  const barberoCanonicoMap = new Map<string, string>(); // nombre → canonical ID

  for (const [nombre, lista] of barberosPorNombre) {
    // Preferir el que está en uso en atenciones
    const enUso = lista.find(b => barberoIdsEnUso.includes(b.id));
    const canonico = enUso ?? lista[0];
    barberoCanonicoMap.set(nombre, canonico.id);
    const aDeletar = lista.filter(b => b.id !== canonico.id);
    console.log(`  ${nombre}: canónico=${canonico.id.slice(0,8)}, a eliminar=${aDeletar.length}`);

    if (aDeletar.length > 0) {
      const idsADeletar = aDeletar.map(b => b.id);

      // Actualizar FKs antes de borrar
      // liquidaciones.barbero_id
      for (const id of idsADeletar) {
        await db.update(schema.liquidaciones)
          .set({ barberoId: canonico.id })
          .where(eq(schema.liquidaciones.barberoId, id));
      }
      // servicios_precios_historial.creado_por
      for (const id of idsADeletar) {
        await db.update(schema.serviciosPreciosHistorial)
          .set({ creadoPor: canonico.id })
          .where(eq(schema.serviciosPreciosHistorial.creadoPor, id));
      }
      // cierres_caja.cerrado_por
      for (const id of idsADeletar) {
        await db.update(schema.cierresCaja)
          .set({ cerradoPor: canonico.id })
          .where(eq(schema.cierresCaja.cerradoPor, id));
      }

      // Borrar duplicados
      await db.delete(schema.barberos).where(inArray(schema.barberos.id, idsADeletar));
      console.log(`  ✓ ${aDeletar.length} duplicados de "${nombre}" eliminados`);
    }
  }

  // ─── 2. SERVICIOS ────────────────────────────────────────────────────────────
  console.log("\n=== Servicios ===");

  const servicioIdsEnUso = [...new Set(atencionesRaw.map(a => a.servicioId).filter(Boolean))] as string[];
  console.log("  IDs en uso en atenciones:", servicioIdsEnUso);

  const todosServicios = await db.select().from(schema.servicios);
  const serviciosPorNombre = new Map<string, typeof todosServicios>();
  for (const s of todosServicios) {
    if (!serviciosPorNombre.has(s.nombre)) serviciosPorNombre.set(s.nombre, []);
    serviciosPorNombre.get(s.nombre)!.push(s);
  }

  for (const [nombre, lista] of serviciosPorNombre) {
    const enUso = lista.find(s => servicioIdsEnUso.includes(s.id));
    const canonico = enUso ?? lista[0];
    const aDeletar = lista.filter(s => s.id !== canonico.id);
    console.log(`  ${nombre}: canónico=${canonico.id.slice(0,8)}, a eliminar=${aDeletar.length}`);

    if (aDeletar.length > 0) {
      const idsADeletar = aDeletar.map(s => s.id);

      // servicios_precios_historial.servicio_id
      for (const id of idsADeletar) {
        // Borrar historial del duplicado (el canónico ya tiene el suyo)
        await db.delete(schema.serviciosPreciosHistorial)
          .where(eq(schema.serviciosPreciosHistorial.servicioId, id));
      }
      // servicios_adicionales.servicio_id
      for (const id of idsADeletar) {
        await db.delete(schema.serviciosAdicionales)
          .where(eq(schema.serviciosAdicionales.servicioId, id));
      }

      await db.delete(schema.servicios).where(inArray(schema.servicios.id, idsADeletar));
      console.log(`  ✓ ${aDeletar.length} duplicados de "${nombre}" eliminados`);
    }
  }

  // ─── 3. MEDIOS DE PAGO ───────────────────────────────────────────────────────
  console.log("\n=== Medios de pago ===");

  const medioPagoIdsEnUso = [...new Set(atencionesRaw.map(a => a.medioPagoId).filter(Boolean))] as string[];
  console.log("  IDs en uso en atenciones:", medioPagoIdsEnUso);

  const todosMedios = await db.select().from(schema.mediosPago);
  const mediosPorNombre = new Map<string, typeof todosMedios>();
  for (const m of todosMedios) {
    const nombre = m.nombre ?? "";
    if (!mediosPorNombre.has(nombre)) mediosPorNombre.set(nombre, []);
    mediosPorNombre.get(nombre)!.push(m);
  }

  for (const [nombre, lista] of mediosPorNombre) {
    const enUso = lista.find(m => medioPagoIdsEnUso.includes(m.id));
    const canonico = enUso ?? lista[0];
    const aDeletar = lista.filter(m => m.id !== canonico.id);
    console.log(`  ${nombre}: canónico=${canonico.id.slice(0,8)}, a eliminar=${aDeletar.length}`);

    if (aDeletar.length > 0) {
      const idsADeletar = aDeletar.map(m => m.id);
      // atenciones.medio_pago_id — redirigir a canónico
      for (const id of idsADeletar) {
        await db.update(schema.atenciones)
          .set({ medioPagoId: canonico.id })
          .where(eq(schema.atenciones.medioPagoId, id));
      }
      await db.delete(schema.mediosPago).where(inArray(schema.mediosPago.id, idsADeletar));
      console.log(`  ✓ ${aDeletar.length} duplicados de "${nombre}" eliminados`);
    }
  }

  // ─── Verificación final ──────────────────────────────────────────────────────
  console.log("\n=== Verificación final ===");
  const bFinal = await db.select().from(schema.barberos);
  const sFinal = await db.select().from(schema.servicios);
  const mFinal = await db.select().from(schema.mediosPago);
  console.log(`  Barberos: ${bFinal.length} (esperado 2)`);
  console.log(`  Servicios: ${sFinal.length} (esperado 2)`);
  console.log(`  Medios de pago: ${mFinal.length} (esperado 5)`);
  console.log("\n✓ Limpieza completada.");
}

cleanup().catch(err => {
  console.error("Error en cleanup:", err);
  process.exit(1);
});
