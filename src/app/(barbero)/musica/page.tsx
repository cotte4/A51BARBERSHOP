import Link from "next/link";
import MusicStateBadge from "@/components/musica/MusicStateBadge";
import { getMusicDashboardState } from "@/lib/music-engine";
import MusicOperationConsole from "@/components/musica/MusicOperationConsole";
import { getTurnosActorContext } from "@/lib/turnos-access";

export const dynamic = "force-dynamic";

function modeLabel(mode: "auto" | "dj" | "jam") {
  if (mode === "dj") return "Soy DJ";
  if (mode === "jam") return "Jam";
  return "Auto";
}

export default async function MusicaPage() {
  const actor = await getTurnosActorContext();
  if (!actor) {
    return null;
  }

  if (!actor.isAdmin && !actor.barberoId) {
    return (
      <main className="public-shell min-h-screen pb-28 text-white">
        <div className="mx-auto flex min-h-screen max-w-5xl items-center px-4 py-10">
          <section className="public-panel rounded-[34px] border border-white/10 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
            <p className="eyebrow text-[#8cff59]">Musica</p>
            <p className="mt-3 text-2xl font-semibold text-white">Falta tu perfil de barbero</p>
            <p className="mt-3 max-w-xl text-sm text-zinc-300">
              Vincula este usuario con un barbero activo para poder usar Jam, Soy DJ y la cola
              compartida desde Musica.
            </p>
            <Link
              href="/hoy"
              className="neon-button mt-5 inline-flex rounded-2xl px-4 py-3 text-sm font-semibold text-[#07130a]"
            >
              Volver a hoy
            </Link>
          </section>
        </div>
      </main>
    );
  }

  const state = await getMusicDashboardState({ sync: true });

  return (
    <main className="public-shell min-h-screen pb-28 text-white">
      <div className="public-grid min-h-screen">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <section className="public-panel public-glow rounded-[34px] border border-white/10 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-2xl space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <MusicStateBadge state={state.runtime.state} />
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-zinc-300">
                    Modo {modeLabel(state.mode.activeMode)}
                  </span>
                  <span className="rounded-full border border-[#8cff59]/20 bg-[#8cff59]/10 px-3 py-1 text-xs font-semibold text-[#d8ffc7]">
                    {state.queue.items.length} en cola
                  </span>
                </div>
                <div>
                  <p className="eyebrow text-[#8cff59]">Operacion</p>
                  <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
                    Musica del local
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm text-zinc-300 sm:text-base">
                    Aca manejas Auto, Soy DJ, Jam y la cola compartida desde un solo panel legible.
                    Primero ves el estado, despues los controles y al final el detalle fino.
                  </p>
                </div>
              </div>

              <div className="grid min-w-[230px] gap-2 sm:grid-cols-2 lg:grid-cols-1">
                <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Provider</p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {state.provider.connected ? "Spotify conectado" : "Spotify desconectado"}
                  </p>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Player</p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {state.players.find((player) => player.isExpectedLocalPlayer)?.name ??
                      state.players.find((player) => player.isDefault)?.name ??
                      "Sin player definido"}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <div className="mt-6">
            <MusicOperationConsole state={state} />
          </div>
        </div>
      </div>
    </main>
  );
}
