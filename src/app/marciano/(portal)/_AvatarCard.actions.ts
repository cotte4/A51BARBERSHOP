"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { requireMarcianoClient } from "@/lib/marciano-portal";
import { findColorBySlug } from "@/lib/marciano-colors";
import { generateAvatar } from "@/lib/marciano-avatar";
import type { FaceShape } from "@/lib/types";

export async function saveFavoriteColorAction(
  slug: string
): Promise<{ success: true } | { success: false; error: string }> {
  const color = findColorBySlug(slug);
  if (!color) return { success: false, error: "Color inválido." };

  const { client } = await requireMarcianoClient();

  await db
    .update(clients)
    .set({ favoriteColor: slug, updatedAt: new Date() })
    .where(eq(clients.id, client.id));

  revalidatePath("/marciano");
  return { success: true };
}

export async function generateAvatarAction(input: {
  frameBase64: string;
  faceShape: FaceShape;
  colorSlug: string;
}): Promise<{ success: true; avatarUrl: string } | { success: false; error: string }> {
  const color = findColorBySlug(input.colorSlug);
  if (!color) return { success: false, error: "Color inválido." };
  if (!input.frameBase64) return { success: false, error: "No se capturó el rostro." };

  const { client } = await requireMarcianoClient();

  // Idempotente: si ya tiene avatar, no regenerar
  if (client.avatarUrl) {
    return { success: true, avatarUrl: client.avatarUrl };
  }

  const url = await generateAvatar(input.frameBase64, color.nombre, input.faceShape, client.id);
  if (!url) {
    return { success: false, error: "No pudimos generar tu avatar. Intentá de nuevo." };
  }

  await db
    .update(clients)
    .set({ avatarUrl: url, favoriteColor: input.colorSlug, updatedAt: new Date() })
    .where(eq(clients.id, client.id));

  revalidatePath("/marciano");
  return { success: true, avatarUrl: url };
}
