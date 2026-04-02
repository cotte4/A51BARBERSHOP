import { desc, gt } from "drizzle-orm";
import { db } from "@/db";
import { pantallaEvents } from "@/db/schema";

export const dynamic = "force-dynamic";
export const revalidate = false;

function badRequest(message: string) {
  return Response.json({ error: message }, { status: 400 });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const after = url.searchParams.get("after");

  let afterDate: Date | null = null;
  if (after) {
    const parsed = new Date(after);
    if (Number.isNaN(parsed.getTime())) {
      return badRequest("Parametro 'after' invalido.");
    }
    afterDate = parsed;
  }

  const [event] = await db
    .select({
      id: pantallaEvents.id,
      turnoId: pantallaEvents.turnoId,
      cancion: pantallaEvents.cancion,
      clienteNombre: pantallaEvents.clienteNombre,
      createdAt: pantallaEvents.createdAt,
    })
    .from(pantallaEvents)
    .where(afterDate ? gt(pantallaEvents.createdAt, afterDate) : undefined)
    .orderBy(desc(pantallaEvents.createdAt))
    .limit(1);

  return Response.json(
    {
      event: event
        ? {
            ...event,
            createdAt: event.createdAt.toISOString(),
          }
        : null,
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
