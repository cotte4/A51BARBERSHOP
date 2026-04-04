import { auth } from "@/lib/auth";
import { getMusicDashboardState, syncMusicEngine } from "@/lib/music-engine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });
  if (!session?.user?.id) {
    return Response.json({ error: "No autenticado." }, { status: 401 });
  }

  const url = new URL(request.url);
  const shouldSync = url.searchParams.get("sync") === "1";

  try {
    const state = await getMusicDashboardState({ sync: shouldSync });
    return Response.json(state, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "No pude leer el estado musical.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });
  if (!session?.user?.id) {
    return Response.json({ error: "No autenticado." }, { status: 401 });
  }

  try {
    const runtimeState = await syncMusicEngine();
    const state = await getMusicDashboardState();
    return Response.json({
      ok: true,
      runtimeState,
      state,
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "No pude sincronizar musica.",
      },
      { status: 500 },
    );
  }
}
