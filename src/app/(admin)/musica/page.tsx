import Link from "next/link";
import SpotifyStudio from "@/components/musica/SpotifyStudio";

export default function MusicaPage() {
  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-6 pb-28">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="overflow-hidden rounded-[30px] bg-zinc-900 shadow-[0_24px_80px_rgba(0,0,0,0.4)]">
          <div className="bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.16),_transparent_34%),radial-gradient(circle_at_bottom_left,_rgba(245,158,11,0.14),_transparent_30%)] p-6 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <Link href="/turnos" className="text-xs font-medium text-zinc-500 hover:text-zinc-300">
                  {"<"} Turnos
                </Link>
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">
                  Operación
                </p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">Música</h1>
                <p className="mt-3 max-w-2xl text-sm text-zinc-300">
                  Controlá el parlante del local. Buscá canciones o poné una playlist.
                </p>
              </div>
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-200">
                Jukebox
              </div>
            </div>
          </div>
        </section>

        <SpotifyStudio />
      </div>
    </main>
  );
}
