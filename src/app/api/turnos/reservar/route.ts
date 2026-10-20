import { isPortalClienteAbierto } from "@/lib/launch-mode";
import { z } from "zod";
import { canAccessPublicReserva } from "@/lib/public-reserva-access";
import { createTurnoReserva } from "@/lib/turnos-reserva";
import { getCurrentActorContext } from "@/lib/dal/authz";
import { cancelarTurnoReprogramado, getTurnoAReprogramar } from "@/lib/marciano-turnos";
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
  // "fecha|hora" (src/lib/horario.ts), lo valida createTurnoReserva.
  slotId: z.string().regex(/^\d{4}-\d{2}-\d{2}\|\d{2}:\d{2}$/),
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
  // Marciano moviendo un turno: el viejo se cancela recién cuando el nuevo quedó guardado.
  reprogramarTurnoId: z.string().uuid().optional(),
});

function getRequestIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (!forwarded) {
    return null;
  }
  return forwarded.split(",")[0]?.trim() ?? null;
}

export async function POST(request: Request) {
  if (!isPortalClienteAbierto()) return new Response("Not found", { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = reservaSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "Datos de reserva inválidos." }, { status: 400 });
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

  const rateLimit = await enforcePublicReservaRateLimit(getRequestIp(request));
  if (!rateLimit.allowed) {
    return Response.json(
      { error: "Llegaste al límite de reservas por hora. Intentá más tarde." },
      { status: 429 }
    );
  }

  let turnoAReprogramarId: string | null = null;
  if (parsed.data.reprogramarTurnoId) {
    const actor = await getCurrentActorContext();
    if (actor?.role !== "marciano") {
      return Response.json({ error: "Entrá con tu cuenta para mover un turno." }, { status: 401 });
    }
    const aReprogramar = await getTurnoAReprogramar(actor.userId, parsed.data.reprogramarTurnoId);
    if (!aReprogramar.ok) {
      return Response.json({ error: aReprogramar.message }, { status: 409 });
    }
    turnoAReprogramarId = aReprogramar.turnoId;
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

  if (turnoAReprogramarId) {
    await cancelarTurnoReprogramado(turnoAReprogramarId);
  }

  return Response.json({ ok: true, turnoId: result.turnoId });
}
