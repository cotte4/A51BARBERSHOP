// Reglas del Estudio compartidas entre servidor y navegador (sin secretos).

export const META_TEMAS = 51;

export const AUDIO_TIPOS = ["audio/mpeg"] as const;
export const PORTADA_TIPOS = ["image/jpeg", "image/png", "image/webp"] as const;

export const AUDIO_MAX_BYTES = 30 * 1024 * 1024;
export const PORTADA_MAX_BYTES = 5 * 1024 * 1024;

export const TITULO_MAX = 80;
export const GENERO_MAX = 30;

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
// El navegador arma el pathname; el servidor solo acepta estas formas.
export const AUDIO_PATHNAME = new RegExp(`^estudio/audio/${UUID}\\.mp3$`);
export const PORTADA_PATHNAME = new RegExp(`^estudio/portadas/${UUID}\\.(jpg|png|webp)$`);

const EXTENSION_PORTADA: Record<(typeof PORTADA_TIPOS)[number], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function pathnameAudio(id: string): string {
  return `estudio/audio/${id}.mp3`;
}

export function pathnamePortada(id: string, tipo: (typeof PORTADA_TIPOS)[number]): string {
  return `estudio/portadas/${id}.${EXTENSION_PORTADA[tipo]}`;
}

export function esTipoPortada(tipo: string): tipo is (typeof PORTADA_TIPOS)[number] {
  return (PORTADA_TIPOS as readonly string[]).includes(tipo);
}

/** "BLINGDADO.mp3" → "BLINGDADO"; "mi_tema-final.mp3" → "mi tema final". */
export function tituloDesdeArchivo(nombre: string): string {
  return nombre
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, TITULO_MAX);
}

export function formatDuracion(segundos: number | null): string {
  if (segundos === null || !Number.isFinite(segundos)) return "";
  const total = Math.max(0, Math.round(segundos));
  const min = Math.floor(total / 60);
  const seg = total % 60;
  return `${min}:${seg.toString().padStart(2, "0")}`;
}
