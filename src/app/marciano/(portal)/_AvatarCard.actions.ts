"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { requireMarcianoClient } from "@/lib/marciano-portal";
import { findColorBySlug } from "@/lib/marciano-colors";
import {
  startAvatarPrediction,
  finalizePrediction,
  getReplicatePrediction,
  cancelReplicatePrediction,
} from "@/lib/marciano-avatar";
import type { FaceShape } from "@/lib/types";

export async function saveFavoriteColorAction(
  slug: string
): Promise<{ success: true } | { success: false; error: string }> {
  const color = findColorBySlug(slug);
  if (!color) return { success: false, error: "Color inválido." };

  const { client } = await requireMarcianoClient();

  await db
    .update(clients)
    .set({ favoriteColor: slug, updatedAt: new Date() })
    .where(eq(clients.id, client.id));

  revalidatePath("/marciano");
  return { success: true };
}

export async function startAvatarGenerationAction(input: {
  frameBase64: string;
  faceShape: FaceShape;
  colorSlug: string;
}): Promise<
  | { success: true; status: "processing" | "ready"; avatarUrl?: string }
  | { success: false; error: string }
> {
  const color = findColorBySlug(input.colorSlug);
  if (!color) return { success: false, error: "Color inválido." };
  if (!input.frameBase64) return { success: false, error: "No se capturó el rostro." };

  const { client } = await requireMarcianoClient();

  if (client.avatarStatus === "processing") {
    return { success: false, error: "Ya hay una generación en curso. Esperá un momento." };
  }

  // If there's an existing avatar, cancel the old prediction first (no-op if idle)
  if (client.avatarStatus === "ready" && client.avatarPredictionId) {
    await cancelReplicatePrediction(client.avatarPredictionId);
  }

  const result = await startAvatarPrediction({
    frameBase64: input.frameBase64,
    colorNombre: color.nombre,
    colorHex: color.hex,
    faceShape: input.faceShape,
  });

  if ("error" in result) {
    return { success: false, error: result.error };
  }

  await db
    .update(clients)
    .set({
      avatarStatus: "processing",
      avatarPredictionId: result.predictionId,
      avatarRequestedAt: new Date(),
      avatarErrorMessage: null,
      favoriteColor: input.colorSlug,
      updatedAt: new Date(),
    })
    .where(eq(clients.id, client.id));

  revalidatePath("/marciano");
  return { success: true, status: "processing" };
}

export async function getAvatarStatusAction(): Promise<{
  status: "idle" | "processing" | "ready" | "failed";
  avatarUrl: string | null;
  errorMessage: string | null;
}> {
  const { client } = await requireMarcianoClient();

  // Dev fallback: el webhook no llega a localhost. Si estamos procesando,
  // consultamos Replicate directamente y aplicamos el resultado si ya terminó.
  if (
    process.env.NODE_ENV !== "production" &&
    client.avatarStatus === "processing" &&
    client.avatarPredictionId
  ) {
    const prediction = await getReplicatePrediction(client.avatarPredictionId);
    if (prediction) {
      await finalizePrediction(
        {
          id: prediction.id,
          status: prediction.status,
          output: prediction.output,
          error: typeof prediction.error === "string" ? prediction.error : null,
        },
        client.id
      );
      const [refreshed] = await db
        .select({
          avatarStatus: clients.avatarStatus,
          avatarUrl: clients.avatarUrl,
          avatarErrorMessage: clients.avatarErrorMessage,
        })
        .from(clients)
        .where(eq(clients.id, client.id))
        .limit(1);
      if (refreshed) {
        return {
          status: refreshed.avatarStatus as "idle" | "processing" | "ready" | "failed",
          avatarUrl: refreshed.avatarUrl,
          errorMessage: refreshed.avatarErrorMessage,
        };
      }
    }
  }

  return {
    status: client.avatarStatus as "idle" | "processing" | "ready" | "failed",
    avatarUrl: client.avatarUrl,
    errorMessage: client.avatarErrorMessage,
  };
}

export async function resetAvatarAction(): Promise<
  { success: true } | { success: false; error: string }
> {
  const { client } = await requireMarcianoClient();

  if (client.avatarStatus === "processing" && client.avatarPredictionId) {
    await cancelReplicatePrediction(client.avatarPredictionId);
  }

  await db
    .update(clients)
    .set({
      avatarUrl: null,
      avatarStatus: "idle",
      avatarPredictionId: null,
      avatarRequestedAt: null,
      avatarErrorMessage: null,
      updatedAt: new Date(),
    })
    .where(eq(clients.id, client.id));

  revalidatePath("/marciano");
  return { success: true };
}
