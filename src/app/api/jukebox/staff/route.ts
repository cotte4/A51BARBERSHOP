import { getTurnosActorContext } from "@/lib/turnos-access";
import { getJukeboxStaffState } from "@/lib/jukebox";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Estado vivo del jukebox para el staff. La pantalla /musica/jukebox lo sondea cada 3 s:
// así no depende del payload RSC que el navegador reusa al volver atrás.
export async function GET() {
  const actor = await getTurnosActorContext();
  if (!actor) {
    return Response.json({ error: "No autenticado." }, { status: 401 });
  }
  if (!actor.isAdmin && !actor.barberoId) {
    return Response.json({ error: "Solo el staff puede ver la cola." }, { status: 403 });
  }

  const state = await getJukeboxStaffState();
  return Response.json(state, { headers: { "Cache-Control": "no-store" } });
}
