import Replicate from "replicate";
import Anthropic from "@anthropic-ai/sdk";
import { put } from "@vercel/blob";

// Claude describe el pelo y rasgos para refinar el prompt
async function describeFaceForAvatar(frameBase64: string): Promise<string> {
  try {
    const client = new Anthropic();
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 60,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: "image/jpeg", data: frameBase64 },
            },
            {
              type: "text",
              text: `Describe the hair and one distinctive facial feature of this person for a cartoon avatar.
Reply in English, exact format: "hair: X, distinctive: X"
Hair: describe color + style (ex: "black short fade", "brown wavy medium", "blonde buzz cut")
Distinctive: one feature (ex: "strong jawline", "thick eyebrows", "wide smile", "sharp cheekbones")`,
            },
          ],
        },
      ],
    });

    const raw = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
    console.log("[avatar] Face description:", raw);
    return raw;
  } catch {
    return "hair: black short fade, distinctive: sharp eyes";
  }
}

export async function generateAvatar(
  frameBase64: string,
  favoriteColor: string,
  clientId: string
): Promise<string | null> {
  try {
    console.log("[avatar] Describiendo cara con Claude...");
    const faceDescription = await describeFaceForAvatar(frameBase64);

    const stylePrompt =
      `alien character with ${favoriteColor} skin, ${faceDescription}, ` +
      `oversized hoodie, silver chain, holding styrofoam cup, ` +
      `Argentinian trap culture, Buenos Aires barbershop, ` +
      `deep black background with neon green glow and stars, ` +
      `bust portrait, 2D cartoon illustration, NFT avatar style`;

    console.log("[avatar] Llamando fofr/face-to-many...");
    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN! });

    const output = await Promise.race([
      replicate.run("fofr/face-to-many:a07f252abbbd832009640b27f063ea52d87d7a23b8b827de51f9b0ded58a5e05", {
        input: {
          image: `data:image/jpeg;base64,${frameBase64}`,
          style: "3D",
          prompt: stylePrompt,
          negative_prompt: "photorealistic, photo, realistic, barber pole",
          num_outputs: 1,
        },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Replicate timeout 90s")), 90000)
      ),
    ]);

    console.log("[avatar] fofr respondió. Output:", typeof output, Array.isArray(output) ? "array" : "single");

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
