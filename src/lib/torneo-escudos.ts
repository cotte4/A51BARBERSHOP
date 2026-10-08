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
  /** [primario, secundario] del club, en hex: los usa el reveal de la tele (fondos, destellos, nombre). */
  colores: readonly [string, string];
};

/** Los 24 clubes que se pueden elegir para el sorteo, todos con escudo. */
export const CATALOGO_CLUBES: readonly ClubCatalogo[] = [
  { slug: "manchester-city", nombre: "Manchester City", liga: "Premier League", colores: ["#6CABDD", "#1C2C5B"] },
  { slug: "liverpool", nombre: "Liverpool", liga: "Premier League", colores: ["#C8102E", "#F6EB61"] },
  { slug: "arsenal", nombre: "Arsenal", liga: "Premier League", colores: ["#EF0107", "#FFFFFF"] },
  { slug: "chelsea", nombre: "Chelsea", liga: "Premier League", colores: ["#034694", "#DBA111"] },
  { slug: "manchester-united", nombre: "Manchester United", liga: "Premier League", colores: ["#DA291C", "#FBE122"] },
  { slug: "tottenham", nombre: "Tottenham", liga: "Premier League", colores: ["#132257", "#FFFFFF"] },
  { slug: "aston-villa", nombre: "Aston Villa", liga: "Premier League", colores: ["#670E36", "#95BFE5"] },
  { slug: "newcastle", nombre: "Newcastle", liga: "Premier League", colores: ["#241F20", "#FFFFFF"] },
  { slug: "real-madrid", nombre: "Real Madrid", liga: "LaLiga", colores: ["#FFFFFF", "#FEBE10"] },
  { slug: "barcelona", nombre: "Barcelona", liga: "LaLiga", colores: ["#A50044", "#004D98"] },
  { slug: "atletico-de-madrid", nombre: "Atlético de Madrid", liga: "LaLiga", colores: ["#CB3524", "#272E61"] },
  { slug: "bayern-munich", nombre: "Bayern Múnich", liga: "Bundesliga", colores: ["#DC052D", "#0066B2"] },
  { slug: "borussia-dortmund", nombre: "Borussia Dortmund", liga: "Bundesliga", colores: ["#FDE100", "#000000"] },
  { slug: "bayer-leverkusen", nombre: "Bayer Leverkusen", liga: "Bundesliga", colores: ["#E32221", "#000000"] },
  { slug: "inter", nombre: "Inter", liga: "Serie A", colores: ["#0068A8", "#000000"] },
  { slug: "milan", nombre: "Milan", liga: "Serie A", colores: ["#FB090B", "#000000"] },
  { slug: "juventus", nombre: "Juventus", liga: "Serie A", colores: ["#FFFFFF", "#000000"] },
  { slug: "napoli", nombre: "Napoli", liga: "Serie A", colores: ["#12A0D7", "#003C82"] },
  { slug: "roma", nombre: "Roma", liga: "Serie A", colores: ["#8E1F2F", "#F0BC42"] },
  { slug: "psg", nombre: "PSG", liga: "Ligue 1", colores: ["#004170", "#DA291C"] },
  { slug: "inter-miami", nombre: "Inter Miami", liga: "MLS y otras", colores: ["#F7B5CD", "#231F20"] },
  { slug: "benfica", nombre: "Benfica", liga: "MLS y otras", colores: ["#E20E0E", "#FFFFFF"] },
  { slug: "porto", nombre: "Porto", liga: "MLS y otras", colores: ["#00428C", "#FFFFFF"] },
  { slug: "ajax", nombre: "Ajax", liga: "MLS y otras", colores: ["#D2122E", "#FFFFFF"] },
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

export type ColoresEquipo = {
  primario: string;
  secundario: string;
  /** El más luminoso de los dos: el que se lee (y brilla) sobre el fondo negro de la tele. */
  vivo: string;
};

/** Verde de la marca: los equipos fuera del catálogo (torneos viejos, el ensayo) se ven con él. */
const COLORES_GENERICOS: readonly [string, string] = ["#8cff59", "#1f5c12"];

/** Luminancia relativa (0 negro, 1 blanco) de un "#rrggbb". */
export function luminancia(hex: string): number {
  const canal = (i: number) => {
    const c = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(0) + 0.7152 * canal(1) + 0.0722 * canal(2);
}

/** Mezcla un "#rrggbb" con blanco (t de 0 a 1). */
function aclarar(hex: string, t: number): string {
  const n = parseInt(hex.slice(1), 16);
  const canal = (c: number) => Math.round(c + (255 - c) * t);
  const r = canal((n >> 16) & 255);
  const g = canal((n >> 8) & 255);
  const b = canal(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0").toUpperCase()}`;
}

/** Luminancia mínima del color vivo: debajo de esto, sobre el negro de la tele no se lee. */
export const LUMINANCIA_VIVO = 0.12;

/** Colores del club para la tele; los de fuera del catálogo caen al verde de la marca. */
export function coloresDeEquipo(nombre: string | null): ColoresEquipo {
  const [primario, secundario] = (nombre ? clubDelCatalogo(nombre)?.colores : undefined) ?? COLORES_GENERICOS;
  // Un escudo azul marino sobre negro no se ve: si el primario es muy oscuro, brilla el secundario...
  let vivo = luminancia(primario) >= 0.06 || luminancia(secundario) < luminancia(primario) ? primario : secundario;
  // ...y si igual queda oscuro (Inter, Barcelona), se aclara de a poco hasta que se lea.
  for (let t = 0.15; luminancia(vivo) < LUMINANCIA_VIVO && t <= 0.9; t += 0.15) vivo = aclarar(vivo, t);
  return { primario, secundario, vivo };
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
