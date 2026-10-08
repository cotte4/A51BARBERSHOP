"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminSession } from "@/lib/admin-action";
import {
  actualizarConfig,
  asegurarTorneo,
  borrarTorneoDePrueba,
  eliminarJugador,
  getTorneoVigente,
  marcarPago,
  reemplazarEquipos,
} from "@/lib/torneo-data";
import {
  avanzarReveal,
  cargarResultado,
  reiniciarReveal,
  sortearYGuardar,
} from "@/lib/torneo-juego";
import { reemplazarJugador } from "@/lib/torneo-reemplazo";

export type TorneoAdminState = {
  ok: boolean;
  mensaje: string | null;
};

function refrescar() {
  revalidatePath("/torneo");
  revalidatePath("/torneo/pantalla");
  revalidatePath("/torneo-admin");
}

async function exigirAdmin(): Promise<TorneoAdminState | null> {
  return (await requireAdminSession()) ? null : { ok: false, mensaje: "No tenés permiso." };
}

export async function crearTorneoAction(): Promise<TorneoAdminState> {
  const denegado = await exigirAdmin();
  if (denegado) return denegado;
  await asegurarTorneo();
  refrescar();
  return { ok: true, mensaje: null };
}

export async function eliminarJugadorAction(jugadorId: string): Promise<TorneoAdminState> {
  const denegado = await exigirAdmin();
  if (denegado) return denegado;
  if (!z.string().uuid().safeParse(jugadorId).success) {
    return { ok: false, mensaje: "Jugador inválido." };
  }

  const resultado = await eliminarJugador(jugadorId);
  if (!resultado.ok) {
    const mensajes = {
      no_existe: "Ese jugador ya no existe.",
      pagado: "Pagó: primero deshacé el pago.",
      cerrado: "El torneo ya se sorteó: no se puede sacar a nadie.",
    } as const;
    return { ok: false, mensaje: mensajes[resultado.motivo] };
  }
  refrescar();
  return { ok: true, mensaje: null };
}

export async function marcarPagoAction(jugadorId: string, pagado: boolean): Promise<TorneoAdminState> {
  const denegado = await exigirAdmin();
  if (denegado) return denegado;
  if (!z.string().uuid().safeParse(jugadorId).success) {
    return { ok: false, mensaje: "Jugador inválido." };
  }

  const resultado = await marcarPago(jugadorId, pagado);
  if (!resultado.ok) {
    const mensajes = {
      cupo_lleno: "Ya hay 16 pagados. No entra nadie más.",
      no_existe: "Ese jugador ya no existe.",
      cerrado: "El torneo ya se sorteó: no se puede cambiar el pago.",
    } as const;
    return { ok: false, mensaje: mensajes[resultado.motivo] };
  }
  refrescar();
  return { ok: true, mensaje: null };
}

const configSchema = z.object({
  nombre: z.string().trim().min(2).max(80),
  // datetime-local: "2026-10-10T20:00" o vacío = fecha a confirmar
  fechaLocal: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
    .or(z.literal(""))
    .transform((v) => (v === "" ? null : v)),
  premiosTexto: z
    .string()
    .trim()
    .max(600)
    .transform((v) => (v === "" ? null : v)),
});

export async function guardarConfigAction(
  _prevState: TorneoAdminState,
  formData: FormData,
): Promise<TorneoAdminState> {
  const denegado = await exigirAdmin();
  if (denegado) return denegado;

  const parsed = configSchema.safeParse({
    nombre: formData.get("nombre"),
    fechaLocal: formData.get("fechaLocal") ?? "",
    premiosTexto: formData.get("premiosTexto") ?? "",
  });
  if (!parsed.success) return { ok: false, mensaje: "Revisá los datos." };

  const torneo = await getTorneoVigente();
  if (!torneo) return { ok: false, mensaje: "Todavía no hay torneo." };

  await actualizarConfig(torneo.id, parsed.data);
  refrescar();
  return { ok: true, mensaje: "Guardado." };
}

export async function guardarEquiposAction(
  _prevState: TorneoAdminState,
  formData: FormData,
): Promise<TorneoAdminState> {
  const denegado = await exigirAdmin();
  if (denegado) return denegado;

  const torneo = await getTorneoVigente();
  if (!torneo) return { ok: false, mensaje: "Todavía no hay torneo." };
  if (torneo.estado !== "inscripcion") {
    return { ok: false, mensaje: "El torneo ya se sorteó: no se pueden cambiar los equipos." };
  }

  const nombres = String(formData.get("equipos") ?? "")
    .split("\n")
    .map((n) => n.trim())
    .filter(Boolean);
  if (nombres.length > 64) return { ok: false, mensaje: "Son demasiados equipos." };

  await reemplazarEquipos(torneo.id, nombres);
  refrescar();
  return { ok: true, mensaje: `Guardados ${new Set(nombres).size} equipos.` };
}

export async function sortearAction(): Promise<TorneoAdminState> {
  const denegado = await exigirAdmin();
  if (denegado) return denegado;

  const torneo = await getTorneoVigente();
  if (!torneo) return { ok: false, mensaje: "Todavía no hay torneo." };

  const resultado = await sortearYGuardar(torneo.id);
  if (!resultado.ok) {
    const mensajes = {
      no_existe: "No encontramos el torneo.",
      ya_sorteado: "El torneo ya se sorteó.",
      pocos_pagados: "Hacen falta al menos 2 jugadores con el pago confirmado.",
      faltan_equipos: "Hay más jugadores que equipos. Cargá más equipos.",
    } as const;
    return { ok: false, mensaje: mensajes[resultado.motivo] };
  }
  refrescar();
  return { ok: true, mensaje: "Sorteo hecho." };
}

export async function siguienteRevealAction(): Promise<TorneoAdminState> {
  const denegado = await exigirAdmin();
  if (denegado) return denegado;

  const torneo = await getTorneoVigente();
  if (!torneo) return { ok: false, mensaje: "Todavía no hay torneo." };

  const resultado = await avanzarReveal(torneo.id);
  if (!resultado.ok) return { ok: false, mensaje: "Primero hay que sortear." };
  refrescar();
  return { ok: true, mensaje: null };
}

export async function reiniciarRevealAction(): Promise<TorneoAdminState> {
  const denegado = await exigirAdmin();
  if (denegado) return denegado;

  const torneo = await getTorneoVigente();
  if (!torneo) return { ok: false, mensaje: "Todavía no hay torneo." };

  await reiniciarReveal(torneo.id);
  refrescar();
  return { ok: true, mensaje: null };
}

export async function cargarResultadoAction(
  partidoId: string,
  ganadorId: string,
): Promise<TorneoAdminState> {
  const denegado = await exigirAdmin();
  if (denegado) return denegado;
  if (!z.string().uuid().safeParse(partidoId).success || !z.string().uuid().safeParse(ganadorId).success) {
    return { ok: false, mensaje: "Datos inválidos." };
  }

  const resultado = await cargarResultado(partidoId, ganadorId);
  if (!resultado.ok) {
    const mensajes = {
      no_existe: "Ese partido no existe.",
      sin_sorteo: "Primero hay que sortear.",
      invalido: resultado.detalle ?? "No se pudo cargar el resultado.",
    } as const;
    return { ok: false, mensaje: mensajes[resultado.motivo] };
  }
  refrescar();
  return { ok: true, mensaje: null };
}

const reemplazoSchema = z.discriminatedUnion("tipo", [
  z.object({ tipo: z.literal("espera"), jugadorId: z.string().uuid() }),
  z.object({
    tipo: z.literal("nuevo"),
    nombre: z.string().trim().min(2).max(80),
    email: z.string().trim().toLowerCase().email().max(120),
    whatsapp: z
      .string()
      .trim()
      .min(8)
      .max(30)
      .regex(/^[\d\s+()-]+$/),
  }),
]);

export async function reemplazarJugadorAction(bajaId: string, input: unknown): Promise<TorneoAdminState> {
  const denegado = await exigirAdmin();
  if (denegado) return denegado;
  if (!z.string().uuid().safeParse(bajaId).success) return { ok: false, mensaje: "Jugador inválido." };
  const parsed = reemplazoSchema.safeParse(input);
  if (!parsed.success) return { ok: false, mensaje: "Revisá los datos del reemplazo." };

  const datos = parsed.data;
  const resultado = await reemplazarJugador(
    bajaId,
    datos.tipo === "espera"
      ? { tipo: "espera", jugadorId: datos.jugadorId }
      : { tipo: "nuevo", datos: { nombre: datos.nombre, email: datos.email, whatsapp: datos.whatsapp } },
  );
  if (!resultado.ok) {
    const mensajes = {
      no_existe: "Ese jugador ya no existe.",
      sin_sorteo: "Todavía no hay sorteo: sacalo de la lista directamente.",
      no_sorteado: "Ese jugador no está en el sorteo.",
      ya_empezo: "Ya se jugó un partido: no se puede reemplazar a nadie.",
      reemplazo_invalido: "Ese reemplazo ya no está disponible.",
      ya_anotado: "Ese email ya está en el torneo.",
      telefono_invalido: "Revisá el WhatsApp.",
    } as const;
    return { ok: false, mensaje: mensajes[resultado.motivo] };
  }
  refrescar();
  return { ok: true, mensaje: null };
}

export async function borrarTorneoPruebaAction(): Promise<TorneoAdminState> {
  const denegado = await exigirAdmin();
  if (denegado) return denegado;
  const torneo = await getTorneoVigente();
  if (!torneo) return { ok: false, mensaje: "No hay torneo." };
  const resultado = await borrarTorneoDePrueba(torneo.id);
  if (!resultado.ok) return { ok: false, mensaje: "Solo se borran torneos cuyo nombre empieza con Prueba." };
  refrescar();
  return { ok: true, mensaje: null };
}
