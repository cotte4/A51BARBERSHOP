"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { marcianoCutsConfig } from "@/db/schema";
import { auth } from "@/lib/auth";

export async function saveCutsConfigAction(faceShape: string, formData: FormData): Promise<void> {
  const session = await auth.api.getSession({ headers: await headers() });
  const userRole = (session?.user as { role?: string })?.role;
  if (userRole !== "admin") return;

  const cutsRaw = (formData.get("cutsRaw") as string) ?? "";
  const cuts = cutsRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (cuts.length === 0) {
    await db.delete(marcianoCutsConfig).where(eq(marcianoCutsConfig.faceShape, faceShape));
  } else {
    const existing = await db
      .select({ faceShape: marcianoCutsConfig.faceShape })
      .from(marcianoCutsConfig)
      .where(eq(marcianoCutsConfig.faceShape, faceShape))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(marcianoCutsConfig)
        .set({ cuts, updatedAt: new Date() })
        .where(eq(marcianoCutsConfig.faceShape, faceShape));
    } else {
      await db.insert(marcianoCutsConfig).values({ faceShape, cuts });
    }
  }

  revalidatePath("/negocio/estilo");
}
