import {
  getAdminActorContext,
  hasAdminAccess,
  type AdminActorContext,
} from "@/lib/dal/authz";

export type AsesorSessionContext = AdminActorContext;

export async function requireAsesorSession(): Promise<boolean> {
  return hasAdminAccess();
}

export async function getAsesorSessionContext(): Promise<AsesorSessionContext | null> {
  return getAdminActorContext();
}
