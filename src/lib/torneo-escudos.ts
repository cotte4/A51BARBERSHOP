// Catálogo de clubes del torneo y sus escudos: del nombre guardado al PNG de public/equipos.
// Puro (sin DB ni servidor): lo usan la tele, el demo, el cuadro público y el panel de Pinky.

export type Liga = "Premier League" | "LaLiga" | "Bundesliga" | "Serie A" | "Ligue 1" | "MLS y otras";

/** Orden en que se muestran las ligas en el panel. */
export const LIGAS: readonly Liga[] = ["Premier League", "LaLiga", "Bundesliga", "Serie A", "Ligue 1", "MLS y otras"];

export type ClubCatalogo = {
  /** Archivo public/equipos/<slug>.png (512x512, ver LEEME.md). */
  slug: string;
  /** Nombre canónico: es el que se guarda en torneo_equipos y se ve en la tele. */
  nombre: string;
  liga: Liga;
};

/** Los 24 clubes que se pueden elegir para el sorteo, todos con escudo. */
export const CATALOGO_CLUBES: readonly ClubCatalogo[] = [
  { slug: "manchester-city", nombre: "Manchester City", liga: "Premier League" },
  { slug: "liverpool", nombre: "Liverpool", liga: "Premier League" },
  { slug: "arsenal", nombre: "Arsenal", liga: "Premier League" },
  { slug: "chelsea", nombre: "Chelsea", liga: "Premier League" },
  { slug: "manchester-united", nombre: "Manchester United", liga: "Premier League" },
  { slug: "tottenham", nombre: "Tottenham", liga: "Premier League" },
  { slug: "aston-villa", nombre: "Aston Villa", liga: "Premier League" },
  { slug: "newcastle", nombre: "Newcastle", liga: "Premier League" },
  { slug: "real-madrid", nombre: "Real Madrid", liga: "LaLiga" },
  { slug: "barcelona", nombre: "Barcelona", liga: "LaLiga" },
  { slug: "atletico-de-madrid", nombre: "Atlético de Madrid", liga: "LaLiga" },
  { slug: "bayern-munich", nombre: "Bayern Múnich", liga: "Bundesliga" },
  { slug: "borussia-dortmund", nombre: "Borussia Dortmund", liga: "Bundesliga" },
  { slug: "bayer-leverkusen", nombre: "Bayer Leverkusen", liga: "Bundesliga" },
  { slug: "inter", nombre: "Inter", liga: "Serie A" },
  { slug: "milan", nombre: "Milan", liga: "Serie A" },
  { slug: "juventus", nombre: "Juventus", liga: "Serie A" },
  { slug: "napoli", nombre: "Napoli", liga: "Serie A" },
  { slug: "roma", nombre: "Roma", liga: "Serie A" },
  { slug: "psg", nombre: "PSG", liga: "Ligue 1" },
  { slug: "inter-miami", nombre: "Inter Miami", liga: "MLS y otras" },
  { slug: "benfica", nombre: "Benfica", liga: "MLS y otras" },
  { slug: "porto", nombre: "Porto", liga: "MLS y otras" },
  { slug: "ajax", nombre: "Ajax", liga: "MLS y otras" },
];

/** Slugs con archivo en public/equipos/<slug>.png. */
const CON_ESCUDO = new Set(CATALOGO_CLUBES.map((c) => c.slug));

// Torneos viejos (o cargados a mano) pueden tener otra forma de escribir el mismo club.
const ALIAS: Record<string, string> = {
  "real-madrid-cf": "real-madrid",
  "fc-barcelona": "barcelona",
  "barca": "barcelona",
  "atletico-madrid": "atletico-de-madrid",
  "atletico": "atletico-de-madrid",
  "atleti": "atletico-de-madrid",
  "man-city": "manchester-city",
  "liverpool-fc": "liverpool",
  "arsenal-fc": "arsenal",
  "chelsea-fc": "chelsea",
  "man-united": "manchester-united",
  "man-utd": "manchester-united",
  "manchester-utd": "manchester-united",
  "tottenham-hotspur": "tottenham",
  "spurs": "tottenham",
  "aston-villa-fc": "aston-villa",
  "bayern-munchen": "bayern-munich",
  "bayern": "bayern-munich",
  "fc-bayern": "bayern-munich",
  "dortmund": "borussia-dortmund",
  "bvb": "borussia-dortmund",
  "inter-de-milan": "inter",
  "inter-milan": "inter",
  "internazionale": "inter",
  "inter-miami-cf": "inter-miami",
  "as-roma": "roma",
  "paris-saint-germain": "psg",
  "paris-saint-germain-fc": "psg",
  "paris-sg": "psg",
  "newcastle-united": "newcastle",
  "newcastle-united-fc": "newcastle",
  "leverkusen": "bayer-leverkusen",
  "bayer-04-leverkusen": "bayer-leverkusen",
  "ac-milan": "milan",
  "milan-ac": "milan",
  "juve": "juventus",
  "juventus-fc": "juventus",
  "ssc-napoli": "napoli",
  "napoles": "napoli",
  "sl-benfica": "benfica",
  "fc-porto": "porto",
  "ajax-amsterdam": "ajax",
  "afc-ajax": "ajax",
};

/** "Bayern Múnich" → "bayern-munich": sin acentos, minúsculas, guiones en lugar de espacios. */
export function slugEquipo(nombre: string): string {
  const base = nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return ALIAS[base] ?? base;
}

/** Ruta pública del escudo, o null si ese equipo no tiene archivo (se muestra el genérico). */
export function escudoDeEquipo(nombre: string): string | null {
  const slug = slugEquipo(nombre);
  return CON_ESCUDO.has(slug) ? `/equipos/${slug}.png` : null;
}

/** El club del catálogo con ese nombre (o una forma razonable de escribirlo); undefined si no está. */
export function clubDelCatalogo(nombre: string): ClubCatalogo | undefined {
  const slug = slugEquipo(nombre);
  return CATALOGO_CLUBES.find((c) => c.slug === slug);
}

/**
 * Lo que manda el panel (slugs o nombres) pasado a nombres canónicos del catálogo, sin repetidos y en
 * el orden del catálogo. Lo que no está en el catálogo se descarta.
 */
export function nombresDelCatalogo(entradas: readonly string[]): string[] {
  const elegidos = new Set(entradas.map((e) => clubDelCatalogo(e)?.slug).filter(Boolean));
  return CATALOGO_CLUBES.filter((c) => elegidos.has(c.slug)).map((c) => c.nombre);
}

/** Hasta 3 letras para el escudo genérico: "Boca Juniors" → "BJ", "Napoli" → "NAP". */
export function inicialesEquipo(nombre: string): string {
  const palabras = nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .split(/[^A-Za-z0-9]+/)
    .filter((p) => p.length > 0 && !/^(de|del|la|el|fc|cf|ac|sc)$/i.test(p));
  if (palabras.length === 0) return "?";
  if (palabras.length === 1) return palabras[0].slice(0, 3).toUpperCase();
  return palabras
    .slice(0, 3)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}
