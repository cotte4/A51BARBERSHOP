import { z } from "zod";
import { canAccessPublicReserva } from "@/lib/public-reserva-access";
import {
  canReserveOnPublicFecha,
  getFechaMananaArgentina,
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
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    fecha: url.searchParams.get("fecha"),
    slug: url.searchParams.get("slug"),
    duracion: url.searchParams.get("duracion") ?? undefined,
  });

  if (!parsed.success) {
    return Response.json({ error: "Parametros invalidos." }, { status: 400 });
  }

  if (!canReserveOnPublicFecha(parsed.data.fecha)) {
    return Response.json(
      {
        error: `La reserva publica arranca desde ${getFechaMananaArgentina()}. Elegi una fecha posterior.`,
      },
      { status: 400 }
    );
  }

  const barbero = await resolvePublicBarberoBySlug(parsed.data.slug);
  if (!barbero) {
    return Response.json({ error: "Slug invalido." }, { status: 404 });
  }

  if (!(await canAccessPublicReserva(barbero))) {
    return Response.json(
      { error: "Primero ingresa la clave de reserva de este barbero o entra con tu cuenta." },
      { status: 401 }
    );
  }

  const slots = await getTurnosDisponibles(
    barbero.id,
    parsed.data.fecha,
    parsed.data.duracion
  );
  return Response.json({ slots });
}
