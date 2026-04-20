import "server-only";

import { getBarberoScopedActorContext } from "@/lib/dal/authz";

export type TurnosActorContext = {
  userId: string;
  isAdmin: boolean;
  barberoId: string | null;
};

export async function getTurnosActorContext(): Promise<TurnosActorContext | null> {
  const actor = await getBarberoScopedActorContext();

  if (!actor) {
    return null;
  }

  return {
    userId: actor.userId,
    isAdmin: actor.role === "admin",
    barberoId: actor.barberoId ?? null,
  };
}

export function canManageTurnoForBarbero(
  actor: TurnosActorContext,
  barberoId: string
): boolean {
  return actor.isAdmin || actor.barberoId === barberoId;
}

