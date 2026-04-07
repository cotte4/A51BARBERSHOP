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
  const marcianosHref = "/marcianos";

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
          loginHref={loginHref}
          marcianosHref={marcianosHref}
        />
        <PublicLandingDetails
          reserveHref={reserveHref}
          loginHref={loginHref}
          marcianosHref={marcianosHref}
        />

        <footer className="px-4 pb-10 sm:px-6 lg:px-8">
          <div className="public-panel public-glow-soft mx-auto max-w-6xl rounded-[28px] px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="eyebrow text-[11px] font-semibold">A51 Barber Shop</p>
                <p className="mt-2 text-sm text-zinc-300">
                  Cliente reserva. Staff ingresa. La base queda lista desde la raiz.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
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
                  Portal Marciano
                </Link>
                <Link
                  href={loginHref}
                  className="ghost-button inline-flex min-h-11 items-center justify-center rounded-2xl px-5 text-sm font-semibold"
                >
                  Ingreso staff
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
