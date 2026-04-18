import Anthropic from "@anthropic-ai/sdk";
import type { InterrogatoryAnswers, StyleAnalysis } from "@/lib/types";

export async function generateStyleTitle(answers: InterrogatoryAnswers): Promise<string | null> {
  try {
    const client = new Anthropic();

    const answersDesc = [
      answers.praiseResponse && `Cuando alguien le dice que su corte quedó bien: ${answers.praiseResponse}`,
      answers.lifestyle && `Estilo de vida: ${answers.lifestyle}`,
      answers.morningMinutes !== undefined && `Tiempo con el pelo por la mañana: ${answers.morningMinutes} min`,
      answers.perfectCut && `Un corte es perfecto cuando: ${answers.perfectCut}`,
      answers.feedbackTolerance && `Si el barbero sugiere algo distinto: ${answers.feedbackTolerance}`,
      answers.music && `Música: ${answers.music}`,
      answers.socialProjection && `Le importa lo que piensen los demás: ${answers.socialProjection}`,
      answers.chairBehavior && `En el sillón: ${answers.chairBehavior}`,
      answers.beard && `La barba: ${answers.beard}`,
      answers.barberTrust && `Con el barbero: ${answers.barberTrust}`,
      answers.freeText && `Algo que le gusta mucho: ${answers.freeText}`,
    ].filter(Boolean).join("\n");

    const msg = await client.messages.create({
      model: MODEL_ID,
      max_tokens: 15,
      messages: [
        {
          role: "user",
          content: `Sos un barbero-psicólogo porteño. Leé estas respuestas y asignale a este tipo UN título personal.

El formato es exactamente: El [Sustantivo]
Una sola palabra después de "El". En español. Sin explicación.

El título debe capturar su esencia real — no su estilo de corte, sino su manera de ser. Tiene que sonar específico, urbano, con carácter. Evitá palabras genéricas o aspiracionales. Ejemplos de tono: El Deriva, El Ruido, El Hueso, El Fulgor, El Abismo, El Vértice, El Sello, El Pulso.

Respuestas:
${answersDesc}

Respondé SOLO el título. Sin puntuación al final.`,
        },
      ],
    });

    const raw = msg.content[0].type === "text" ? msg.content[0].text.trim() : "";
    // Validate format: must start with "El " and be 2-3 words max
    if (/^El\s+\w+$/i.test(raw)) return raw;
    // If model added punctuation or extra text, try to extract
    const match = raw.match(/^El\s+\w+/i);
    return match ? match[0] : null;
  } catch {
    return null;
  }
}

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
