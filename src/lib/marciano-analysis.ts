import Anthropic from "@anthropic-ai/sdk";
import type { InterrogatoryAnswers, StyleAnalysis } from "@/lib/types";

const MODEL_ID = "claude-haiku-4-5-20251001";

export async function generateStyleAnalysis(
  answers: InterrogatoryAnswers
): Promise<StyleAnalysis | null> {
  try {
    const client = new Anthropic();
    const msg = await client.messages.create({
      model: MODEL_ID,
      max_tokens: 400,
      messages: [
        {
          role: "user",
          content: `Sos un barbero experto en Buenos Aires. Analizá estas respuestas de cuestionario de estilo y devolvé SOLO un JSON con este schema:
{
  "perfil": string,
  "estilosProbables": string[],
  "actitudCambio": "conservador" | "abierto" | "aventurero",
  "notasBarbero": string,
  "confianza": number
}

Respuestas del cliente:
${JSON.stringify(answers, null, 2)}

Respondé SOLO el JSON. Sin texto antes ni después. Sin triple backticks.`,
        },
      ],
    });

    const raw = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned) as Omit<StyleAnalysis, "generadoEn" | "modelo">;

    if (
      typeof parsed.perfil !== "string" ||
      !Array.isArray(parsed.estilosProbables) ||
      !["conservador", "abierto", "aventurero"].includes(parsed.actitudCambio) ||
      typeof parsed.notasBarbero !== "string" ||
      typeof parsed.confianza !== "number"
    ) {
      return null;
    }

    return {
      ...parsed,
      generadoEn: new Date().toISOString(),
      modelo: MODEL_ID,
    };
  } catch (err) {
    console.error("[style-analysis] error:", err);
    return null;
  }
}
