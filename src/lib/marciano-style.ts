import type { FaceShape, InterrogatoryAnswers, StyleDominante, StyleProfile } from "@/lib/types";

// ————————————————————————————
// Face shape → estilo A51
// ————————————————————————————
const STYLE_BY_SHAPE: Record<FaceShape, StyleDominante> = {
  oval: "Comandante",
  cuadrado: "Capitán",
  redondo: "Piloto",
  corazon: "Navegante",
  diamante: "Explorador",
  alien: "Intergaláctico",
};

// ————————————————————————————
// Smart cuts matrix: shape × lifestyle × morningMinutes
// Based on barbering research (Apr 2026)
// ————————————————————————————
export function getDefaultCuts(shape: FaceShape, answers: InterrogatoryAnswers): string[] {
  const { lifestyle, morningMinutes } = answers;
  const highMaint = morningMinutes >= 5;

  switch (shape) {
    case "oval":
      if (lifestyle === "formal") {
        return highMaint ? ["Pompadour", "Slick Back"] : ["Side Part", "French Crop"];
      }
      return highMaint ? ["Quiff", "Taper Fade"] : ["French Crop", "Crew Cut"];

    case "cuadrado":
      if (lifestyle === "formal") {
        return highMaint ? ["Pompadour", "Hard Part"] : ["French Crop", "Quiff"];
      }
      if (lifestyle === "nocturno") {
        return highMaint ? ["Quiff", "French Crop"] : ["French Crop", "Crew Cut"];
      }
      return highMaint ? ["French Crop", "Quiff"] : ["French Crop", "Crew Cut"];

    case "redondo":
      if (lifestyle === "formal") {
        return highMaint ? ["Pompadour", "Quiff"] : ["Quiff", "French Crop"];
      }
      if (lifestyle === "outdoor" && highMaint) {
        return ["Quiff", "Faux Hawk"];
      }
      return highMaint ? ["Quiff", "French Crop"] : ["French Crop", "Crew Cut"];

    case "corazon":
      if (lifestyle === "formal" && highMaint) {
        return ["Slick Back", "Side Part"];
      }
      return highMaint ? ["Side Part", "Quiff"] : ["Textured Crop", "Side Part"];

    case "diamante":
      if (lifestyle === "formal" && highMaint) {
        return ["Faux Hawk", "Textured Quiff"];
      }
      return highMaint ? ["Textured Crop", "Long Top Fade"] : ["Textured Crop", "Messy Top"];

    case "alien":
      return ["Buzz Cut", "Crew Cut", "Lo que quieras"];
  }
}

// ————————————————————————————
// Chair time by morning minutes
// ————————————————————————————
function estimateChairTime(morningMinutes: number): number {
  if (morningMinutes === 0) return 30;
  if (morningMinutes === 3) return 30;
  if (morningMinutes === 5) return 45;
  return 60; // 10+
}

// ————————————————————————————
// Style override: lifestyle × morningMinutes can shift the base style
// ————————————————————————————
function applyStyleOverride(
  shape: FaceShape,
  base: StyleDominante,
  answers: InterrogatoryAnswers
): StyleDominante {
  // oval + nocturno/outdoor + 0min → Capitán (menos mantenimiento)
  if (shape === "oval" && (answers.lifestyle === "nocturno" || answers.lifestyle === "outdoor") && answers.morningMinutes === 0) {
    return "Capitán";
  }
  // cuadrado + formal + 10min → Comandante (más versatilidad)
  if (shape === "cuadrado" && answers.lifestyle === "formal" && answers.morningMinutes >= 5) {
    return "Comandante";
  }
  return base;
}

// ————————————————————————————
// Face shape classification from MediaPipe metrics
// ————————————————————————————
export type FaceMetrics = {
  widthHeightRatio: number;   // face_width / face_height
  jawWidthRatio: number;      // jaw_width / face_width
  foreheadChinRatio: number;  // forehead_width / chin_width
};

export function classifyFaceShape(metrics: FaceMetrics): FaceShape {
  const { widthHeightRatio, jawWidthRatio, foreheadChinRatio } = metrics;

  // oval: length >> width
  if (widthHeightRatio < 0.78) return "oval";

  // cuadrado: wide + strong jaw
  if (widthHeightRatio >= 0.90 && jawWidthRatio >= 0.88) return "cuadrado";

  // redondo: wide + soft jaw
  if (widthHeightRatio >= 0.90 && jawWidthRatio < 0.85) return "redondo";

  // corazon: forehead much wider than chin
  if (foreheadChinRatio > 1.15) return "corazon";

  // diamante: narrow forehead + narrow chin + wide cheekbones
  if (foreheadChinRatio < 0.92) return "diamante";

  // fallback: alien (unclassifiable face — embrace it)
  return "alien";
}

// ————————————————————————————
// Generate Style Profile (without idealBarberoId — that requires DB)
// cutsOverride: Pinky's configured cuts for this shape (from marciano_cuts_config)
// ————————————————————————————
export function generateStyleProfile(
  shape: FaceShape,
  answers: InterrogatoryAnswers,
  metrics: FaceMetrics | null,
  cutsOverride: string[] | null = null
): Omit<StyleProfile, "idealBarberoId"> {
  const baseStyle = STYLE_BY_SHAPE[shape];
  const dominantStyle = applyStyleOverride(shape, baseStyle, answers);
  const recommendedCuts = cutsOverride && cutsOverride.length > 0
    ? cutsOverride
    : getDefaultCuts(shape, answers);
  const chairTimeMin = estimateChairTime(answers.morningMinutes);

  return {
    version: 1,
    dominantStyle,
    recommendedCuts,
    chairTimeMin,
    faceMetrics: metrics,
    answers,
    generatedAt: new Date().toISOString(),
  };
}

// ————————————————————————————
// Match ideal barbero (server-side, requires DB import)
// Returns barberoId or null (caller shows Pinky as fallback)
// ————————————————————————————
export async function matchIdealBarbero(
  shape: FaceShape,
  db: import("@/db").DB
): Promise<string | null> {
  const { barberos } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");

  const activeBarberos = await db
    .select({ id: barberos.id, nombre: barberos.nombre })
    .from(barberos)
    .where(eq(barberos.activo, true));

  if (activeBarberos.length === 0) return null;

  // With only 2 barberos (Pinky, Gabote), return null to use Pinky fallback
  // unless there are 3+ where a real heuristic could apply
  if (activeBarberos.length <= 2) return null;

  // For future: shape-based matching logic here
  return null;
}

// ————————————————————————————
// Lifestyle image placeholders (Pinky provides final images)
// ————————————————————————————
export const LIFESTYLE_IMAGES: Record<string, string> = {
  minimal: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80",
  nocturno: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80",
  outdoor: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=400&q=80",
  formal: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80",
};
