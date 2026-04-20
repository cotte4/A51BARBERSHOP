"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { productos, servicios } from "@/db/schema";
import { getAdminSessionContext } from "@/lib/admin-action";

export async function updateOvnisValueAction(
  id: string,
  type: "servicio" | "producto",
  value: number
): Promise<{ success: true } | { success: false; error: string }> {
  const ctx = await getAdminSessionContext();
  if (!ctx) return { success: false, error: "No autorizado" };

  if (!Number.isInteger(value) || value < 0) {
    return { success: false, error: "El valor debe ser un número entero positivo" };
  }

  try {
    if (type === "servicio") {
      await db.update(servicios).set({ ovnisValue: value }).where(eq(servicios.id, id));
    } else {
      await db.update(productos).set({ ovnisValue: value }).where(eq(productos.id, id));
    }
    revalidatePath("/configuracion/ovnis");
    return { success: true };
  } catch {
    return { success: false, error: "No se pudo guardar. Intentá de nuevo." };
  }
}
