"use server";

import Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clients, clientBriefingCache, marcianoCutsConfig } from "@/db/schema";
import { requireMarcianoClient } from "@/lib/marciano-portal";
import { generateStyleProfile, matchIdealBarbero } from "@/lib/marciano-style";
import { generateStyleAnalysis } from "@/lib/marciano-analysis";
import type { FaceShape, InterrogatoryAnswers, StyleProfile } from "@/lib/types";
import type { FaceMetrics } from "@/lib/marciano-style";

const VALID_SHAPES = new Set<FaceShape>(["oval", "cuadrado", "redondo", "corazon", "diamante"]);

// Classify face shape using Claude Haiku vision as a second opinion.
// Returns null on any error so the caller can fall back to geometric classification.
export async function classifyFaceWithAI(imageBase64: string): Promise<FaceShape | null> {
  try {
    const client = new Anthropic();
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 10,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: "image/jpeg", data: imageBase64 },
            },
            {
              type: "text",
              text: `Analizá la forma de cara en esta foto de un hombre mirando a la cámara.

Elegí la opción que mejor describe su cara:
- oval: más larga que ancha, mandíbula ligeramente más estrecha que los pómulos
- cuadrado: ancha, mandíbula fuerte y pronunciada, frente y mandíbula similares en ancho
- redondo: ancha y redondeada, sin ángulos pronunciados, mandíbula suave
- corazon: frente ancha, mentón angosto en punta
- diamante: pómulos muy prominentes, frente y mentón más angostos

Respondé SOLO con una de estas palabras exactas, sin puntuación ni explicación:
oval, cuadrado, redondo, corazon, diamante`,
            },
          ],
        },
      ],
    });

    const raw = msg.content[0].type === "text" ? msg.content[0].text.trim().toLowerCase() : "";
    // Extract first valid shape word in case the model adds extra text
    const match = raw.match(/\b(oval|cuadrado|redondo|corazon|diamante)\b/);
    const shape = (match?.[1] ?? raw) as FaceShape;
    return VALID_SHAPES.has(shape) ? shape : null;
  } catch {
    return null;
  }
}

export async function saveStyleProfileAction(input: {
  shape: FaceShape;
  answers: InterrogatoryAnswers;
  metrics: FaceMetrics | null;
}): Promise<{ success: true; profile: StyleProfile } | { success: false; error: string }> {
  try {
    const { client } = await requireMarcianoClient();

    const [cutsConfigRow] = await db
      .select({ cuts: marcianoCutsConfig.cuts })
      .from(marcianoCutsConfig)
      .where(eq(marcianoCutsConfig.faceShape, input.shape))
      .limit(1);

    const cutsOverride = cutsConfigRow?.cuts ?? null;
    const partial = generateStyleProfile(input.shape, input.answers, input.metrics, cutsOverride);
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

    // Psychology analysis — non-blocking, Haiku, failure doesn't affect profile save
    try {
      const analysis = await generateStyleAnalysis(input.answers);
      if (analysis) {
        await db
          .update(clients)
          .set({ styleAnalysis: analysis, updatedAt: new Date() })
          .where(eq(clients.id, client.id));
      }
    } catch (err) {
      console.error("[style-analysis] wrapper error:", err);
    }

    revalidatePath("/marciano");
    revalidatePath("/marciano/perfil-marciano");

    return { success: true, profile };
  } catch (err) {
    console.error("saveStyleProfileAction error:", err);
    return { success: false, error: "No pudimos guardar tu perfil. Intentá de nuevo." };
  }
}
