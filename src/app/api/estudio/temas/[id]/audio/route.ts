export const runtime = "nodejs";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { estudioTemas } from "@/db/schema";
import { getEstudioActor, linkFirmado } from "@/lib/estudio";

// Manda al link firmado del CDN: el <audio> le pide los Range directo al Blob,
// así adelantar es instantáneo y los MB no pasan por la función.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getEstudioActor())) {
    return new Response(null, { status: 401 });
  }

  const { id } = await params;
  const [tema] = await db
    .select({ audioPathname: estudioTemas.audioPathname })
    .from(estudioTemas)
    .where(eq(estudioTemas.id, id))
    .limit(1)
    .catch(() => []);

  if (!tema) return new Response(null, { status: 404 });

  return new Response(null, {
    status: 302,
    headers: { Location: await linkFirmado(tema.audioPathname), "Cache-Control": "private, no-store" },
  });
}
