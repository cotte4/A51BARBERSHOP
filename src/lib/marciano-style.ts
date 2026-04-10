import type { FaceShape, InterrogatoryAnswers, StyleDominante, StyleProfile } from "@/lib/types";

// ————————————————————————————
// Title from answers: lifestyle × perfectCut → título
// Alien face shape is always El Intergaláctico regardless of answers
// ————————————————————————————
function getTitleFromAnswers(shape: FaceShape, answers: InterrogatoryAnswers): StyleDominante {
  if (shape === "alien") return "El Intergaláctico";

  const { lifestyle, perfectCut } = answers;

  if (lifestyle === "formal") {
    if (perfectCut === "otros-notan") return "El Victor";
    if (perfectCut === "lo-siento")   return "El Código";
    return "El Turbio";
  }
  if (lifestyle === "nocturno") {
    if (perfectCut === "otros-notan") return "El Espectro";
    if (perfectCut === "lo-siento")   return "El Pesado";
    return "El Clandestino";
  }
  if (lifestyle === "outdoor") {
    if (perfectCut === "otros-notan") return "El Detonante";
    if (perfectCut === "lo-siento")   return "El Bardo";
    return "El Humo";
  }
  // minimal
  if (perfectCut === "otros-notan") return "El Satélite";
  if (perfectCut === "lo-siento")   return "El Filo";
  return "El Umbral";
}

// ————————————————————————————
// Smart cuts matrix: shape × lifestyle × morningMinutes
// Based on barbering research Apr 2026 — 51 modern cuts (2022-2025)
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
        if (high) return ["Faux Hawk", "Brush Up", "Bro Flow"];
        if (mid)  return ["Textured Fringe", "High Fade Textured Top", "Quiff"];
        return ["Crew Cut", "French Crop", "Low Taper Fade"];
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
        return ["Edgar Cut", "Ivy League", "Crew Cut"];
      }
      if (lifestyle === "nocturno") {
        if (high) return ["Mullet Moderno", "Disconnected Undercut", "Wolf Cut"];
        if (mid)  return ["Korean Two Block", "Slicked-Back Undercut", "Quiff"];
        return ["Burst Fade", "French Crop", "Crew Cut"];
      }
      if (lifestyle === "outdoor") {
        if (high) return ["Faux Hawk", "Brush Up", "Drop Cut"];
        if (mid)  return ["High Fade Textured Top", "Textured Fringe", "Quiff"];
        return ["Skin Fade", "Crew Cut", "Buzz Cut"];
      }
      // minimal
      if (high) return ["Copete Texturizado", "Soft Two Block", "Corte Coma"];
      if (mid)  return ["Textured Fringe", "Korean Two Block", "Mid Fade Textured Top"];
      return ["Blunt Crop", "Textured Crop", "Crew Cut"];

    // ——— REDONDO: necesita elongación y volumen en la cima ———
    case "redondo":
      if (lifestyle === "formal") {
        if (high) return ["Pompadour Moderno", "Quiff", "Textured Pompadour"];
        if (mid)  return ["Quiff", "Copete Texturizado", "Faux Hawk"];
        return ["French Crop", "High Fade Textured Top", "Ivy League"];
      }
      if (lifestyle === "nocturno") {
        if (high) return ["Wolf Cut", "Faux Hawk", "Mullet Moderno"];
        if (mid)  return ["Textured Fringe", "Curtain Fringe", "Quiff"];
        return ["High Fade Textured Top", "Edgar Cut", "Mid Fade Textured Top"];
      }
      if (lifestyle === "outdoor") {
        if (high) return ["Faux Hawk", "Quiff", "Drop Fade"];
        if (mid)  return ["Textured Fringe", "High Fade Textured Top", "Corte Coma"];
        return ["Burst Fade", "Crew Cut", "Mid Fade Textured Top"];
      }
      // minimal
      if (high) return ["Copete Texturizado", "Corte Coma", "Curtain Fringe"];
      if (mid)  return ["Textured Fringe", "High Fade Textured Top", "Quiff"];
      return ["Blunt Crop", "Textured Crop", "Ivy League"];

    // ——— CORAZÓN: frente ancha, mentón angosto — equilibrar ———
    case "corazon":
      if (lifestyle === "formal") {
        if (high) return ["Slick Back", "Side Part", "Comb Over Fade"];
        if (mid)  return ["Side Part", "Copete Texturizado", "Soft Two Block"];
        return ["Caesar Cut", "Modern Caesar", "Textured Crop"];
      }
      if (lifestyle === "nocturno") {
        if (high) return ["Curtain Fringe", "Wolf Cut", "Shag Cut"];
        if (mid)  return ["Korean Two Block", "Corte Coma", "Middle Part"];
        return ["Natural Texture Fade", "Textured Crop", "Low Taper Fade"];
      }
      if (lifestyle === "outdoor") {
        if (high) return ["Faux Hawk", "Bro Flow", "Textured Fringe"];
        if (mid)  return ["Textured Fringe", "Corte Coma", "Soft Two Block"];
        return ["French Crop", "Textured Crop", "Crew Cut"];
      }
      // minimal
      if (high) return ["Curtain Fringe", "Corte Coma", "Curtains 2.0"];
      if (mid)  return ["Soft Two Block", "Textured Fringe", "Side Part"];
      return ["Textured Crop", "Caesar Cut", "French Crop"];

    // ——— DIAMANTE: pómulos anchos, frente y mentón angostos ———
    case "diamante":
      if (lifestyle === "formal") {
        if (high) return ["Faux Hawk", "Copete Texturizado", "Hard Part Fade"];
        if (mid)  return ["Textured Quiff Fade", "Side Part", "Undercut Pompadour"];
        return ["Ivy League", "Line Up Fade", "Crew Cut"];
      }
      if (lifestyle === "nocturno") {
        if (high) return ["Wolf Cut", "Mullet Moderno", "Messy Shag"];
        if (mid)  return ["Curtain Fringe", "Korean Two Block", "E-boy Fringe"];
        return ["Natural Texture Fade", "Textured Crop", "Taper Fade"];
      }
      if (lifestyle === "outdoor") {
        if (high) return ["Faux Hawk", "Brush Up", "Flow Cut"];
        if (mid)  return ["High Fade Textured Top", "Textured Fringe", "Corte Coma"];
        return ["Textured Crop", "Crew Cut", "High Skin Fade"];
      }
      // minimal
      if (high) return ["Curtain Fringe", "Corte Coma", "Soft Two Block"];
      if (mid)  return ["Korean Two Block", "Textured Fringe", "Blowout"];
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
// Face shape classification from MediaPipe metrics
// ————————————————————————————
export type FaceMetrics = {
  widthHeightRatio: number;   // face_width / face_height
  jawWidthRatio: number;      // jaw_width / face_width
  foreheadChinRatio: number;  // forehead_width / chin_width
};

export function classifyFaceShape(metrics: FaceMetrics): FaceShape {
  const { widthHeightRatio: whr, jawWidthRatio: jwr, foreheadChinRatio: fcr } = metrics;

  // ——— OVAL: clearly elongated (unambiguous) ———
  if (whr < 0.80) return "oval";

  // ——— WIDE FACE (whr ≥ 0.88): jaw ratio determines square vs round ———
  if (whr >= 0.88) {
    if (jwr >= 0.86) return "cuadrado";    // strong jaw
    if (jwr <= 0.82) return "redondo";     // soft jaw
    // Ambiguous jaw band 0.82–0.86: use forehead/chin as tiebreaker
    if (fcr >= 1.08) return "corazon";     // forehead-heavy wide face
    return jwr >= 0.84 ? "cuadrado" : "redondo";
  }

  // ——— MEDIUM FACE (whr 0.80–0.88): was the dead zone → now fully classified ———

  // Heart: forehead clearly dominates over chin
  if (fcr >= 1.13) return "corazon";

  // Diamond: both forehead and chin narrow relative to cheekbones
  if (fcr <= 0.91 && jwr <= 0.80) return "diamante";

  // Approaching square: medium-wide face with strong jaw
  if (jwr >= 0.85 && whr >= 0.85) return "cuadrado";

  // Soft jaw in medium face → round-ish
  if (jwr <= 0.76) return "redondo";

  // Balanced medium proportions → oval (most common, correct safe default)
  if (fcr >= 1.06) return "corazon";   // slight forehead dominance
  return "oval";

  // Note: "alien" is intentionally unreachable via auto-detection.
  // It remains valid as a manually-assigned or DB-override value.
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
  const dominantStyle = getTitleFromAnswers(shape, answers);
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
