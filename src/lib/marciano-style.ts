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
// Based on barbering research Apr 2026 — 55 modern cuts (2022-2025)
// targeting young men 18-35, Argentine barbershop context
// ————————————————————————————
export function getDefaultCuts(shape: FaceShape, answers: InterrogatoryAnswers): string[] {
  const { lifestyle, morningMinutes } = answers;
  const low  = morningMinutes <= 3;   // 0-3 min
  const mid  = morningMinutes === 5;  // 5 min
  const high = morningMinutes >= 10;  // 10+ min

  switch (shape) {

    // ——— OVAL: el más versátil, acepta todo ———
    case "oval":
      if (lifestyle === "formal") {
        if (high) return ["Pompadour Moderno", "Slick Back", "Side Part"];
        if (mid)  return ["Copete Texturizado", "Side Part", "Brush Up"];
        return ["French Crop", "Raya Lateral", "Ivy League"];
      }
      if (lifestyle === "nocturno") {
        if (high) return ["Wolf Cut", "Slicked-Back Undercut", "Mullet Moderno"];
        if (mid)  return ["Curtain Fringe", "Disconnected Undercut", "Corte Coma"];
        return ["Textured Crop", "Mid Fade Textured Top", "Natural Texture Fade"];
      }
      if (lifestyle === "outdoor") {
        if (high) return ["Faux Hawk", "Brush Up", "Copete Texturizado"];
        if (mid)  return ["Textured Fringe", "High Fade Textured Top", "Quiff"];
        return ["Crew Cut", "French Crop", "Mid Fade Textured Top"];
      }
      // minimal
      if (high) return ["Copete Texturizado", "Corte Coma", "Korean Two Block"];
      if (mid)  return ["Curtain Fringe", "Textured Fringe", "Soft Two Block"];
      return ["French Crop", "Textured Crop", "Natural Texture Fade"];

    // ——— CUADRADO: necesita altura, suavizar la mandíbula ———
    case "cuadrado":
      if (lifestyle === "formal") {
        if (high) return ["Pompadour Moderno", "Hard Part Fade", "Slick Back"];
        if (mid)  return ["Copete Texturizado", "Side Part", "Comb Over Fade"];
        return ["French Crop", "Ivy League", "Crew Cut"];
      }
      if (lifestyle === "nocturno") {
        if (high) return ["Mullet Moderno", "Disconnected Undercut", "Wolf Cut"];
        if (mid)  return ["Korean Two Block", "Slicked-Back Undercut", "Quiff"];
        return ["Mid Fade Textured Top", "French Crop", "Crew Cut"];
      }
      if (lifestyle === "outdoor") {
        if (high) return ["Faux Hawk", "Brush Up", "Drop Cut"];
        if (mid)  return ["High Fade Textured Top", "Textured Fringe", "Quiff"];
        return ["French Crop", "Crew Cut", "Buzz Cut"];
      }
      // minimal
      if (high) return ["Copete Texturizado", "Soft Two Block", "Corte Coma"];
      if (mid)  return ["Textured Fringe", "Korean Two Block", "Mid Fade Textured Top"];
      return ["French Crop", "Textured Crop", "Crew Cut"];

    // ——— REDONDO: necesita elongación y volumen en la cima ———
    case "redondo":
      if (lifestyle === "formal") {
        if (high) return ["Pompadour Moderno", "Quiff", "Copete Texturizado"];
        if (mid)  return ["Quiff", "Copete Texturizado", "Faux Hawk"];
        return ["French Crop", "High Fade Textured Top", "Ivy League"];
      }
      if (lifestyle === "nocturno") {
        if (high) return ["Wolf Cut", "Faux Hawk", "Mullet Moderno"];
        if (mid)  return ["Textured Fringe", "Curtain Fringe", "Quiff"];
        return ["High Fade Textured Top", "French Crop", "Mid Fade Textured Top"];
      }
      if (lifestyle === "outdoor") {
        if (high) return ["Faux Hawk", "Quiff", "Drop Cut"];
        if (mid)  return ["Textured Fringe", "High Fade Textured Top", "Corte Coma"];
        return ["French Crop", "Crew Cut", "Mid Fade Textured Top"];
      }
      // minimal
      if (high) return ["Copete Texturizado", "Corte Coma", "Curtain Fringe"];
      if (mid)  return ["Textured Fringe", "High Fade Textured Top", "Quiff"];
      return ["French Crop", "Textured Crop", "Ivy League"];

    // ——— CORAZÓN: frente ancha, mentón angosto — equilibrar ———
    case "corazon":
      if (lifestyle === "formal") {
        if (high) return ["Slick Back", "Side Part", "Comb Over Fade"];
        if (mid)  return ["Side Part", "Copete Texturizado", "Soft Two Block"];
        return ["Caesar Cut", "French Crop", "Textured Crop"];
      }
      if (lifestyle === "nocturno") {
        if (high) return ["Curtain Fringe", "Wolf Cut", "Disconnected Undercut"];
        if (mid)  return ["Korean Two Block", "Corte Coma", "Curtain Fringe"];
        return ["Natural Texture Fade", "Textured Crop", "Mid Fade Textured Top"];
      }
      if (lifestyle === "outdoor") {
        if (high) return ["Faux Hawk", "Drop Cut", "Textured Fringe"];
        if (mid)  return ["Textured Fringe", "Corte Coma", "Soft Two Block"];
        return ["French Crop", "Textured Crop", "Crew Cut"];
      }
      // minimal
      if (high) return ["Curtain Fringe", "Corte Coma", "Korean Two Block"];
      if (mid)  return ["Soft Two Block", "Textured Fringe", "Side Part"];
      return ["Textured Crop", "Caesar Cut", "French Crop"];

    // ——— DIAMANTE: pómulos anchos, frente y mentón angostos ———
    case "diamante":
      if (lifestyle === "formal") {
        if (high) return ["Faux Hawk", "Copete Texturizado", "Hard Part Fade"];
        if (mid)  return ["Textured Quiff Fade", "Side Part", "Soft Two Block"];
        return ["Ivy League", "French Crop", "Crew Cut"];
      }
      if (lifestyle === "nocturno") {
        if (high) return ["Wolf Cut", "Mullet Moderno", "Disconnected Undercut"];
        if (mid)  return ["Curtain Fringe", "Korean Two Block", "Corte Coma"];
        return ["Natural Texture Fade", "Textured Crop", "Mid Fade Textured Top"];
      }
      if (lifestyle === "outdoor") {
        if (high) return ["Faux Hawk", "Brush Up", "Drop Cut"];
        if (mid)  return ["High Fade Textured Top", "Textured Fringe", "Corte Coma"];
        return ["Textured Crop", "Crew Cut", "Mid Fade Textured Top"];
      }
      // minimal
      if (high) return ["Curtain Fringe", "Corte Coma", "Soft Two Block"];
      if (mid)  return ["Korean Two Block", "Textured Fringe", "Natural Texture Fade"];
      return ["Textured Crop", "Messy Top Fade", "French Crop"];

    // ——— ALIEN: inclasificable — todos los cortes son válidos ———
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
