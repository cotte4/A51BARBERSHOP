// Escudos de los equipos del torneo: del nombre que carga Pinky al PNG de public/equipos.
// Puro (sin DB ni servidor): lo usan la tele, el demo y el cuadro público.

/** Slugs con archivo en public/equipos/<slug>.png (todos normalizados a 512x512). */
const CON_ESCUDO = new Set([
  "real-madrid",
  "barcelona",
  "atletico-de-madrid",
  "manchester-city",
  "liverpool",
  "arsenal",
  "chelsea",
  "manchester-united",
  "tottenham",
  "aston-villa",
  "bayern-munich",
  "borussia-dortmund",
  "inter",
  "inter-miami",
  "roma",
  "psg",
]);

// La lista de equipos se edita a mano: estas son las formas razonables de escribir el mismo club.
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
