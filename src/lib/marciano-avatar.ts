import Replicate from "replicate";
import { put } from "@vercel/blob";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { FACE_SHAPE_DESCRIPTIONS } from "@/lib/marciano-colors";
import type { FaceShape } from "@/lib/types";

const AVATAR_MODEL_VERSION =
  "32402fb5c493d883aa6cf098ce3e4cc80f1fe6871f6ae7f632a8dbde01a3d161";

const AVATAR_PROMPT =
  "2D cartoon alien portrait, flat {COLOR} ({HEX}) skin covering 100% of the face neck and head, " +
  "solid {COLOR} skin color everywhere, cel-shaded {COLOR} extraterrestrial, " +
  "oversized glossy black alien eyes, tiny stylized nose, pointed ears, " +
  "{FACE_SHAPE} face shape, sharp modern fade haircut, " +
  "bold black ink outlines, vibrant flat colors, no shading gradients, " +
  "cartoon mascot style, comic book illustration, sticker art, clean vector look, " +
  "outer space background with stars and purple nebula, cosmos background, deep space setting";

const AVATAR_NEGATIVE_PROMPT =
  "human skin, realistic skin, photographic skin, natural skin tone, flesh color, " +
  "beige, tan, pale, brown, pink, peach skin, caucasian, asian, african, latino, " +
  "photograph, photorealistic, hyperrealistic, 3D render, CGI, live action, portrait photo, " +
  "realistic face, realistic eyes, realistic nose, realistic hair, " +
  "indoor background, room background, wall background, studio background, " +
  "blurry, low quality, ugly, deformed, extra limbs, multiple faces, watermark, text, logo";

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
      version: AVATAR_MODEL_VERSION,
      input: {
        image: `data:image/jpeg;base64,${input.frameBase64}`,
        prompt,
        negative_prompt: AVATAR_NEGATIVE_PROMPT,
        width: 1024,
        height: 1024,
        steps: 35,
        instantid_weight: 0.05,
        ipadapter_weight: 1.0,
        guidance_scale: 10,
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
