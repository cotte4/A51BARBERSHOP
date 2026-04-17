import type { FaceShape } from "@/lib/types";

export type MarcianoColor = {
  slug: string;
  nombre: string;
  hex: string;
};

export const MARCIANO_COLORS: readonly MarcianoColor[] = [
  { slug: "verde-neon",      nombre: "verde neón",      hex: "#39ff14" },
  { slug: "rojo-fuego",      nombre: "rojo fuego",      hex: "#ff2d2d" },
  { slug: "azul-electrico",  nombre: "azul eléctrico",  hex: "#0080ff" },
  { slug: "violeta",         nombre: "violeta",         hex: "#9b30ff" },
  { slug: "dorado",          nombre: "dorado",          hex: "#ffd700" },
  { slug: "naranja",         nombre: "naranja",         hex: "#ff6600" },
  { slug: "cyan",            nombre: "cyan",            hex: "#00e5ff" },
  { slug: "blanco-hueso",    nombre: "blanco hueso",    hex: "#f0f0e8" },
  { slug: "rosa-neon",       nombre: "rosa neón",       hex: "#ff2d9b" },
  { slug: "verde-esmeralda", nombre: "verde esmeralda", hex: "#00c853" },
  { slug: "turquesa",        nombre: "turquesa",        hex: "#00bcd4" },
  { slug: "gris-plata",      nombre: "gris plata",      hex: "#b0bec5" },
  { slug: "magenta",         nombre: "magenta",         hex: "#e040fb" },
  { slug: "rojo-carmesi",    nombre: "rojo carmesí",    hex: "#d50000" },
  { slug: "azul-marino",     nombre: "azul marino",     hex: "#1565c0" },
  { slug: "verde-oliva",     nombre: "verde oliva",     hex: "#827717" },
] as const;

export function findColorBySlug(slug: string): MarcianoColor | null {
  return MARCIANO_COLORS.find((c) => c.slug === slug) ?? null;
}

export const FACE_SHAPE_DESCRIPTIONS: Record<FaceShape, string> = {
  oval:     "oval face",
  cuadrado: "square jaw",
  redondo:  "round face",
  corazon:  "heart-shaped face",
  diamante: "diamond-shaped face",
  alien:    "elongated alien face",
};
