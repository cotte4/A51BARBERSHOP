import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export type AdminSessionContext = {
  userId: string;
  role: string;
};

export async function requireAdminSession(): Promise<boolean> {
  const session = await auth.api.getSession({ headers: await headers() });
  const userRole = (session?.user as { role?: string })?.role;
  return userRole === "admin";
}

export async function getAdminSessionContext(): Promise<AdminSessionContext | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user as { id?: string; role?: string } | undefined;

  if (!user?.id || user.role !== "admin") {
    return null;
  }

  return {
    userId: user.id,
    role: user.role,
  };
}
