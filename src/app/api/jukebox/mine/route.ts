import { z } from "zod";
import { getLastProposalForDevice } from "@/lib/jukebox";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const querySchema = z.object({
  deviceKey: z.string().trim().min(8).max(256),
});

// Público: con la clave del dispositivo solo se ve el propio pedido, nunca el hash ni la IP.
export async function GET(request: Request) {
  const parsed = querySchema.safeParse({
    deviceKey: new URL(request.url).searchParams.get("deviceKey"),
  });
  if (!parsed.success) {
    return Response.json(
      { error: "Dispositivo invalido." },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const pedido = await getLastProposalForDevice(parsed.data.deviceKey);
  return Response.json({ pedido }, { headers: { "Cache-Control": "no-store" } });
}
