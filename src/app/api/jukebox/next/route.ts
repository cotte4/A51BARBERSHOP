import { auth } from "@/lib/auth";
import { getNowPlaying, markPlayed } from "@/lib/jukebox";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    return Response.json({ error: "No autenticado." }, { status: 401 });
  }

  const current = await getNowPlaying();
  if (!current) {
    return Response.json({ ok: true, skipped: false });
  }

  await markPlayed(current.id);
  return Response.json({ ok: true, skipped: false });
}
