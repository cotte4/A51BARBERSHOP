import Replicate from "replicate";
import { put } from "@vercel/blob";
import { FACE_SHAPE_DESCRIPTIONS } from "@/lib/marciano-colors";
import type { FaceShape } from "@/lib/types";

// {COLOR} → nombre del color elegido, {FACE_SHAPE} → descripción de la forma de cara
const AVATAR_PROMPT =
  "illustrated alien avatar, Buenos Aires trap barber, {COLOR} extraterrestrial skin, " +
  "large dark reflective eyes, styled hair framing a {FACE_SHAPE} with sharp fade, " +
  "oversized hoodie, silver chain necklace, holding a styrofoam cup, " +
  "confident relaxed pose, tattoos on neck and hands, " +
  "dark background with glowing {COLOR} neon light and floating barber pole holograms, " +
  "clean cartoon illustration, bold black outlines, vibrant flat colors, " +
  "trap aesthetic, futuristic streetwear, NFT avatar art, 2D digital art, high detail";

const AVATAR_NEGATIVE_PROMPT =
  "photorealistic, photograph, realistic skin, 3D render, blurry, low quality, " +
  "ugly, deformed, extra limbs, multiple faces, watermark, text, logo";

export async function generateAvatar(
  frameBase64: string,
  colorNombre: string,
  faceShape: FaceShape,
  clientId: string
): Promise<string | null> {
  try {
    const shapeDesc = FACE_SHAPE_DESCRIPTIONS[faceShape] ?? "oval face";
    const prompt = AVATAR_PROMPT
      .replaceAll("{COLOR}", colorNombre)
      .replaceAll("{FACE_SHAPE}", shapeDesc);
    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN! });

    console.log("[avatar] Llamando InstantID + IP-Adapter...");

    const output = await Promise.race([
      replicate.run(
        "zsxkib/instant-id-ipadapter-plus-face:32402fb5c493d883aa6cf098ce3e4cc80f1fe6871f6ae7f632a8dbde01a3d161",
        {
          input: {
            image: `data:image/jpeg;base64,${frameBase64}`,
            prompt,
            negative_prompt: AVATAR_NEGATIVE_PROMPT,
            width: 1024,
            height: 1024,
            steps: 30,
            instantid_weight: 0.8,   // alta preservación de identidad
            ipadapter_weight: 0.8,   // fuerte influencia del prompt de estilo
          },
        }
      ),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Replicate timeout 120s")), 120000)
      ),
    ]);

    console.log("[avatar] InstantID respondió. Output:", typeof output, Array.isArray(output) ? "array" : "single");

    const replicateFileOutput = Array.isArray(output) ? output[0] : output;
    if (!replicateFileOutput) {
      console.log("[avatar] Output vacío");
      return null;
    }

    const tempUrl =
      typeof replicateFileOutput === "string"
        ? replicateFileOutput
        : (replicateFileOutput as { url: () => string }).url?.();

    console.log("[avatar] URL temporal:", tempUrl);
    if (!tempUrl) return null;

    const response = await fetch(tempUrl);
    if (!response.ok) {
      console.log("[avatar] Fetch falló:", response.status);
      return null;
    }
    const buffer = await response.arrayBuffer();

    const blob = await put(
      `marciano/avatars/${clientId}.jpg`,
      Buffer.from(buffer),
      { access: "public", contentType: "image/jpeg" }
    );

    console.log("[avatar] Blob OK:", blob.url);
    return blob.url;
  } catch (err) {
    console.error("[avatar] generateAvatar error:", err);
    return null;
  }
}
