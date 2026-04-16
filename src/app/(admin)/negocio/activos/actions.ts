"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { barberShopAssets } from "@/db/schema";
import { requireAdminSession } from "@/lib/admin-action";
import { ASSET_CATEGORIAS, type AssetCategoria } from "./types";

export async function crearAssetAction(formData: FormData) {
  const isAdmin = await requireAdminSession();
  if (!isAdmin) throw new Error("No autorizado");

  const nombre = (formData.get("nombre") as string | null)?.trim();
  const categoria = (formData.get("categoria") as string | null)?.trim();
  const precioCompra = (formData.get("precioCompra") as string | null)?.trim();
  const fechaCompra = (formData.get("fechaCompra") as string | null)?.trim();
  const proveedor = (formData.get("proveedor") as string | null)?.trim() || null;
  const notas = (formData.get("notas") as string | null)?.trim() || null;

  if (!nombre || !categoria || !precioCompra || !fechaCompra) {
    throw new Error("Faltan campos obligatorios");
  }

  if (!ASSET_CATEGORIAS.includes(categoria as AssetCategoria)) {
    throw new Error("Categoría inválida");
  }

  await db.insert(barberShopAssets).values({
    nombre,
    categoria: categoria as AssetCategoria,
    precioCompra,
    fechaCompra,
    proveedor,
    notas,
    estado: "activo",
  });

  revalidatePath("/negocio/activos");
  redirect("/negocio/activos");
}

export async function darDeBajaAssetAction(assetId: string) {
  const isAdmin = await requireAdminSession();
  if (!isAdmin) throw new Error("No autorizado");

  await db
    .update(barberShopAssets)
    .set({ estado: "dado_de_baja" })
    .where(eq(barberShopAssets.id, assetId));

  revalidatePath("/negocio/activos");
}
