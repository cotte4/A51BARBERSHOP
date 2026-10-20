import { z } from "zod";
import { canProposeAgain, getClientIp, hashDeviceKey, isJukeboxEnabled } from "@/lib/jukebox";
import { buscarEnCatalogo } from "@/lib/spotify-catalogo";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX_ENTRIES = 200;
const IP_SEARCH_WINDOW_MS = 10 * 60 * 1000;
const IP_SEARCH_MAX = 120; // el Wi-Fi del local comparte una sola IP

export type ResultadoBusqueda = {
  trackId: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  durationSeconds: number;
};

// Cache y throttle en memoria: por instancia serverless, pero alcanza para no pasarse del límite de Spotify.
const searchCache = new Map<string, { at: number; results: ResultadoBusqueda[] }>();
const ipSearches = new Map<string, number[]>();

function ipSearchAllowed(ip: string): boolean {
  const now = Date.now();
  const recent = (ipSearches.get(ip) ?? []).filter((t) => now - t < IP_SEARCH_WINDOW_MS);
  if (recent.length >= IP_SEARCH_MAX) {
    ipSearches.set(ip, recent);
    return false;
  }
  recent.push(now);
  ipSearches.set(ip, recent);
  if (ipSearches.size > 1000) ipSearches.clear();
  return true;
}

const querySchema = z.object({
  q: z.string().trim().min(2).max(120),
  deviceKey: z.string().trim().min(8).max(256),
});

// Se busca en Spotify con la credencial de la app: el público no necesita cuenta, y anda igual aunque el
// local esté en modo YouTube (ahí el video de cada tema se busca recién cuando le toca sonar).
export async function GET(request: Request) {
  if (!(await isJukeboxEnabled())) {
    return Response.json({ error: "El jukebox está desactivado." }, { status: 403 });
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    q: url.searchParams.get("q"),
    deviceKey: url.searchParams.get("deviceKey"),
  });

  if (!parsed.success) {
    return Response.json({ error: "Búsqueda inválida." }, { status: 400 });
  }

  const { q, deviceKey } = parsed.data;

  const allowed = await canProposeAgain(hashDeviceKey(deviceKey));
  if (!allowed) {
    return Response.json(
      { error: "Esperá unos minutos antes de proponer otro tema." },
      { status: 429 }
    );
  }

  const cacheKey = q.toLowerCase();
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return Response.json({ results: cached.results }, { headers: { "Cache-Control": "no-store" } });
  }

  if (!ipSearchAllowed(getClientIp(request))) {
    return Response.json({ error: "Demasiadas búsquedas. Probá en unos minutos." }, { status: 429 });
  }

  try {
    const results: ResultadoBusqueda[] = (await buscarEnCatalogo(q)).map((t) => ({
      trackId: t.id,
      title: t.nombre,
      channelTitle: t.artistas,
      thumbnailUrl: t.tapa ?? "",
      durationSeconds: t.duracionSegundos,
    }));

    if (searchCache.size >= CACHE_MAX_ENTRIES) searchCache.clear();
    searchCache.set(cacheKey, { at: Date.now(), results });

    return Response.json({ results }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "No pude buscar temas. Probá de nuevo." }, { status: 502 });
  }
}
