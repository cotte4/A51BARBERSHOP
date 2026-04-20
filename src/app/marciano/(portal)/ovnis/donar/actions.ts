"use server";

import { and, eq, ilike, isNull, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { requireMarcianoClient } from "@/lib/marciano-portal";
import { transferOvnis } from "@/lib/ovnis-server";

export async function searchMarcianoAction(
  query: string
): Promise<{ id: string; name: string }[]> {
  const { client } = await requireMarcianoClient();

  if (!query.trim()) return [];

  const results = await db
    .select({ id: clients.id, name: clients.name })
    .from(clients)
    .where(
      and(
        ilike(clients.name, `%${query.trim()}%`),
        eq(clients.esMarciano, true),
        isNull(clients.archivedAt),
        ne(clients.id, client.id)
      )
    )
    .limit(5);

  return results;
}

export async function donarAction(
  toClientId: string,
  amount: number
): Promise<{ success: true } | { success: false; error: string }> {
  const { client } = await requireMarcianoClient();

  if (!Number.isInteger(amount) || amount <= 0) {
    return { success: false, error: "El monto debe ser un número positivo." };
  }

  const result = await transferOvnis({
    fromClientId: client.id,
    toClientId,
    amount,
    description: "Donación Marciana",
  });

  if (!result.success) {
    const messages: Record<string, string> = {
      invalid_amount: "El monto debe ser un número positivo.",
      insufficient_funds: "No tenés suficientes OVNIS.",
      same_client: "No podés donarte OVNIS a vos mismo.",
      recipient_not_marciano: "El destinatario no es Marciano.",
    };
    return {
      success: false,
      error: messages[result.reason] ?? "No se pudo donar. Intentá de nuevo.",
    };
  }

  revalidatePath("/marciano/ovnis");
  return { success: true };
}
