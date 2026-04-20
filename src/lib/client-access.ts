import {
  getBarberoScopedActorContext,
  type BarberoScopedActorContext,
} from "@/lib/dal/authz";
import { canAccessClient as canAccessClientInDal } from "@/lib/dal/clients";

export type ClientActorContext = BarberoScopedActorContext;

export async function getClientActorContext(): Promise<ClientActorContext | null> {
  return getBarberoScopedActorContext();
}

export async function canAccessClient(
  actor: ClientActorContext,
  clientId: string
): Promise<boolean> {
  return canAccessClientInDal(actor, clientId);
}
