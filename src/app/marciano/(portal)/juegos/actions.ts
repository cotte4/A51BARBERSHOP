"use server";

import { and, eq, ilike, isNull, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { clients } from "@/db/schema";
import { requireMarcianoClient } from "@/lib/marciano-portal";
import { createBet, acceptBet, cancelBet } from "@/lib/ovnis-bets";

export async function searchMarcianoForBetAction(
  query: string
): Promise<{ id: string; name: string }[]> {
  const { client } = await requireMarcianoClient();

  if (!query.trim()) return [];

  return db
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
}

export async function crearApuestaAction(
  opponentId: string,
  gameId: string,
  amount: number
): Promise<{ success: true; betId: string } | { success: false; error: string }> {
  const { client } = await requireMarcianoClient();

  const result = await createBet({
    challengerId: client.id,
    opponentId,
    gameId,
    amount,
  });

  if (!result.success) {
    const messages: Record<string, string> = {
      insufficient_funds: "No tenés suficientes OVNIS.",
      same_player: "No podés apostar contra vos mismo.",
      challenger_not_marciano: "Tu membresía Marciano está inactiva.",
      opponent_not_marciano: "El oponente no es Marciano.",
      amount_below_min: "La apuesta mínima es 11 OVNIS.",
      game_not_found: "Juego no encontrado.",
      game_inactive: "Este juego no está disponible.",
    };
    return {
      success: false,
      error: messages[result.reason] ?? "No se pudo crear la apuesta.",
    };
  }

  revalidatePath("/marciano/juegos");
  return { success: true, betId: result.betId };
}

export async function aceptarApuestaAction(
  betId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const { client } = await requireMarcianoClient();

  const result = await acceptBet({ betId, opponentClientId: client.id });

  if (!result.success) {
    const messages: Record<string, string> = {
      not_found: "Apuesta no encontrada.",
      wrong_opponent: "Esta apuesta no es para vos.",
      not_pending: "La apuesta ya no está disponible para aceptar.",
      expired: "La apuesta venció — el retador ya recuperó sus OVNIS.",
      insufficient_funds: "No tenés suficientes OVNIS para aceptar.",
    };
    return {
      success: false,
      error: messages[result.reason] ?? "No se pudo aceptar.",
    };
  }

  revalidatePath("/marciano/juegos");
  revalidatePath(`/marciano/juegos/${betId}`);
  return { success: true };
}

export async function cancelarApuestaAction(
  betId: string
): Promise<{ success: true } | { success: false; error: string }> {
  const { client } = await requireMarcianoClient();

  const result = await cancelBet({ betId, byClientId: client.id });

  if (!result.success) {
    const messages: Record<string, string> = {
      not_found: "Apuesta no encontrada.",
      not_challenger: "Solo el retador puede cancelar.",
      not_cancellable: "La apuesta ya fue aceptada y no se puede cancelar.",
    };
    return {
      success: false,
      error: messages[result.reason] ?? "No se pudo cancelar.",
    };
  }

  revalidatePath("/marciano/juegos");
  return { success: true };
}
