import { getTurnosActorContext } from "@/lib/turnos-access";
import { getNowPlaying, markPlayed } from "@/lib/jukebox";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const actor = await getTurnosActorContext();
  if (!actor) {
    return Response.json({ error: "No autenticado." }, { status: 401 });
  }
  if (!actor.isAdmin && !actor.barberoId) {
    return Response.json({ error: "Solo el staff puede avanzar la cola." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { queueItemId?: unknown } | null;
  const expectedId = typeof body?.queueItemId === "string" ? body.queueItemId : null;

  const current = await getNowPlaying();
  if (!current || (expectedId && expectedId !== current.id)) {
    return Response.json({ ok: true, skipped: false });
  }

  await markPlayed(current.id);
  return Response.json({ ok: true, skipped: false });
}
