"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clients, clientBriefingCache } from "@/db/schema";
import { requireMarcianoClient } from "@/lib/marciano-portal";
import { generateStyleProfile, matchIdealBarbero } from "@/lib/marciano-style";
import type { FaceShape, InterrogatoryAnswers, StyleProfile } from "@/lib/types";
import type { FaceMetrics } from "@/lib/marciano-style";

export async function saveStyleProfileAction(input: {
  shape: FaceShape;
  answers: InterrogatoryAnswers;
  metrics: FaceMetrics | null;
}): Promise<{ success: true; profile: StyleProfile } | { success: false; error: string }> {
  try {
    const { client } = await requireMarcianoClient();

    const partial = generateStyleProfile(input.shape, input.answers, input.metrics);
    const idealBarberoId = await matchIdealBarbero(input.shape, db);

    const profile: StyleProfile = {
      ...partial,
      idealBarberoId,
    };

    await db
      .update(clients)
      .set({
        faceShape: input.shape,
        styleProfile: profile,
        styleCompletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(clients.id, client.id));

    // Invalidate briefing cache so barbers see updated Style DNA
    await db
      .delete(clientBriefingCache)
      .where(eq(clientBriefingCache.clientId, client.id));

    revalidatePath("/marciano");
    revalidatePath("/marciano/perfil-marciano");

    return { success: true, profile };
  } catch (err) {
    console.error("saveStyleProfileAction error:", err);
    return { success: false, error: "No pudimos guardar tu perfil. Intentá de nuevo." };
  }
}
