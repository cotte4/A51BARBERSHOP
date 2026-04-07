import { z } from "zod";
import { canAccessPublicReserva } from "@/lib/public-reserva-access";
import { createTurnoReserva } from "@/lib/turnos-reserva";
import {
  enforcePublicReservaRateLimit,
  findClientByPhone,
  resolvePublicBarberoBySlug,
} from "@/lib/turnos";

const extraSchema = z.object({
  productoId: z.string().uuid(),
  cantidad: z.number().int().positive(),
});

const reservaSchema = z.object({
  slug: z.string().min(1),
  slotId: z.string().uuid(),
  serviceId: z.string().uuid(),
  clienteNombre: z.string().trim().min(2),
  clienteTelefonoRaw: z.string().trim().optional().or(z.literal("")),
  notaCliente: z.string().trim().optional().or(z.literal("")),
  sugerenciaCancion: z.string().trim().optional().or(z.literal("")),
  spotifyTrackUri: z
    .string()
    .trim()
    .regex(/^spotify:track:[A-Za-z0-9]+$/)
    .optional()
    .or(z.literal("")),
  extras: z.array(extraSchema).default([]),
});

function getRequestIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (!forwarded) {
    return null;
  }
  return forwarded.split(",")[0]?.trim() ?? null;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = reservaSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Datos de reserva invalidos." }, { status: 400 });
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

  const rateLimit = await enforcePublicReservaRateLimit(getRequestIp(request));
  if (!rateLimit.allowed) {
    return Response.json(
      { error: "Llegaste al limite de reservas por hora. Intenta mas tarde." },
      { status: 429 }
    );
  }

  const clientMatch = await findClientByPhone(parsed.data.clienteTelefonoRaw ?? null);
  const result = await createTurnoReserva({
    barberoId: barbero.id,
    slotId: parsed.data.slotId,
    serviceId: parsed.data.serviceId,
    clienteNombre: parsed.data.clienteNombre,
    clienteTelefonoRaw: parsed.data.clienteTelefonoRaw || null,
    notaCliente: parsed.data.notaCliente || null,
    sugerenciaCancion: parsed.data.sugerenciaCancion || null,
    spotifyTrackUri: parsed.data.spotifyTrackUri || null,
    extras: parsed.data.extras,
    clientContext: clientMatch,
  });

  if (!result.ok) {
    return Response.json({ error: result.message }, { status: result.status });
  }

  return Response.json({ ok: true, turnoId: result.turnoId });
}
