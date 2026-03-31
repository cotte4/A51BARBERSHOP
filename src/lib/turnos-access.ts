import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { db } from "@/db";
import { barberos } from "@/db/schema";
import { auth } from "@/lib/auth";

export type TurnosActorContext = {
  userId: string;
  isAdmin: boolean;
  barberoId: string | null;
};

export async function getTurnosActorContext(): Promise<TurnosActorContext | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  const userId = session?.user?.id;

  if (!userId) {
    return null;
  }

  const isAdmin = (session.user as { role?: string })?.role === "admin";
  const [barbero] = await db
    .select({ id: barberos.id })
    .from(barberos)
    .where(and(eq(barberos.userId, userId), eq(barberos.activo, true)))
    .limit(1);

  return {
    userId,
    isAdmin,
    barberoId: barbero?.id ?? null,
  };
}
