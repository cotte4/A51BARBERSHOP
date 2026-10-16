import { guardarVideoDeYoutube, parseIsoDuration } from "@/lib/jukebox";

// Modo de emergencia: si Spotify no anda, el celu del staff pasa los temas por YouTube. La gente sigue
// eligiendo de Spotify (la búsqueda no depende de la cuenta), y acá se busca el video de cada tema
// recién cuando le toca. Cada búsqueda gasta 100 de las 10.000 unidades diarias de YouTube: ~100 temas.

type Resultado = { id: { videoId: string } };
type Detalle = { id: string; contentDetails: { duration: string }; status?: { embeddable?: boolean } };

/**
 * ok = hay video; sin_video = se buscó y no hay uno que sirva (se puede saltar el tema); fallo = no se
 * pudo buscar (sin clave, sin cuota, sin red): el tema NO se salta, se reintenta en un rato.
 */
export type ResultadoVideo = { tipo: "ok"; id: string } | { tipo: "sin_video" } | { tipo: "fallo"; motivo: string };

/** Los que ya se buscaron sin video: no se gasta cuota buscándolos de nuevo a cada sondeo (por instancia). */
const sinVideo = new Set<string>();
/** Después de un fallo, no se vuelve a intentar con ese tema hasta este momento. */
const reintentarEn = new Map<string, number>();
const ESPERA_FALLO_MS = 30_000;

function fallo(proposalId: string, motivo: string): ResultadoVideo {
  reintentarEn.set(proposalId, Date.now() + ESPERA_FALLO_MS);
  return { tipo: "fallo", motivo };
}

/**
 * El video de YouTube de un tema. Prefiere el audio ("audio" en la búsqueda) y descarta lo que dura mucho
 * más que el tema (enganchados, en vivo de una hora) o no se puede embeber.
 */
export async function videoParaTema(tema: {
  proposalId: string;
  titulo: string;
  artistas: string;
  duracionSegundos: number | null;
}): Promise<ResultadoVideo> {
  if (sinVideo.has(tema.proposalId)) return { tipo: "sin_video" };
  if ((reintentarEn.get(tema.proposalId) ?? 0) > Date.now()) {
    return { tipo: "fallo", motivo: "YouTube no respondió. Se reintenta solo." };
  }
  const apiKey = process.env.YOUTUBE_API_KEY ?? process.env.YOUTUBE_API_KEY_BEATS;
  if (!apiKey) return fallo(tema.proposalId, "Falta la clave de YouTube en el servidor.");

  const busqueda = new URL("https://www.googleapis.com/youtube/v3/search");
  busqueda.searchParams.set("part", "id");
  busqueda.searchParams.set("q", `${tema.artistas} ${tema.titulo} audio`);
  busqueda.searchParams.set("type", "video");
  busqueda.searchParams.set("videoEmbeddable", "true");
  busqueda.searchParams.set("videoCategoryId", "10"); // música
  busqueda.searchParams.set("maxResults", "5");
  busqueda.searchParams.set("key", apiKey);

  try {
    const res = await fetch(busqueda, { cache: "no-store" });
    if (res.status === 403) return fallo(tema.proposalId, "Se terminó la cuota diaria de YouTube.");
    if (!res.ok) return fallo(tema.proposalId, "YouTube no respondió. Se reintenta solo.");
    const ids = (((await res.json()) as { items?: Resultado[] }).items ?? []).map((i) => i.id.videoId);
    if (ids.length === 0) {
      sinVideo.add(tema.proposalId);
      return { tipo: "sin_video" };
    }

    // Una consulta de detalle (1 unidad) para descartar los que no sirven por duración o por no embeberse.
    const detalle = new URL("https://www.googleapis.com/youtube/v3/videos");
    detalle.searchParams.set("part", "contentDetails,status");
    detalle.searchParams.set("id", ids.join(","));
    detalle.searchParams.set("key", apiKey);
    const resDetalle = await fetch(detalle, { cache: "no-store" });
    if (!resDetalle.ok) return fallo(tema.proposalId, "YouTube no respondió. Se reintenta solo.");
    const detalles = ((await resDetalle.json()) as { items?: Detalle[] }).items ?? [];
    const porId = new Map(detalles.map((d) => [d.id, d]));

    const tope = (tema.duracionSegundos ?? 6 * 60) + 90;
    const elegido = ids.find((id) => {
      const d = porId.get(id);
      if (!d) return false;
      const segundos = parseIsoDuration(d.contentDetails.duration);
      return d.status?.embeddable !== false && segundos !== null && segundos > 0 && segundos <= tope;
    });

    if (!elegido) {
      sinVideo.add(tema.proposalId);
      return { tipo: "sin_video" };
    }
    await guardarVideoDeYoutube(tema.proposalId, elegido);
    return { tipo: "ok", id: elegido };
  } catch {
    return fallo(tema.proposalId, "YouTube no respondió. Se reintenta solo.");
  }
}
