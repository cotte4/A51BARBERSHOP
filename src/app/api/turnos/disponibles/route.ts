import { isPortalClienteAbierto } from "@/lib/launch-mode";
import { z } from "zod";
import { canAccessPublicReserva } from "@/lib/public-reserva-access";
import {
  canReserveOnPublicFecha,
  getFechaMananaArgentina,
  getProximoDiaConLugar,
  getTurnosDisponibles,
  resolvePublicBarberoBySlug,
} from "@/lib/turnos";

const querySchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slug: z.string().min(1),
  duracion: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .refine((value) => [30, 45, 60].includes(value))
    .optional(),
});

export async function GET(request: Request) {
  if (!isPortalClienteAbierto()) return new Response("Not found", { status: 404 });

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    fecha: url.searchParams.get("fecha"),
    slug: url.searchParams.get("slug"),
    duracion: url.searchParams.get("duracion") ?? undefined,
  });

  if (!parsed.success) {
    return Response.json({ error: "Parametros inválidos." }, { status: 400 });
  }

  if (!canReserveOnPublicFecha(parsed.data.fecha)) {
    return Response.json(
      {
        error: `Los turnos se reservan desde el ${getFechaMananaArgentina()} y hasta 30 días adelante. Elegí otra fecha.`,
      },
      { status: 400 }
    );
  }

  const barbero = await resolvePublicBarberoBySlug(parsed.data.slug);
  if (!barbero) {
    return Response.json({ error: "Slug inválido." }, { status: 404 });
  }

  if (!(await canAccessPublicReserva(barbero))) {
    return Response.json(
      { error: "Primero ingresá la clave de reserva de este barbero o entrá con tu cuenta." },
      { status: 401 }
    );
  }

  const slots = await getTurnosDisponibles(
    barbero.id,
    parsed.data.fecha,
    parsed.data.duracion
  );
  // Día sin lugar: decir cuál es el próximo con turnos, para no dejar al cliente probando de a uno.
  const proximoDia =
    slots.length === 0
      ? await getProximoDiaConLugar(barbero.id, parsed.data.fecha, parsed.data.duracion ?? 30)
      : null;
  return Response.json({ slots, proximoDia });
}
