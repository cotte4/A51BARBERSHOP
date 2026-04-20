import {
  getAdminActorContext,
  hasAdminAccess,
  type AdminActorContext,
} from "@/lib/dal/authz";

export type AdminSessionContext = AdminActorContext;

export async function requireAdminSession(): Promise<boolean> {
  return hasAdminAccess();
}

export async function getAdminSessionContext(): Promise<AdminSessionContext | null> {
  return getAdminActorContext();
}
