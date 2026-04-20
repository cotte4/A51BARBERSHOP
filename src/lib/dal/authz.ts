import "server-only";

import { headers } from "next/headers";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { barberos } from "@/db/schema";
import { auth } from "@/lib/auth";

export type CurrentActorContext = {
  session: Awaited<ReturnType<typeof auth.api.getSession>>;
  userId: string;
  role?: string;
};

export type AdminActorContext = {
  userId: string;
  role: "admin" | "asesor";
};

export type BarberoScopedActorContext = {
  userId: string;
  role?: string;
  isAdmin: boolean;
  barberoId?: string;
};

export async function getCurrentActorContext(): Promise<CurrentActorContext | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user as { id?: string; role?: string } | undefined;

  if (!user?.id) {
    return null;
  }

  return {
    session,
    userId: user.id,
    role: user.role,
  };
}

export async function getAdminActorContext(): Promise<AdminActorContext | null> {
  const actor = await getCurrentActorContext();

  if (!actor || (actor.role !== "admin" && actor.role !== "asesor")) {
    return null;
  }

  return {
    userId: actor.userId,
    role: actor.role,
  };
}

export async function hasAdminAccess(): Promise<boolean> {
  return Boolean(await getAdminActorContext());
}

export async function getLinkedBarberoIdForUser(
  userId: string,
  options: { activeOnly?: boolean } = {}
): Promise<string | null> {
  const conditions = [eq(barberos.userId, userId)];

  if (options.activeOnly) {
    conditions.push(eq(barberos.activo, true));
  }

  const [barbero] = await db
    .select({ id: barberos.id })
    .from(barberos)
    .where(and(...conditions))
    .limit(1);

  return barbero?.id ?? null;
}

export async function getBarberoScopedActorContext(): Promise<BarberoScopedActorContext | null> {
  const actor = await getCurrentActorContext();

  if (!actor) {
    return null;
  }

  const isAdmin = actor.role === "admin";

  if (isAdmin) {
    return {
      userId: actor.userId,
      role: actor.role,
      isAdmin,
    };
  }

  return {
    userId: actor.userId,
    role: actor.role,
    isAdmin,
    barberoId:
      (await getLinkedBarberoIdForUser(actor.userId, { activeOnly: true })) ?? undefined,
  };
}
