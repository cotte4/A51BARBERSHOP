import { z } from "zod";
import {
  canProposeAgain,
  getClientIp,
  hashDeviceKey,
  isJukeboxEnabled,
  parseIsoDuration,
} from "@/lib/jukebox";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SEARCH_RATE_LIMIT_PER_MINUTE = 10;
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX_ENTRIES = 200;
const IP_SEARCH_WINDOW_MS = 10 * 60 * 1000;
const IP_SEARCH_MAX = 120; // el Wi-Fi del local comparte una sola IP

// Cache y throttle en memoria: por instancia serverless, pero alcanza para cuidar la cuota de YouTube.
const searchCache = new Map<string, { at: number; results: unknown[] }>();
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

type YouTubeSearchItem = {
  id: { videoId: string };
  snippet: {
    title: string;
    channelTitle: string;
    thumbnails: { medium?: { url: string }; default?: { url: string } };
  };
};

type YouTubeVideosItem = {
  id: string;
  contentDetails: { duration: string };
};

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
    return Response.json({ error: "Busqueda invalida." }, { status: 400 });
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

  const apiKey = process.env.YOUTUBE_API_KEY ?? process.env.YOUTUBE_API_KEY_BEATS;

  if (!apiKey) {
    return Response.json({ error: "YouTube API no configurada." }, { status: 500 });
  }

  try {
    const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
    searchUrl.searchParams.set("part", "snippet");
    searchUrl.searchParams.set("q", q);
    searchUrl.searchParams.set("type", "video");
    searchUrl.searchParams.set("maxResults", String(SEARCH_RATE_LIMIT_PER_MINUTE));
    searchUrl.searchParams.set("key", apiKey);

    const searchRes = await fetch(searchUrl.toString(), { cache: "no-store" });

    if (!searchRes.ok) {
      return Response.json({ error: "No pude buscar en YouTube." }, { status: 502 });
    }

    const searchData = (await searchRes.json()) as { items?: YouTubeSearchItem[] };
    const items = searchData.items ?? [];

    if (items.length === 0) {
      return Response.json({ results: [] });
    }

    const videoIds = items.map((i) => i.id.videoId).join(",");
    const detailsUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
    detailsUrl.searchParams.set("part", "contentDetails");
    detailsUrl.searchParams.set("id", videoIds);
    detailsUrl.searchParams.set("key", apiKey);

    const detailsRes = await fetch(detailsUrl.toString(), { cache: "no-store" });
    const detailsData = detailsRes.ok
      ? ((await detailsRes.json()) as { items?: YouTubeVideosItem[] })
      : { items: [] };

    const durationMap = new Map<string, number | null>();
    for (const v of detailsData.items ?? []) {
      durationMap.set(v.id, parseIsoDuration(v.contentDetails.duration));
    }

    const results = items.map((item) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      thumbnailUrl:
        item.snippet.thumbnails.medium?.url ??
        item.snippet.thumbnails.default?.url ??
        "",
      durationSeconds: durationMap.get(item.id.videoId) ?? null,
    }));

    if (searchCache.size >= CACHE_MAX_ENTRIES) searchCache.clear();
    searchCache.set(cacheKey, { at: Date.now(), results });

    return Response.json({ results }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "No pude buscar en YouTube." }, { status: 500 });
  }
}
