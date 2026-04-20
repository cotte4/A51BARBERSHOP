"use server";

import { revalidatePath } from "next/cache";
import { requireMarcianoClient } from "@/lib/marciano-portal";
import { createRedemption } from "@/lib/ovnis-server";

export async function canjearAction(
  itemId: string
): Promise<{ success: true; redemptionId: string } | { success: false; error: string }> {
  const { client } = await requireMarcianoClient();

  const result = await createRedemption({ clientId: client.id, itemId });

  if (!result.success) {
    const messages: Record<string, string> = {
      item_not_found: "Premio no encontrado.",
      item_inactive: "Este premio ya no está disponible.",
      out_of_stock: "Sin stock — llegaste tarde.",
      insufficient_funds: `No tenés suficientes OVNIS para este canje.`,
    };
    return {
      success: false,
      error: messages[result.reason] ?? "No se pudo canjear. Intentá de nuevo.",
    };
  }

  revalidatePath("/marciano/ovnis/canjear");
  revalidatePath("/marciano/ovnis");
  return { success: true, redemptionId: result.redemptionId };
}
