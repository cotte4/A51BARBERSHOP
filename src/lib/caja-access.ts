import { db } from "@/db";
import { barberos } from "@/db/schema";
import { auth } from "@/lib/auth";
import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";

export type CajaActorContext = {
  userId: string;
  role?: string;
  isAdmin: boolean;
  barberoId?: string;
};

export async function getCajaActorContext(): Promise<CajaActorContext | null> {
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
