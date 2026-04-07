import { z } from "zod";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const querySchema = z.object({
  q: z.string().trim().min(2).max(120),
});

export async function GET(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });
  if (!session?.user?.id) {
    return Response.json({ error: "No autenticado." }, { status: 401 });
  }

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    q: url.searchParams.get("q"),
  });

  if (!parsed.success) {
    return Response.json({ error: "Busqueda invalida." }, { status: 400 });
  }

  const apiKey =
    process.env.YOUTUBE_API_KEY ??
    process.env.YOUTUBE_API_KEY_BEATS ??
    process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
  if (!apiKey) {
    console.error("YouTube beat search misconfigured: missing YOUTUBE_API_KEY env var.");
    return Response.json({ error: "YouTube API no configurada." }, { status: 500 });
  }

  try {
    const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
    searchUrl.searchParams.set("part", "snippet");
    searchUrl.searchParams.set("q", `${parsed.data.q} beat instrumental`);
    searchUrl.searchParams.set("type", "video");
    searchUrl.searchParams.set("videoCategoryId", "10");
    searchUrl.searchParams.set("maxResults", "50");
    searchUrl.searchParams.set("key", apiKey);

    const res = await fetch(searchUrl.toString(), { cache: "no-store" });

    if (!res.ok) {
      return Response.json({ error: "No pude buscar beats en YouTube." }, { status: 502 });
    }

    const data = (await res.json()) as {
      items?: Array<{
        id: { videoId: string };
        snippet: {
          title: string;
          channelTitle: string;
          thumbnails: { medium?: { url: string }; default?: { url: string } };
        };
      }>;
    };

    return Response.json(
      {
        beats: (data.items ?? []).map((item) => ({
          videoId: item.id.videoId,
          title: item.snippet.title,
          channelTitle: item.snippet.channelTitle,
          thumbnailUrl:
            item.snippet.thumbnails.medium?.url ?? item.snippet.thumbnails.default?.url ?? "",
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("YouTube beat search error:", error);
    return Response.json({ error: "No pude buscar beats." }, { status: 500 });
  }
}
