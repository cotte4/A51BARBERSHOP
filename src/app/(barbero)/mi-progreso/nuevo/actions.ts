"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { put } from "@vercel/blob";
import { db } from "@/db";
import { barberCutsLog } from "@/db/schema";
import { getCajaActorContext } from "@/lib/caja-access";

export async function registrarCorteAction(formData: FormData) {
  const ctx = await getCajaActorContext();
  if (!ctx?.barberoId) {
    throw new Error("No autorizado");
  }
  const barberoId = ctx.barberoId;

  const servicioNombre = (formData.get("servicioNombre") as string | null)?.trim();
  const clienteNombre = (formData.get("clienteNombre") as string | null)?.trim() || null;
  const fecha = (formData.get("fecha") as string | null)?.trim();
  const notas = (formData.get("notas") as string | null)?.trim() || null;
  const foto = formData.get("foto") as File | null;

  if (!servicioNombre || !fecha) {
    throw new Error("Faltan campos obligatorios");
  }

  let fotoUrl: string | null = null;

  if (foto && foto.size > 0) {
    const blob = await put(
      `barber-cuts/${barberoId}/${Date.now()}.jpg`,
      foto,
      { access: "public" }
    );
    fotoUrl = blob.url;
  }

  await db.insert(barberCutsLog).values({
    barberoId,
    fecha,
    servicioNombre,
    clienteNombre,
    fotoUrl,
    notas,
  });

  revalidatePath("/mi-progreso");
  redirect("/mi-progreso");
}
