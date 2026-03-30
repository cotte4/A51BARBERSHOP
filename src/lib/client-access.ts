import { db } from "@/db";
import { barberos, clients, visitLogs } from "@/db/schema";
import { auth } from "@/lib/auth";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";

export type ClientActorContext = {
  userId: string;
  role?: string;
  isAdmin: boolean;
  barberoId?: string;
};

export async function getClientActorContext(): Promise<ClientActorContext | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id;

  if (!userId) {
    return null;
  }

  const role = (session.user as { role?: string })?.role;
  const isAdmin = role === "admin";

  if (isAdmin) {
    return { userId, role, isAdmin };
  }

  const [barbero] = await db
    .select({ id: barberos.id })
    .from(barberos)
    .where(and(eq(barberos.userId, userId), eq(barberos.activo, true)))
    .limit(1);

  return {
    userId,
    role,
    isAdmin,
    barberoId: barbero?.id,
  };
}

export async function canAccessClient(
  actor: ClientActorContext,
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
