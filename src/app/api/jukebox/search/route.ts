import { z } from "zod";
import { hashDeviceKey, canProposeAgain } from "@/lib/jukebox";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SEARCH_RATE_LIMIT_PER_MINUTE = 10;

const querySchema = z.object({
  q: z.string().trim().min(2).max(120),
  deviceKey: z.string().trim().min(8).max(256).optional(),
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

function parseIsoDuration(iso: string): number | null {
  const match = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso);
  if (!match) return null;
  const h = parseInt(match[1] ?? "0");
  const m = parseInt(match[2] ?? "0");
  const s = parseInt(match[3] ?? "0");
  return h * 3600 + m * 60 + s;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    q: url.searchParams.get("q"),
    deviceKey: url.searchParams.get("deviceKey") ?? undefined,
  });

  if (!parsed.success) {
    return Response.json({ error: "Busqueda invalida." }, { status: 400 });
  }

  const { q, deviceKey } = parsed.data;

  if (deviceKey) {
    const hash = hashDeviceKey(deviceKey);
    const allowed = await canProposeAgain(hash);
    if (!allowed) {
      return Response.json(
        { error: "Esperá unos minutos antes de proponer otro tema." },
        { status: 429 }
      );
    }
  }

  const apiKey =
    process.env.YOUTUBE_API_KEY ??
    process.env.YOUTUBE_API_KEY_BEATS ??
    process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;

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

    return Response.json(
      {
        results: items.map((item) => ({
          videoId: item.id.videoId,
          title: item.snippet.title,
          channelTitle: item.snippet.channelTitle,
          thumbnailUrl:
            item.snippet.thumbnails.medium?.url ??
            item.snippet.thumbnails.default?.url ??
            "",
          durationSeconds: durationMap.get(item.id.videoId) ?? null,
        })),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return Response.json({ error: "No pude buscar en YouTube." }, { status: 500 });
  }
}
