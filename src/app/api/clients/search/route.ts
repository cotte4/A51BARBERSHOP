import { getClientActorContext } from "@/lib/client-access";
import { searchVisibleClients } from "@/lib/client-queries";

export async function GET(request: Request) {
  const actor = await getClientActorContext();
  if (!actor) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";
  const clients = await searchVisibleClients(actor, q);

  return Response.json({ clients });
}
