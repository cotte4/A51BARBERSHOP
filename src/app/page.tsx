import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import PublicLandingDetails from "@/components/landing/PublicLandingDetails";
import PublicLandingHero from "@/components/landing/PublicLandingHero";
import { auth } from "@/lib/auth";

export default async function RootPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user as { role?: string } | undefined)?.role;
  const reserveHref = "/reservar";
  const loginHref = "/login";
  const marcianosHref = "/marciano/login";

  if (role === "marciano") {
    redirect("/marciano");
  }

  if (session?.user) {
    redirect("/hoy");
  }

  return (
    <main className="public-shell relative min-h-screen overflow-hidden">
      <div
        aria-hidden="true"
        className="public-grid pointer-events-none absolute inset-0 opacity-40"
      />
      <div
        aria-hidden="true"
        className="public-vignette pointer-events-none absolute inset-0 opacity-80"
      />

      <div className="relative">
        <PublicLandingHero
          reserveHref={reserveHref}
          marcianosHref={marcianosHref}
        />
        <PublicLandingDetails
          reserveHref={reserveHref}
          marcianosHref={marcianosHref}
        />

        <footer className="px-4 pb-10 sm:px-6 lg:px-8">
          <div className="public-panel public-glow-soft mx-auto max-w-6xl rounded-[28px] px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="eyebrow text-[11px] font-semibold">A51 Barber Shop</p>
                <p className="mt-2 text-sm text-zinc-400">
                  Zona Aldrey, Mar del Plata · Mar — Sáb 10:00–19:00
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href={reserveHref}
                  className="neon-button inline-flex min-h-11 items-center justify-center rounded-2xl px-5 text-sm font-semibold"
                >
                  Reservar turno
                </Link>
                <Link
                  href={marcianosHref}
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 text-sm font-semibold text-zinc-100 transition hover:border-[#8cff59]/30 hover:bg-white/10"
                >
                  Club Marciano
                </Link>
                <Link
                  href={loginHref}
                  className="text-xs text-zinc-600 transition hover:text-zinc-400 sm:px-2"
                >
                  staff
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
