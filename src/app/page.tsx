import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import MarcianoCerradoPill from "@/components/landing/MarcianoCerradoPill";
import PublicLandingDetails from "@/components/landing/PublicLandingDetails";
import PublicLandingHero from "@/components/landing/PublicLandingHero";
import { auth } from "@/lib/auth";
import { isPortalClienteAbierto } from "@/lib/launch-mode";
import { getTorneoVigente } from "@/lib/torneo-data";

const ZONA = "America/Argentina/Buenos_Aires";

/** Datos reales del torneo para la tarjeta de la landing; si algo falla, la tarjeta usa sus valores por defecto. */
async function datosTorneoLanding() {
  try {
    const torneo = await getTorneoVigente();
    if (!torneo) return undefined;
    return {
      cupo: torneo.cupo,
      cuota: new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(Number(torneo.cuotaArs)),
      fecha: torneo.fecha
        ? new Intl.DateTimeFormat("es-AR", { timeZone: ZONA, weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }).format(torneo.fecha)
        : null,
    };
  } catch {
    return undefined;
  }
}

export default async function RootPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const role = (session?.user as { role?: string } | undefined)?.role;
  const marcianoAbierto = isPortalClienteAbierto();
  const torneoDatos = marcianoAbierto ? undefined : await datosTorneoLanding();
  const reserveHref = "/reservar";
  const loginHref = "/login";
  const marcianosHref = "/marciano/login";

  if (role === "marciano" && marcianoAbierto) {
    redirect("/marciano");
  }

  if (session?.user && role !== "marciano") {
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
          marcianoAbierto={marcianoAbierto}
          reserveHref={reserveHref}
          marcianosHref={marcianosHref}
          torneoDatos={torneoDatos}
        />
        <PublicLandingDetails
          marcianoAbierto={marcianoAbierto}
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
                {marcianoAbierto ? (
                  <Link
                    href={reserveHref}
                    className="neon-button inline-flex min-h-11 items-center justify-center rounded-2xl px-5 text-sm font-semibold"
                  >
                    Reservar turno
                  </Link>
                ) : (
                  <Link
                    href="/torneo"
                    className="neon-button inline-flex min-h-11 items-center justify-center rounded-2xl px-5 text-sm font-semibold"
                  >
                    Anotarme al torneo
                  </Link>
                )}
                {marcianoAbierto ? (
                  <Link
                    href={marcianosHref}
                    className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-5 text-sm font-semibold text-zinc-100 transition hover:border-[#8cff59]/30 hover:bg-white/10"
                  >
                    Club Marciano
                  </Link>
                ) : (
                  <MarcianoCerradoPill />
                )}
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
