import "server-only";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { barberos, cierresCaja } from "@/db/schema";
import {
  getBarberoScopedActorContext,
  type BarberoScopedActorContext,
} from "@/lib/dal/authz";

export type CajaActorContext = BarberoScopedActorContext;

export async function getCajaActorContext(): Promise<CajaActorContext | null> {
  return getBarberoScopedActorContext();
}

export function canManageCajaBarbero(
  actor: CajaActorContext,
  barberoId: string | null | undefined
): boolean {
  return actor.isAdmin || (!!barberoId && actor.barberoId === barberoId);
}

export function getCajaFechaHoyArgentina(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

export async function hasCajaCerrada(fecha: string): Promise<boolean> {
  const [cierre] = await db
    .select({ id: cierresCaja.id })
    .from(cierresCaja)
    .where(eq(cierresCaja.fecha, fecha))
    .limit(1);

  return !!cierre;
}

export async function hasCajaCerradaHoy(): Promise<boolean> {
  return hasCajaCerrada(getCajaFechaHoyArgentina());
}

export async function resolveCajaActorBarberoIdByUser(
  userId: string,
  isAdmin: boolean
): Promise<string | null> {
  const [barbero] = await db
    .select({ id: barberos.id })
    .from(barberos)
    .where(
      isAdmin
        ? and(eq(barberos.rol, "admin"), eq(barberos.activo, true))
        : and(eq(barberos.userId, userId), eq(barberos.activo, true))
    )
    .limit(1);

  return barbero?.id ?? null;
}

export async function resolveCajaActorBarberoIdForActor(
  actor: CajaActorContext
): Promise<string | null> {
  if (!actor.isAdmin) {
    return actor.barberoId ?? null;
  }

  return resolveCajaActorBarberoIdByUser(actor.userId, true);
}

export async function getCajaClosingBarberoIdForActor(
  actor: CajaActorContext
): Promise<string | null> {
  const [barbero] = await db
    .select({ id: barberos.id })
    .from(barberos)
    .where(eq(barberos.userId, actor.userId))
    .limit(1);

  return barbero?.id ?? null;
}
