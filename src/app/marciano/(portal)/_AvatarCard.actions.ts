"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { del } from "@vercel/blob";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { requireMarcianoClient } from "@/lib/marciano-portal";
import { findColorBySlug } from "@/lib/marciano-colors";
import {
  startAvatarPrediction,
  startAvatarCleanPrediction,
  startAvatarRecolorPrediction,
  startAvatarRestylePrediction,
  finalizePrediction,
  getReplicatePrediction,
  cancelReplicatePrediction,
} from "@/lib/marciano-avatar";
import type { FaceShape } from "@/lib/types";
import type { AvatarPreset } from "@/lib/marciano-avatar-presets";

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
  preset?: AvatarPreset;
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
    colorNombre: color.promptName,
    colorHex: color.hex,
    faceShape: input.faceShape,
    preset: input.preset,
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

export async function cleanAvatarAction(): Promise<
  { success: true } | { success: false; error: string }
> {
  const { client } = await requireMarcianoClient();

  if (!client.avatarUrl || client.avatarStatus !== "ready") {
    return { success: false, error: "No hay avatar listo para limpiar." };
  }

  const result = await startAvatarCleanPrediction({ avatarUrl: client.avatarUrl });
  if ("error" in result) return { success: false, error: result.error };

  await db
    .update(clients)
    .set({
      avatarStatus: "processing",
      avatarPredictionId: result.predictionId,
      avatarErrorMessage: null,
      updatedAt: new Date(),
    })
    .where(eq(clients.id, client.id));

  revalidatePath("/marciano");
  return { success: true };
}

export async function recolorAvatarAction(input: {
  colorSlug: string;
}): Promise<{ success: true } | { success: false; error: string }> {
  const color = findColorBySlug(input.colorSlug);
  if (!color) return { success: false, error: "Color inválido." };

  const { client } = await requireMarcianoClient();

  if (!client.avatarUrl || client.avatarStatus !== "ready") {
    return { success: false, error: "No hay avatar listo para recolorear." };
  }

  const result = await startAvatarRecolorPrediction({
    avatarUrl: client.avatarUrl,
    colorPromptName: color.promptName,
  });

  if ("error" in result) return { success: false, error: result.error };

  await db
    .update(clients)
    .set({
      avatarStatus: "processing",
      avatarPredictionId: result.predictionId,
      avatarErrorMessage: null,
      favoriteColor: input.colorSlug,
      updatedAt: new Date(),
    })
    .where(eq(clients.id, client.id));

  revalidatePath("/marciano");
  revalidatePath("/marciano/estilo");
  return { success: true };
}

export async function restyleAvatarAction(input: {
  preset: AvatarPreset;
  intensity: 1 | 2 | 3;
}): Promise<{ success: true } | { success: false; error: string }> {
  const { client } = await requireMarcianoClient();

  if (!client.avatarUrl) {
    return { success: false, error: "No tenés avatar para transformar." };
  }
  if (client.avatarStatus === "processing") {
    return { success: false, error: "Ya hay una transformación en curso. Esperá un momento." };
  }

  const result = await startAvatarRestylePrediction({
    avatarUrl: client.avatarUrl,
    preset: input.preset,
    intensity: input.intensity,
  });

  if ("error" in result) return { success: false, error: result.error };

  await db
    .update(clients)
    .set({
      avatarStatus: "processing",
      avatarPredictionId: result.predictionId,
      avatarErrorMessage: null,
      updatedAt: new Date(),
    })
    .where(eq(clients.id, client.id));

  revalidatePath("/marciano");
  revalidatePath("/marciano/estilo");
  return { success: true };
}

export async function resetAvatarAction(): Promise<
  { success: true } | { success: false; error: string }
> {
  const { client } = await requireMarcianoClient();

  if (client.avatarStatus === "processing" && client.avatarPredictionId) {
    await cancelReplicatePrediction(client.avatarPredictionId);
  }

  if (client.avatarUrl && process.env.BLOB_READ_WRITE_TOKEN) {
    await del(client.avatarUrl).catch(() => {});
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
