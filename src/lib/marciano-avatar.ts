import Replicate from "replicate";
import { put } from "@vercel/blob";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { FACE_SHAPE_DESCRIPTIONS } from "@/lib/marciano-colors";
import type { FaceShape } from "@/lib/types";

const AVATAR_MODEL_VERSION = "a07f252abbbd832009640b27f063ea52d87d7a23a185ca165bec23b5adc8deaf";

export type AvatarPreset = "galactic" | "elf" | "demon" | "android" | "cosmic" | "orc";

export const AVATAR_PRESETS: Record<AvatarPreset, { label: string; vibe: string; prompt: string; negativePrompt: string }> = {
  galactic: {
    label: "Galactic Alien",
    vibe: "Clásico espacial",
    prompt:
      "{COLOR} skin, {HEX} skin color, entirely {COLOR} alien skin, close-up portrait of a cartoon alien, face and neck only, 100% {COLOR} skin tone on entire face and neck, looking directly forward, calm expression, mouth closed, elongated oval alien head, very large almond-shaped solid black eyes, small pointed ears, bioluminescent spots, visible hairstyle, detailed hair, outer space background with stars and colorful nebula.",
    negativePrompt:
      "human skin color, natural skin tone, flesh color, beige, tan, brown, pink skin, small eyes, round eyes, human eyes, full body, screaming, open mouth, bald, shaved head, no hair, blurry, low quality, ugly, deformed.",
  },
  elf: {
    label: "Fantasy Elf",
    vibe: "Mágico / RPG",
    prompt:
      "{COLOR} skin, {HEX} skin color, entirely {COLOR} fantasy elf skin, close-up portrait of a cartoon fantasy elf, face and neck only, 100% {COLOR} skin tone on entire face and neck, looking directly forward, calm expression, mouth closed, very long pointed elven ears, glowing magical eyes, ethereal glowing aura on skin, visible hairstyle, detailed hair, enchanted glowing forest background with magical fireflies.",
    negativePrompt:
      "human skin color, natural skin tone, flesh color, beige, tan, brown, pink skin, round ears, human ears, human eyes, full body, screaming, open mouth, bald, shaved head, no hair, sci-fi, blurry, low quality, ugly, deformed.",
  },
  demon: {
    label: "Underworld Demon",
    vibe: "Dark fantasy",
    prompt:
      "{COLOR} skin, {HEX} skin color, entirely {COLOR} demon skin, close-up portrait of a cartoon demon, face and neck only, 100% {COLOR} skin tone on entire face and neck, looking directly forward, calm expression, mouth closed, dark demonic horns protruding from forehead, glowing solid red eyes, pointed ears, subtle textured scales on jawline, visible hairstyle, detailed hair, background of dark glowing embers and fiery smoke.",
    negativePrompt:
      "human skin color, natural skin tone, flesh color, beige, tan, brown, pink skin, human eyes, round eyes, halo, angelic, full body, screaming, open mouth, bald, shaved head, no hair, blurry, low quality, ugly, deformed.",
  },
  android: {
    label: "Cyberpunk Android",
    vibe: "Sci-Fi / Tech",
    prompt:
      "{COLOR} skin, {HEX} skin color, entirely {COLOR} android skin, close-up portrait of a cartoon cyberpunk android, face and neck only, 100% {COLOR} skin tone on entire face and neck, looking directly forward, calm expression, mouth closed, glowing mechanical neon eyes, subtle futuristic metallic panel lines on cheeks, glowing {COLOR} circuit lines on neck, visible hairstyle, detailed hair, futuristic neon cyberpunk city background at night.",
    negativePrompt:
      "human skin color, natural skin tone, flesh color, beige, tan, brown, pink skin, human eyes, completely organic face, primitive, full body, screaming, open mouth, bald, shaved head, no hair, nature background, blurry, low quality, ugly, deformed.",
  },
  cosmic: {
    label: "Cosmic Star-Being",
    vibe: "Celestial / Dios",
    prompt:
      "{COLOR} skin, {HEX} skin color, entirely {COLOR} cosmic skin, close-up portrait of a cartoon celestial star-being, face and neck only, 100% {COLOR} skin tone on entire face and neck, looking directly forward, calm expression, mouth closed, skin looks like a sparkling galaxy with subtle stars, glowing solid white eyes with no pupils, radiant energy aura, visible hairstyle, detailed hair, bright cosmic supernova background.",
    negativePrompt:
      "human skin color, natural skin tone, flesh color, beige, tan, brown, pink skin, human eyes, flat skin texture, normal skin, full body, screaming, open mouth, bald, shaved head, no hair, blurry, low quality, ugly, deformed.",
  },
  orc: {
    label: "Orc / Goblin",
    vibe: "Gamer / Combate",
    prompt:
      "{COLOR} skin, {HEX} skin color, entirely {COLOR} orc skin, close-up portrait of a cartoon fantasy orc, face and neck only, 100% {COLOR} skin tone on entire face and neck, looking directly forward, calm expression, mouth closed, rugged textured skin, prominent lower jaw, fierce glowing eyes, large pointed ears, visible hairstyle, detailed hair, dramatic fantasy battleground background with storm clouds.",
    negativePrompt:
      "human skin color, natural skin tone, flesh color, beige, tan, brown, pink skin, soft features, cute, human eyes, full body, screaming, open mouth, bald, shaved head, no hair, sci-fi, blurry, low quality, ugly, deformed.",
  },
};

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
