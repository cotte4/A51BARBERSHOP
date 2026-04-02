import Link from "next/link";
import { headers } from "next/headers";
import LogoutButton from "@/components/LogoutButton";
import BrandMark from "@/components/BrandMark";
import RoleBottomNav from "@/components/navigation/RoleBottomNav";
import { auth } from "@/lib/auth";

export default async function BarberoLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  const userName = session?.user?.name ?? "Usuario";
  const userRole = (session?.user as { role?: string })?.role;
  const isAdmin = userRole === "admin";

  return (
    <div className="app-shell min-h-screen">
      <header className="border-b border-zinc-800/80 bg-zinc-950/90 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <BrandMark href="/hoy" compact subtitle="Modo operativo" />
          </div>

          <div className="flex items-center gap-3">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-300">
              {userName}
            </span>
            {isAdmin ? (
              <Link
                href="/negocio"
                className="rounded-full border border-[#8cff59]/25 px-3 py-2 text-xs text-[#8cff59] hover:bg-[#8cff59]/10"
              >
                Ver negocio
              </Link>
            ) : null}
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 pb-28">{children}</main>
      <RoleBottomNav isAdmin={isAdmin} />
    </div>
  );
}
