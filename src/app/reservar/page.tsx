import Link from "next/link";
import AlienCrewCard from "@/components/branding/AlienCrewCard";
import { getBarberosPublicosReserva } from "@/lib/turnos";

export default async function ReservarLandingPage() {
  const barberos = await getBarberosPublicosReserva();

  return (
    <main className="public-shell min-h-screen text-white">
      <div className="public-grid min-h-screen">
        <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <section className="public-panel public-glow rounded-[36px] border border-white/10 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-2xl space-y-4">
                <p className="eyebrow text-[#8cff59]">Area51 // booking lane</p>
                <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
                  Elige tu nave y cae al turno
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
                <AlienCrewCard
                  title="Tripulacion en ronda"
                  detail="Referencia alien para el booking lane: tres pilotos, una nave y distintas cabinas para caer al corte."
                />
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
                          {barbero.rol === "admin" ? "Cabina founder" : "Cabina barbero"}
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

                    <div className="mt-5 space-y-2 rounded-[24px] border border-white/10 bg-black/20 p-4 text-sm text-zinc-300">
                      <p>
                        Ruta directa: <span className="text-white">{href}</span>
                      </p>
                      <p>
                        Acceso:{" "}
                        <span className="text-white">
                          {requiresPassword ? "clave o cuenta" : "link abierto"}
                        </span>
                      </p>
                    </div>

                    <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#8cff59]">
                      Subir a la cabina con {barbero.nombre}
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
