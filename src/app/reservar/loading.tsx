export default function ReservarLoading() {
  return (
    <main className="public-shell min-h-screen text-white">
      <div className="public-grid min-h-screen">
        <div className="mx-auto flex min-h-screen max-w-5xl items-center px-4 py-10">
          <section className="public-panel public-glow w-full rounded-[34px] border border-white/10 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:p-8">
            <p className="eyebrow text-[#8cff59]">Reserva publica</p>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              Cargando tu agenda A51
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-zinc-300 sm:text-base">
              Estamos preparando servicios, horarios y los pasos para dejar tu reserva lista sin ruido.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {["Servicio", "Horario", "Confirmacion"].map((label) => (
                <div
                  key={label}
                  className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-4"
                >
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{label}</p>
                  <div className="mt-3 h-3 w-24 animate-pulse rounded-full bg-white/10" />
                  <div className="mt-2 h-2 w-16 animate-pulse rounded-full bg-white/8" />
                </div>
              ))}
            </div>

            <div className="mt-8 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="rounded-[28px] border border-white/10 bg-black/25 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
                  Paso a paso
                </p>
                <div className="mt-4 space-y-3">
                  {[
                    "Elegir servicio",
                    "Seleccionar dia y horario",
                    "Enviar la solicitud",
                  ].map((item, index) => (
                    <div key={item} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#8cff59]/10 text-sm font-semibold text-[#8cff59]">
                        {index + 1}
                      </span>
                      <span className="text-sm text-zinc-200">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
                  Estado
                </p>
                <div className="mt-4 space-y-3">
                  <div className="h-5 w-32 animate-pulse rounded-full bg-white/10" />
                  <div className="h-4 w-full animate-pulse rounded-full bg-white/8" />
                  <div className="h-4 w-5/6 animate-pulse rounded-full bg-white/8" />
                  <div className="mt-4 h-12 rounded-2xl border border-white/10 bg-white/8" />
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
