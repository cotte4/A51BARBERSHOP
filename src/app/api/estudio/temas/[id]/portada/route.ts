export const runtime = "nodejs";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { estudioTemas } from "@/db/schema";
import { getEstudioActor, linkFirmado } from "@/lib/estudio";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getEstudioActor())) {
    return new Response(null, { status: 401 });
  }

  const { id } = await params;
  const [tema] = await db
    .select({ portadaPathname: estudioTemas.portadaPathname })
    .from(estudioTemas)
    .where(eq(estudioTemas.id, id))
    .limit(1)
    .catch(() => []);

  if (!tema?.portadaPathname) return new Response(null, { status: 404 });

  return new Response(null, {
    status: 302,
    headers: { Location: await linkFirmado(tema.portadaPathname), "Cache-Control": "private, max-age=600" },
  });
}
