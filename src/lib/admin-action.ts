import {
  getOwnerActorContext,
  getAdminActorContext,
  hasOwnerAccess,
  hasAdminAccess,
  type AdminActorContext,
  type OwnerActorContext,
} from "@/lib/dal/authz";

export type AdminSessionContext = AdminActorContext;
export type OwnerSessionContext = OwnerActorContext;

export async function requireAdminSession(): Promise<boolean> {
  return hasAdminAccess();
}

export async function getAdminSessionContext(): Promise<AdminSessionContext | null> {
  return getAdminActorContext();
}

export async function requireOwnerSession(): Promise<boolean> {
  return hasOwnerAccess();
}

export async function getOwnerSessionContext(): Promise<OwnerSessionContext | null> {
  return getOwnerActorContext();
}
