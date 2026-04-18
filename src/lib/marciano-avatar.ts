import Replicate from "replicate";
import sharp from "sharp";
import { put } from "@vercel/blob";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { FACE_SHAPE_DESCRIPTIONS } from "@/lib/marciano-colors";
import type { FaceShape } from "@/lib/types";
import { AVATAR_PRESETS } from "@/lib/marciano-avatar-presets";
import type { AvatarPreset } from "@/lib/marciano-avatar-presets";
export type { AvatarPreset } from "@/lib/marciano-avatar-presets";

const AVATAR_MODEL_VERSION = "a07f252abbbd832009640b27f063ea52d87d7a23a185ca165bec23b5adc8deaf";
const CLEAN_MODEL_VERSION = "b0bb4c529bb749ac98145e70f42f88d36598e89310beeeba4ee00e14238d1b4d"; // nightmareai/real-esrgan + face_enhance

export async function startAvatarPrediction(input: {
  frameBase64: string;
  colorNombre: string;
  colorHex: string;
  faceShape: FaceShape;
  preset?: AvatarPreset;
}): Promise<{ predictionId: string } | { error: string }> {
  const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN! });
  const presetData = AVATAR_PRESETS[input.preset ?? "galactic"];
  const prompt = presetData.prompt
    .replaceAll("{COLOR}", input.colorNombre)
    .replaceAll("{HEX}", input.colorHex);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  try {
    const prediction = await replicate.predictions.create({
      version: AVATAR_MODEL_VERSION,
      input: {
        image: `data:image/jpeg;base64,${input.frameBase64}`,
        prompt,
        negative_prompt: presetData.negativePrompt,
        style: "Emoji",
        prompt_strength: 13,
        instant_id_strength: 0.22,
        denoising_strength: 0.88,
        control_depth_strength: 0.5,
        num_steps: 35,
      },
      webhook: `${appUrl}/api/replicate/avatar-webhook`,
      webhook_events_filter: ["completed"],
    });
    console.log("[avatar] prediction creada:", prediction.id);
    return { predictionId: prediction.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err);
    console.error("[avatar] startAvatarPrediction error:", msg);
    return { error: "No pudimos iniciar la generación. Intentá de nuevo." };
  }
}

const CLEAN_MAX_PIXELS = 2_000_000; // stay under Real-ESRGAN GPU limit (~2.1M)

async function fetchAndResizeForClean(avatarUrl: string): Promise<string> {
  const res = await fetch(avatarUrl);
  const buffer = Buffer.from(await res.arrayBuffer());
  const meta = await sharp(buffer).metadata();
  const w = meta.width ?? 1024;
  const h = meta.height ?? 1024;

  if (w * h <= CLEAN_MAX_PIXELS) {
    return `data:image/jpeg;base64,${buffer.toString("base64")}`;
  }

  const ratio = Math.sqrt(CLEAN_MAX_PIXELS / (w * h));
  const newW = Math.floor(w * ratio);
  const newH = Math.floor(h * ratio);
  const resized = await sharp(buffer).resize(newW, newH).jpeg({ quality: 92 }).toBuffer();
  console.log(`[avatar-clean] resized ${w}×${h} → ${newW}×${newH}`);
  return `data:image/jpeg;base64,${resized.toString("base64")}`;
}

export async function startAvatarCleanPrediction(input: {
  avatarUrl: string;
}): Promise<{ predictionId: string } | { error: string }> {
  const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN! });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  try {
    const imageData = await fetchAndResizeForClean(input.avatarUrl);

    const prediction = await replicate.predictions.create({
      version: CLEAN_MODEL_VERSION,
      input: {
        image: imageData,
        scale: 2,
        face_enhance: true,
      },
      webhook: `${appUrl}/api/replicate/avatar-webhook`,
      webhook_events_filter: ["completed"],
    });
    console.log("[avatar-clean] prediction creada:", prediction.id);
    return { predictionId: prediction.id };
  } catch (err) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err);
    console.error("[avatar-clean] error:", msg);
    return { error: "No pudimos iniciar la limpieza. Intentá de nuevo." };
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
          `marciano/avatars/${clientId}-${prediction.id.slice(0, 12)}.jpg`,
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
