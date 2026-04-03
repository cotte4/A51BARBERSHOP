import { z } from "zod";
import { countPantallaVotes, getPantallaEventById } from "@/lib/pantalla-votos";

export const dynamic = "force-dynamic";
export const revalidate = false;

const eventIdSchema = z.string().uuid();

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const parsed = eventIdSchema.safeParse(eventId);

  if (!parsed.success) {
    return Response.json({ error: "eventId invalido." }, { status: 400 });
  }

  const event = await getPantallaEventById(parsed.data);
  if (!event) {
    return Response.json({ error: "Evento no encontrado." }, { status: 404 });
  }

  const voteCount = await countPantallaVotes(parsed.data);

  return Response.json(
    {
      eventId: parsed.data,
      count: voteCount,
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
