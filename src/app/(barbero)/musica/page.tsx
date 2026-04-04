import Link from "next/link";
import { getMusicDashboardState } from "@/lib/music-engine";
import MusicOperationConsole from "@/components/musica/MusicOperationConsole";
import { getTurnosActorContext } from "@/lib/turnos-access";

export const dynamic = "force-dynamic";

export default async function MusicaPage() {
  const actor = await getTurnosActorContext();
  if (!actor) {
    return null;
  }

  if (!actor.isAdmin && !actor.barberoId) {
    return (
      <main className="min-h-screen bg-zinc-950 pb-28">
        <div className="rounded-[30px] border border-zinc-800 bg-zinc-900 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.4)]">
          <p className="text-lg font-semibold text-white">Falta tu perfil de barbero</p>
          <p className="mt-2 max-w-xl text-sm text-zinc-400">
            Vincula este usuario con un barbero activo para poder usar Jam, Soy DJ y la cola
            compartida desde Musica.
          </p>
          <Link
            href="/hoy"
            className="mt-4 inline-flex rounded-2xl bg-[#8cff59] px-4 py-3 text-sm font-semibold text-[#07130a]"
          >
            Volver a hoy
          </Link>
        </div>
      </main>
    );
  }

  const state = await getMusicDashboardState({ sync: true });

  return (
    <main className="min-h-screen bg-zinc-950 pb-28">
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[30px] border border-zinc-800 bg-zinc-900 shadow-[0_24px_80px_rgba(0,0,0,0.4)]">
          <div className="bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.16),_transparent_34%),radial-gradient(circle_at_bottom_left,_rgba(6,182,212,0.14),_transparent_30%)] p-6 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <Link href="/turnos" className="text-xs font-medium text-zinc-500 hover:text-zinc-300">
                  {"<"} Turnos
                </Link>
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">
                  Operacion
                </p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">Musica</h1>
                <p className="mt-3 max-w-2xl text-sm text-zinc-300">
                  Sistema musical del local con Auto por horario, takeover manual y Jam entre
                  barberos.
                </p>
              </div>
              <div className="rounded-2xl border border-[#8cff59]/20 bg-[#8cff59]/10 px-4 py-3 text-sm font-semibold text-[#d8ffc7]">
                Strategy C
              </div>
            </div>
          </div>
        </section>

        <MusicOperationConsole state={state} />
      </div>
    </main>
  );
}
