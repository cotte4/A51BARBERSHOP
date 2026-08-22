import "server-only";

import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { presupuestoLineas, presupuestos } from "@/db/schema";
import {
  getPresupuestoTotals,
  type PresupuestoScope,
} from "@/lib/presupuesto";

/**
 * INVARIANTE: este modulo nunca importa ni escribe en capitalMovimientos ni en
 * barberShopAssets. Un presupuesto es una proyeccion; no mueve plata real ni
 * altera ninguna metrica de A51. Si hace falta impactar capital, el item deja
 * de ser una linea de presupuesto y pasa a ser un activo del Hangar.
 */

const NOMBRE_POR_SCOPE: Record<PresupuestoScope, string> = {
  memas: "Presupuesto Memas",
  a51: "Presupuesto A51",
};

/**
 * Devuelve el presupuesto del scope, creandolo vacio la primera vez.
 * Un scope = un presupuesto, para que la vista no necesite un selector.
 */
export async function getOrCreatePresupuesto(scope: PresupuestoScope) {
  const existing = await db.query.presupuestos.findFirst({
    where: eq(presupuestos.scope, scope),
  });

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(presupuestos)
    .values({ nombre: NOMBRE_POR_SCOPE[scope], scope })
    .returning();

  return created;
}

export async function getPresupuestoConLineas(scope: PresupuestoScope) {
  const presupuesto = await getOrCreatePresupuesto(scope);

  const lineas = await db
    .select()
    .from(presupuestoLineas)
    .where(eq(presupuestoLineas.presupuestoId, presupuesto.id))
    .orderBy(asc(presupuestoLineas.orden), asc(presupuestoLineas.creadoEn));

  return {
    presupuesto,
    lineas,
    totals: getPresupuestoTotals(lineas),
  };
}

export async function touchPresupuesto(presupuestoId: string) {
  await db
    .update(presupuestos)
    .set({ actualizadoEn: new Date() })
    .where(eq(presupuestos.id, presupuestoId));
}

export async function getNextOrden(presupuestoId: string) {
  const lineas = await db
    .select({ orden: presupuestoLineas.orden })
    .from(presupuestoLineas)
    .where(eq(presupuestoLineas.presupuestoId, presupuestoId));

  return lineas.reduce((max, linea) => Math.max(max, linea.orden), 0) + 1;
}
