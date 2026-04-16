"use server";

import { revalidatePath } from "next/cache";
import { put } from "@vercel/blob";
import { count, eq, max } from "drizzle-orm";
import { db } from "@/db";
import { barberoPortfolioItems } from "@/db/schema";
import { requireAdminSession } from "@/lib/admin-action";

export async function subirFotoPortfolioAction(formData: FormData) {
  const isAdmin = await requireAdminSession();
  if (!isAdmin) throw new Error("No autorizado");

  const barberoId = (formData.get("barberoId") as string | null)?.trim();
  const caption = (formData.get("caption") as string | null)?.trim() || null;
  const fotos = formData.getAll("fotos") as File[];

  if (!barberoId) throw new Error("Falta barberoId");

  const validFotos = fotos.filter((f) => f && f.size > 0);
  if (validFotos.length === 0) return;

  // Validate size
  for (const foto of validFotos) {
    if (foto.size > 8 * 1024 * 1024) {
      throw new Error(`La foto "${foto.name}" supera los 8 MB`);
    }
  }

  // Count existing items
  const [existing] = await db
    .select({ total: count() })
    .from(barberoPortfolioItems)
    .where(eq(barberoPortfolioItems.barberoId, barberoId));

  const currentCount = existing?.total ?? 0;
  if (currentCount + validFotos.length > 12) {
    throw new Error(`Solo podés tener 12 fotos. Tenés ${currentCount}, querés agregar ${validFotos.length}.`);
  }

  // Get max orden
  const [maxOrdenRow] = await db
    .select({ maxOrden: max(barberoPortfolioItems.orden) })
    .from(barberoPortfolioItems)
    .where(eq(barberoPortfolioItems.barberoId, barberoId));

  let nextOrden = (maxOrdenRow?.maxOrden ?? -1) + 1;

  for (const foto of validFotos) {
    const blob = await put(
      `portfolio/${barberoId}/${Date.now()}-${nextOrden}.jpg`,
      foto,
      { access: "public" }
    );
    await db.insert(barberoPortfolioItems).values({
      barberoId,
      fotoUrl: blob.url,
      caption,
      orden: nextOrden,
    });
    nextOrden++;
  }

  revalidatePath(`/configuracion/barberos/${barberoId}/editar`);
}

export async function eliminarFotoPortfolioAction(itemId: string, barberoId: string) {
  const isAdmin = await requireAdminSession();
  if (!isAdmin) throw new Error("No autorizado");

  await db.delete(barberoPortfolioItems).where(eq(barberoPortfolioItems.id, itemId));
  revalidatePath(`/configuracion/barberos/${barberoId}/editar`);
}
