import { z } from "zod";
import {
  grantPublicReservaAccess,
  hasAuthenticatedReservaAccess,
  verifyPublicReservaPassword,
} from "@/lib/public-reserva-access";
import { resolvePublicBarberoBySlug } from "@/lib/turnos";

const accessSchema = z.object({
  slug: z.string().trim().min(1),
  password: z.string().trim().min(1),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = accessSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Datos invalidos." }, { status: 400 });
  }

  const barbero = await resolvePublicBarberoBySlug(parsed.data.slug);
  if (!barbero) {
    return Response.json({ error: "No encontramos ese link de reserva." }, { status: 404 });
  }

  if (!barbero.publicReservaPasswordHash) {
    return Response.json({ ok: true });
  }

  if (await hasAuthenticatedReservaAccess()) {
    return Response.json({ ok: true });
  }

  if (!verifyPublicReservaPassword(parsed.data.password, barbero.publicReservaPasswordHash)) {
    return Response.json({ error: "La clave no coincide." }, { status: 401 });
  }

  await grantPublicReservaAccess(barbero.publicSlug ?? parsed.data.slug, barbero.publicReservaPasswordHash);

  return Response.json({ ok: true });
}
