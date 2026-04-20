import "server-only";

import { and, eq, exists, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { clients, visitLogs } from "@/db/schema";

export type ClientVisibilityActor = {
  userId?: string;
  isAdmin: boolean;
  barberoId?: string;
};

export function getClientVisibilityFilter(actor: ClientVisibilityActor) {
  if (actor.isAdmin) {
    return undefined;
  }

  if (!actor.barberoId) {
    return sql`false`;
  }

  return or(
    eq(clients.esMarciano, true),
    eq(clients.createdByBarberoId, actor.barberoId),
    exists(
      db
        .select({ id: visitLogs.id })
        .from(visitLogs)
        .where(
          and(
            eq(visitLogs.clientId, clients.id),
            eq(visitLogs.createdByBarberoId, actor.barberoId)
          )
        )
    )
  );
}

export async function canAccessClient(
  actor: ClientVisibilityActor,
  clientId: string
): Promise<boolean> {
  const [client] = await db
    .select({
      id: clients.id,
      esMarciano: clients.esMarciano,
      archivedAt: clients.archivedAt,
      createdByBarberoId: clients.createdByBarberoId,
    })
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);

  if (!client) {
    return false;
  }

  if (actor.isAdmin) {
    return true;
  }

  if (!actor.barberoId || client.archivedAt) {
    return false;
  }

  if (client.esMarciano || client.createdByBarberoId === actor.barberoId) {
    return true;
  }

  const [visit] = await db
    .select({ id: visitLogs.id })
    .from(visitLogs)
    .where(
      and(
        eq(visitLogs.clientId, clientId),
        eq(visitLogs.createdByBarberoId, actor.barberoId)
      )
    )
    .limit(1);

  return Boolean(visit);
}

