import { getNowPlaying, listQueue } from "@/lib/jukebox";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const [nowPlaying, queue] = await Promise.all([getNowPlaying(), listQueue()]);
  const upcoming = queue.filter((i) => i.state === "queued").slice(0, 3);

  return Response.json(
    { nowPlaying, upcoming },
    { headers: { "Cache-Control": "no-store" } }
  );
}
