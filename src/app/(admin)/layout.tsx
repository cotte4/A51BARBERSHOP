import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import MusicHeartbeat from "@/components/MusicHeartbeat";
import RoleBottomNav from "@/components/navigation/RoleBottomNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  const userRole = (session?.user as { role?: string })?.role;
  const isAdmin = userRole === "admin";
  const isAsesor = userRole === "asesor";

  return (
    <>
      <MusicHeartbeat />
      <div className="pb-28">{children}</div>
      <RoleBottomNav isAdmin={isAdmin} isAsesor={isAsesor} />
    </>
  );
}
