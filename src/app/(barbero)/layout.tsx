import Link from "next/link";
import { headers } from "next/headers";
import MusicHeartbeat from "@/components/MusicHeartbeat";
import { redirect } from "next/navigation";
import LogoutButton from "@/components/LogoutButton";
import BrandMark from "@/components/BrandMark";
import RoleBottomNav from "@/components/navigation/RoleBottomNav";
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

  return (
    <div className="app-shell min-h-screen">
      <header className="border-b border-zinc-900/80 bg-zinc-950/90 px-4 py-4 backdrop-blur sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-3.5">
              <BrandMark href="/hoy" compact subtitle="Modo operativo" />

              <div className="flex flex-wrap items-center gap-2">
                <span className="eyebrow rounded-full border border-[#8cff59]/18 bg-[rgba(140,255,89,0.08)] px-3 py-2 text-[10px] font-semibold text-[#b9ff96]">
                  Hoy
                </span>
                <span className="panel-soft rounded-full px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-300">
                  Turnos / caja / atenciones
                </span>
                <span className="panel-soft rounded-full px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-300">
                  {operatingDate}
                </span>
              </div>

              <p className="max-w-3xl text-sm leading-5 text-zinc-500">
                Estas en la sala de control del dia. Ves que hacer ahora y lo que merece atencion.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
              <div className="rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  Sesion
                </p>
                <p className="mt-1 text-sm font-semibold text-white">{userName}</p>
              </div>

              <div
                className={`rounded-[20px] border px-4 py-3 ${
                  isAdmin
                    ? "border-[#8cff59]/20 bg-[rgba(140,255,89,0.08)] text-[#8cff59]"
                    : "border-white/10 bg-white/[0.04] text-zinc-300"
                }`}
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                  Rol
                </p>
                <p className="mt-1 text-sm font-semibold capitalize text-inherit">
                  {userRole ?? "barbero"}
                </p>
              </div>

              {isAdmin ? (
                <Link
                  href="/negocio"
                  className="inline-flex min-h-[40px] items-center rounded-full border border-[#8cff59]/22 bg-[rgba(140,255,89,0.05)] px-3.5 text-xs font-semibold text-[#8cff59] hover:bg-[#8cff59]/10"
                >
                  Ver negocio
                </Link>
              ) : null}
              <LogoutButton className="inline-flex min-h-[40px] items-center rounded-full border border-white/10 bg-white/[0.04] px-3.5 text-xs font-medium text-zinc-300 hover:border-[#8cff59]/25 hover:text-[#8cff59]" />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 pb-28 sm:px-6 lg:px-8">{children}</main>
      <RoleBottomNav isAdmin={isAdmin} />
      <MusicHeartbeat />
    </div>
  );
}
