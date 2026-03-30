import Link from "next/link";
import { headers } from "next/headers";
import LogoutButton from "@/components/LogoutButton";
import BrandMark from "@/components/BrandMark";
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
            {isAdmin ? (
              <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-[#8cff59]">
                Volver a base
              </Link>
            ) : null}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <BrandMark href="/caja" compact subtitle="Modulo operativo" />
              <nav className="flex items-center gap-2 text-sm text-zinc-400">
                <Link
                  href="/caja"
                  className="rounded-full px-3 py-2 hover:bg-white/5 hover:text-white"
                >
                  Caja
                </Link>
                <Link
                  href="/clientes"
                  className="rounded-full px-3 py-2 hover:bg-white/5 hover:text-white"
                >
                  Marcianos
                </Link>
                {isAdmin ? (
                  <Link
                    href="/turnos"
                    className="rounded-full px-3 py-2 hover:bg-white/5 hover:text-white"
                  >
                    Turnos
                  </Link>
                ) : null}
              </nav>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-300">
              {userName}
            </span>
            {isAdmin ? (
              <Link
                href="/configuracion"
                className="rounded-full border border-[#8cff59]/25 px-3 py-2 text-xs text-[#8cff59] hover:bg-[#8cff59]/10"
              >
                Config
              </Link>
            ) : null}
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
