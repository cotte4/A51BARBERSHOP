import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export type AsesorSessionContext = {
  userId: string;
  role: string;
};

export async function requireAsesorSession(): Promise<boolean> {
  const session = await auth.api.getSession({ headers: await headers() });
  const userRole = (session?.user as { role?: string })?.role;
  return userRole === "admin" || userRole === "asesor";
}

export async function getAsesorSessionContext(): Promise<AsesorSessionContext | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  const user = session?.user as { id?: string; role?: string } | undefined;

  if (!user?.id || (user.role !== "admin" && user.role !== "asesor")) {
    return null;
  }

  return {
    userId: user.id,
    role: user.role,
  };
}
