import { z } from "zod";
import { getTurnosDisponibles, resolvePublicBarberoBySlug } from "@/lib/turnos";

const querySchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slug: z.string().min(1),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    fecha: url.searchParams.get("fecha"),
    slug: url.searchParams.get("slug"),
  });

  if (!parsed.success) {
    return Response.json({ error: "Parametros invÃ¡lidos." }, { status: 400 });
  }

  const barbero = await resolvePublicBarberoBySlug(parsed.data.slug);
  if (!barbero) {
    return Response.json({ error: "Slug invÃ¡lido." }, { status: 404 });
  }

  const slots = await getTurnosDisponibles(barbero.id, parsed.data.fecha);
  return Response.json({ slots });
}
