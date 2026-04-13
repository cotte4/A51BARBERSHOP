import Replicate from "replicate";
import { put } from "@vercel/blob";

// Prompt definitivo v2 — 13/04/2026 (ajustado a referencias visuales)
// {COLOR} aplica a la piel alien — pelo y fondo son constantes (dark teal + barber pole)
const AVATAR_PROMPT =
  "flat 2D cartoon illustration of an alien barber from Buenos Aires, " +
  "{COLOR} smooth alien skin, large solid black eyes with tiny white dot pupils, " +
  "short styled hair, wearing a hoodie, holding a styrofoam cup with both hands, " +
  "relaxed chill expression, bust portrait centered, " +
  "background: dark deep teal space, glowing neon barber pole hologram, small stars scattered, " +
  "Argentinian trap culture, urban streetwear, bold black outlines, vibrant flat colors, " +
  "clean cel-shading, NFT avatar art, no photorealism, 2D digital illustration";

export async function generateAvatar(
  frameBase64: string,
  favoriteColor: string,
  clientId: string
): Promise<string | null> {
  try {
    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN!,
    });

    const prompt = AVATAR_PROMPT.replace(/\{COLOR\}/g, favoriteColor);

    // Convertir base64 → Buffer (el SDK de Replicate lo sube automáticamente)
    const imageBuffer = Buffer.from(frameBase64, "base64");

    // Modelo: easel/ai-avatars
    // Diseñado para producción/apps comerciales (messaging, social, creative apps)
    // Sin entrenamiento previo, genera desde 1 foto
    // Docs: https://replicate.com/easel/ai-avatars
    // Versión pineada: 2025-04-30 — cambiar solo si hay una versión verificada mejor
    const output = await replicate.run("easel/ai-avatars:27ebf241efeded7a50964c7cff8f27c79e1570674be70d8e1df712ae31857d34", {
      input: {
        prompt,
        face_image: imageBuffer,
        user_gender: "male",
      },
    });

    // output puede ser FileOutput (ReadableStream con .url()) o string directo
    const replicateFileOutput = Array.isArray(output) ? output[0] : output;
    if (!replicateFileOutput) return null;

    const tempUrl =
      typeof replicateFileOutput === "string"
        ? replicateFileOutput
        : (replicateFileOutput as { url: () => string }).url?.();
    if (!tempUrl) return null;

    // Descargar desde la URL temporal de Replicate y persistir en Vercel Blob
    const response = await fetch(tempUrl);
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();

    const blob = await put(
      `marciano/avatars/${clientId}.jpg`,
      Buffer.from(buffer),
      { access: "public", contentType: "image/jpeg" }
    );

    return blob.url;
  } catch (err) {
    console.error("generateAvatar error:", err);
    return null;
  }
}
