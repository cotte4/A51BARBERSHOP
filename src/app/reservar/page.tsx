import Link from "next/link";
import { getBarberosPublicosReserva } from "@/lib/turnos";

export default async function ReservarLandingPage() {
  const barberos = await getBarberosPublicosReserva();

  return (
    <main className="public-shell min-h-screen text-white">
      <div className="public-grid min-h-screen">
        <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <div className="mb-5">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-400 transition hover:text-[#8cff59]"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 5l-7 7 7 7" />
              </svg>
              Volver
            </Link>
          </div>

          <section className="public-panel public-glow rounded-[36px] border border-white/10 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-2xl space-y-4">
                <p className="eyebrow text-[#8cff59]">Area51 // booking lane</p>
                <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
                  Elegí tu nave y caé al turno
                </h1>
                <p className="max-w-xl text-sm text-zinc-300 sm:text-base">
                  Esta es la entrada de calle de A51. Tomas barbero, entras por tu carril y caes a
                  la agenda correcta sin memorizar links raros.
                </p>
              </div>

              <div className="grid min-w-[280px] gap-3">
                <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Barberos</p>
                  <p className="mt-2 text-lg font-semibold text-white">{barberos.length} disponibles</p>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Entrada</p>
                  <p className="mt-2 text-lg font-semibold text-white">Clave + club</p>
                </div>
              </div>
            </div>
          </section>

          {barberos.length === 0 ? (
            <section className="mt-6 rounded-[30px] border border-white/10 bg-black/25 p-6 text-center text-zinc-300">
              Todavia no hay barberos publicados para reserva. Activalos desde configuracion para
              mostrarlos aca.
            </section>
          ) : (
            <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {barberos.map((barbero) => {
                const href = `/reservar/${barbero.publicSlug}`;
                const requiresPassword = Boolean(barbero.publicReservaPasswordHash);

                return (
                  <Link
                    key={barbero.id}
                    href={href}
                    className="public-panel group rounded-[30px] border border-white/10 p-5 transition hover:border-[#8cff59]/35 hover:bg-white/[0.06]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                          {barbero.rol === "admin" ? "Nave founder" : "Nave barbero"}
                        </p>
                        <p className="mt-3 font-display text-2xl font-semibold text-white">
                          {barbero.nombre}
                        </p>
                      </div>
                      <span className="rounded-full border border-[#8cff59]/20 bg-[#8cff59]/10 px-3 py-1 text-xs font-semibold text-[#d8ffc7]">
                        {requiresPassword ? "Con clave" : "Libre"}
                      </span>
                    </div>

                    <p className="mt-4 text-sm leading-6 text-zinc-300">
                      Link directo para compartir y caer al slot de {barbero.nombre} sin pasar por
                      otra pantalla.
                    </p>

                    <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#8cff59]">
                      Subir a la nave con {barbero.nombre}
                      <span className="transition group-hover:translate-x-1">→</span>
                    </div>
                  </Link>
                );
              })}
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
