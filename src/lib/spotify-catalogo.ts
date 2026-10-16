// El catálogo de Spotify con la credencial de la app ("client credentials"): sirve para buscar y verificar
// temas sin cuenta de nadie. Por eso el público busca sin loguearse y la búsqueda anda aunque la cuenta del
// local esté desconectada. Lo que sí necesita la cuenta (poner en cola, saltar) está en spotify-api.ts.

export type TemaCatalogo = {
  id: string;
  uri: string;
  nombre: string;
  artistas: string;
  tapa: string | null;
  duracionSegundos: number;
};

type TrackCrudo = {
  id: string;
  uri: string;
  name: string;
  duration_ms: number;
  is_playable?: boolean;
  artists: { name: string }[];
  album: { images: { url: string; width: number | null }[] };
};

/** Más largo que esto no entra: son enganchados, sets o versiones extendidas que traban la cola. */
export const DURACION_MAXIMA_SEGUNDOS = 7 * 60;
/** Spotify no deja pedir más de 10 resultados por búsqueda desde 2026. */
const RESULTADOS = 10;

// El token de la app dura una hora; se reusa por instancia para no pedir uno por búsqueda.
let tokenApp: { valor: string; venceEn: number } | null = null;

async function tokenDeLaApp(): Promise<string> {
  if (tokenApp && tokenApp.venceEn > Date.now() + 60_000) return tokenApp.valor;

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Configuracion de Spotify incompleta.");

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error("No pude autenticar contra Spotify.");

  const data = (await res.json()) as { access_token: string; expires_in: number };
  tokenApp = { valor: data.access_token, venceEn: Date.now() + data.expires_in * 1000 };
  return data.access_token;
}

/** La tapa mediana (~300 px): la grande pesa de más para un celular y la chica se ve borrosa en el disco. */
function elegirTapa(imagenes: TrackCrudo["album"]["images"]): string | null {
  const ordenadas = [...imagenes].sort((a, b) => (a.width ?? 0) - (b.width ?? 0));
  return (ordenadas.find((i) => (i.width ?? 0) >= 250) ?? ordenadas.at(-1))?.url ?? null;
}

function aTema(t: TrackCrudo): TemaCatalogo {
  return {
    id: t.id,
    uri: t.uri,
    nombre: t.name,
    artistas: t.artists.map((a) => a.name).join(", "),
    tapa: elegirTapa(t.album.images),
    duracionSegundos: Math.round(t.duration_ms / 1000),
  };
}

function sePuedePoner(t: TrackCrudo): boolean {
  return t.is_playable !== false && t.duration_ms / 1000 <= DURACION_MAXIMA_SEGUNDOS;
}

/** Busca temas que se pueden pasar en Argentina, sin los que duran de más. */
export async function buscarEnCatalogo(q: string): Promise<TemaCatalogo[]> {
  const token = await tokenDeLaApp();
  const url = `https://api.spotify.com/v1/search?${new URLSearchParams({
    q,
    type: "track",
    market: "AR",
    limit: String(RESULTADOS),
  })}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
  if (!res.ok) throw new Error("No pude buscar en Spotify.");

  const data = (await res.json()) as { tracks?: { items?: (TrackCrudo | null)[] } };
  return (data.tracks?.items ?? []).filter((t): t is TrackCrudo => !!t && sePuedePoner(t)).map(aTema);
}

/**
 * El tema tal como lo dice Spotify. No se confía en lo que manda el celular: se vuelve a pedir acá.
 * null = no existe o no se puede pasar en Argentina. La duración la revisa quien llama (para decir por qué no).
 */
export async function temaDelCatalogo(id: string): Promise<TemaCatalogo | null> {
  const token = await tokenDeLaApp();
  const res = await fetch(`https://api.spotify.com/v1/tracks/${encodeURIComponent(id)}?market=AR`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (res.status === 404 || res.status === 400) return null;
  if (!res.ok) throw new Error("No pude verificar el tema en Spotify.");

  const t = (await res.json()) as TrackCrudo;
  return t.is_playable === false ? null : aTema(t);
}

/** Un id de Spotify: 22 caracteres base62. */
export function esIdDeSpotify(id: string): boolean {
  return /^[0-9A-Za-z]{22}$/.test(id);
}
