import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function requireAdminSession(): Promise<boolean> {
  const session = await auth.api.getSession({ headers: await headers() });
  const userRole = (session?.user as { role?: string })?.role;
  return userRole === "admin";
}
