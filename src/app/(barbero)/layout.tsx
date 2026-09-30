import { headers } from "next/headers";
import MusicHeartbeat from "@/components/MusicHeartbeat";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
import BrandMark from "@/components/BrandMark";
import RoleBottomNav from "@/components/navigation/RoleBottomNav";
import InternalSupportWidget from "@/components/support/InternalSupportWidget";
import { auth } from "@/lib/auth";

function formatOperatingDate() {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date());
}

export default async function BarberoLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  const userName = session?.user?.name ?? "Usuario";
  const userRole = (session?.user as { role?: string })?.role;
  const isAdmin = userRole === "admin";
  const operatingDate = formatOperatingDate();

  if (userRole === "marciano") {
    redirect("/marciano");
  }

  if (userRole === "asesor") {
    redirect("/dashboard");
  }

  return (
    <div className="app-shell min-h-screen">
      <header className="border-b border-zinc-900/80 bg-zinc-950/90 px-4 py-3 backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <BrandMark href="/hoy" compact subtitle={operatingDate} />
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-zinc-300">{userName}</span>
            <LogoutButton className="inline-flex min-h-[40px] items-center rounded-full border border-white/10 bg-white/[0.04] px-3.5 text-xs font-medium text-zinc-300 hover:border-[#8cff59]/25 hover:text-[#8cff59]" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 pb-28 sm:px-6 lg:px-8">{children}</main>
      <InternalSupportWidget />
      <RoleBottomNav isAdmin={isAdmin} />
      <MusicHeartbeat />
    </div>
  );
}
