"use server";

import { ilike } from "drizzle-orm";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { getAdminActorContext } from "@/lib/dal/authz";
import { adminAdjustBalance } from "@/lib/ovnis-server";

export async function ajustarBalanceAction(
  clientId: string,
  delta: number,
  reason: string
): Promise<{ success: true } | { success: false; error: string }> {
  const ctx = await getAdminActorContext();
  if (!ctx) return { success: false, error: "No autorizado" };

  if (!reason.trim()) return { success: false, error: "El motivo es requerido" };
  if (delta === 0) return { success: false, error: "El delta no puede ser cero" };

  const result = await adminAdjustBalance({
    clientId,
    delta,
    reason: reason.trim(),
    adminUserId: ctx.userId,
  });

  if (!result.success) {
    return { success: false, error: "El ajuste dejaría el balance negativo" };
  }

  return { success: true };
}

export async function searchClientAction(
  query: string
): Promise<{ id: string; name: string; balance: number }[]> {
  const ctx = await getAdminActorContext();
  if (!ctx) return [];

  if (!query.trim()) return [];

  const { ovnisBalance } = await import("@/db/schema");
  const { eq, sql } = await import("drizzle-orm");

  const results = await db
    .select({
      id: clients.id,
      name: clients.name,
      balance: sql<number>`COALESCE(${ovnisBalance.balance}, 0)`,
    })
    .from(clients)
    .leftJoin(ovnisBalance, eq(clients.id, ovnisBalance.clientId))
    .where(ilike(clients.name, `%${query.trim()}%`))
    .limit(8);

  return results.map((r) => ({ id: r.id, name: r.name, balance: Number(r.balance) }));
}
