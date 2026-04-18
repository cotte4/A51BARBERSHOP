import Replicate from "replicate";
import { put } from "@vercel/blob";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { FACE_SHAPE_DESCRIPTIONS } from "@/lib/marciano-colors";
import type { FaceShape } from "@/lib/types";

// fofr/face-to-many: designed for face-to-cartoon transformation, style param controls output type
const AVATAR_MODEL = "fofr/face-to-many";

const AVATAR_PROMPT =
  "close-up portrait of a cartoon alien, face and neck only, tight headshot from chin to top of head, " +
  "solid {COLOR} ({HEX}) skin covering entire face and neck, {COLOR} alien complexion everywhere, " +
  "looking directly forward, front-facing, eyes looking straight at viewer, " +
  "maintaining facial expression from photo, calm composed expression, mouth closed, " +
  "big glossy black alien eyes, small pointed ears, {FACE_SHAPE} face shape, sharp modern fade haircut, " +
  "cel-shaded flat cartoon colors, bold black ink outlines, vibrant illustration, cartoon alien mascot, " +
  "deep space background with stars, colorful nebula, small flying saucer UFO in the distance";

const AVATAR_NEGATIVE_PROMPT =
  "full body, torso, arms, shoulders, hands, body below neck, " +
  "screaming, yelling, open mouth, different expression, side view, profile view, looking away, " +
  "human skin, realistic skin, natural skin tone, flesh color, beige, tan, pale, brown, pink skin, " +
  "photograph, photorealistic, realistic face, indoor background, plain background, white background, " +
  "blurry, low quality, ugly, deformed, watermark, text";

export async function startAvatarPrediction(input: {
  frameBase64: string;
  colorNombre: string;
  colorHex: string;
  faceShape: FaceShape;
}): Promise<{ predictionId: string } | { error: string }> {
  const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN! });
  const shapeDesc = FACE_SHAPE_DESCRIPTIONS[input.faceShape] ?? "oval face";
  const prompt = AVATAR_PROMPT
    .replaceAll("{COLOR}", input.colorNombre)
    .replaceAll("{HEX}", input.colorHex)
    .replaceAll("{FACE_SHAPE}", shapeDesc);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  try {
    const prediction = await replicate.predictions.create({
      model: AVATAR_MODEL,
      input: {
        image: `data:image/jpeg;base64,${input.frameBase64}`,
        prompt,
        negative_prompt: AVATAR_NEGATIVE_PROMPT,
        style: "Cartoon",
        prompt_strength: 2.0,
        ip_adapter_noise: 0.3,
        guidance_scale: 8.5,
        num_steps: 35,
      },
      webhook: `${appUrl}/api/replicate/avatar-webhook`,
      webhook_events_filter: ["completed"],
    });
    console.log("[avatar] prediction creada:", prediction.id);
    return { predictionId: prediction.id };
  } catch (err) {
    console.error("[avatar] startAvatarPrediction error:", err);
    return { error: "No pudimos iniciar la generación. Intentá de nuevo." };
  }
}

export async function finalizePrediction(
  prediction: {
    id: string;
    status: string;
    output?: unknown;
    error?: string | null;
  },
  clientId: string
): Promise<void> {
  if (prediction.status === "succeeded") {
    const raw = prediction.output;
    const tempUrl: string | null =
      Array.isArray(raw) ? (raw[0] as string) ?? null : typeof raw === "string" ? raw : null;

    if (!tempUrl) {
      await markFailed(clientId, "Replicate devolvió output vacío");
      return;
    }

    let finalUrl = tempUrl;

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const response = await fetch(tempUrl);
        if (!response.ok) {
          await markFailed(clientId, `Fetch del avatar falló: ${response.status}`);
          return;
        }
        const buffer = await response.arrayBuffer();
        const blob = await put(
          `marciano/avatars/${clientId}.jpg`,
          Buffer.from(buffer),
          { access: "public", contentType: "image/jpeg", allowOverwrite: true }
        );
        finalUrl = blob.url;
        console.log("[avatar] blob OK:", blob.url);
      } catch (err) {
        console.error("[avatar] blob upload error:", err);
        await markFailed(clientId, "No pudimos guardar el avatar");
        return;
      }
    } else {
      console.warn("[avatar] BLOB_READ_WRITE_TOKEN missing — usando Replicate temp URL");
    }

    await db
      .update(clients)
      .set({
        avatarUrl: finalUrl,
        avatarStatus: "ready",
        avatarErrorMessage: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(clients.id, clientId),
          eq(clients.avatarPredictionId, prediction.id)
        )
      );
    return;
  }

  if (prediction.status === "failed" || prediction.status === "canceled") {
    await markFailed(
      clientId,
      prediction.error ?? `Replicate ${prediction.status}`
    );
    return;
  }
  // 'starting' | 'processing' → still running, polling will check again
}

async function markFailed(clientId: string, errorMessage: string): Promise<void> {
  await db
    .update(clients)
    .set({
      avatarStatus: "failed",
      avatarErrorMessage: errorMessage.slice(0, 500),
      updatedAt: new Date(),
    })
    .where(eq(clients.id, clientId));
}

export async function getReplicatePrediction(predictionId: string) {
  try {
    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN! });
    return await replicate.predictions.get(predictionId);
  } catch (err) {
    console.error("[avatar] getReplicatePrediction error:", err);
    return null;
  }
}

export async function cancelReplicatePrediction(predictionId: string): Promise<void> {
  try {
    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN! });
    await replicate.predictions.cancel(predictionId);
  } catch (err) {
    console.warn("[avatar] cancel falló (continuamos limpiando DB):", err);
  }
}
