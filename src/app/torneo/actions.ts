"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { inscribirJugador } from "@/lib/torneo-data";

export type InscripcionState = {
  ok: boolean;
  mensaje: string | null;
};

const inscripcionSchema = z.object({
  nombre: z.string().trim().min(2, "Poné tu nombre.").max(80, "El nombre es muy largo."),
  email: z.string().trim().toLowerCase().email("Revisá el email.").max(120),
  whatsapp: z
    .string()
    .trim()
    .min(8, "Revisá el WhatsApp.")
    .max(30, "Revisá el WhatsApp.")
    .regex(/^[\d\s+()-]+$/, "El WhatsApp solo lleva números."),
  consentimiento: z.literal("on", { message: "Tenés que aceptar para anotarte." }),
});

// Límite por IP en memoria: por instancia serverless, así que es una primera barrera.
// El tope global por ráfaga (en la base) es el que corta de verdad. El Wi-Fi del local comparte IP.
const IP_VENTANA_MS = 10 * 60 * 1000;
const IP_MAX_INTENTOS = 20;
const intentosPorIp = new Map<string, number[]>();

function ipPermitida(ip: string): boolean {
  const ahora = Date.now();
  const recientes = (intentosPorIp.get(ip) ?? []).filter((t) => ahora - t < IP_VENTANA_MS);
  if (recientes.length >= IP_MAX_INTENTOS) {
    intentosPorIp.set(ip, recientes);
    return false;
  }
  recientes.push(ahora);
  intentosPorIp.set(ip, recientes);
  if (intentosPorIp.size > 1000) intentosPorIp.clear();
  return true;
}

const MENSAJES: Record<string, string> = {
  demasiados: "Hay mucha gente anotándose. Probá de nuevo en unos minutos.",
  cerrado: "Las inscripciones están cerradas.",
  ya_anotado: "Ese email ya está anotado.",
  lleno: "Se completó la lista de anotados.",
  telefono_invalido: "Revisá el WhatsApp.",
  sin_torneo: "Todavía no abrió la inscripción.",
};

export async function inscribirseAction(
  _prevState: InscripcionState,
  formData: FormData,
): Promise<InscripcionState> {
  // Campo trampa: las personas no lo ven, los bots lo completan.
  if (String(formData.get("website") ?? "").trim() !== "") {
    return { ok: true, mensaje: null };
  }

  const cabeceras = await headers();
  const ip =
    cabeceras.get("x-forwarded-for")?.split(",")[0]?.trim() || cabeceras.get("x-real-ip") || "unknown";
  if (!ipPermitida(ip)) {
    return { ok: false, mensaje: MENSAJES.demasiados };
  }

  const parsed = inscripcionSchema.safeParse({
    nombre: formData.get("nombre"),
    email: formData.get("email"),
    whatsapp: formData.get("whatsapp"),
    consentimiento: formData.get("consentimiento"),
  });
  if (!parsed.success) {
    return { ok: false, mensaje: parsed.error.issues[0]?.message ?? "Revisá los datos." };
  }

  const { consentimiento: _consentimiento, ...datos } = parsed.data;
  const resultado = await inscribirJugador(datos);
  if (!resultado.ok) {
    return { ok: false, mensaje: MENSAJES[resultado.motivo] ?? "No pudimos anotarte." };
  }

  revalidatePath("/torneo");
  revalidatePath("/torneo-admin");
  return { ok: true, mensaje: null };
}
