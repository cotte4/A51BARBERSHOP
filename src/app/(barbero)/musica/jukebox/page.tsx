import Link from "next/link";
import { getJukeboxStaffState } from "@/lib/jukebox";
import { getTurnosActorContext } from "@/lib/turnos-access";
import JukeboxStaff from "./_JukeboxStaff";

export const dynamic = "force-dynamic";

export default async function MusicaJukeboxPage() {
  const actor = await getTurnosActorContext();
  if (!actor) {
    return null;
  }

  if (!actor.isAdmin && !actor.barberoId) {
    return (
      <main className="public-shell min-h-screen pb-28 text-white">
        <div className="mx-auto flex min-h-screen max-w-5xl items-center px-4 py-10">
          <section className="public-panel rounded-[34px] border border-white/10 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
            <p className="eyebrow text-[#8cff59]">Jukebox</p>
            <p className="mt-3 text-2xl font-semibold text-white">Falta tu perfil de barbero</p>
            <p className="mt-3 max-w-xl text-sm text-zinc-300">
              Vincula este usuario con un barbero activo para poder manejar el Jukebox del local.
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

  const initial = await getJukeboxStaffState();

  return (
    <main className="public-shell min-h-screen pb-28 text-white">
      <div className="public-grid min-h-screen">
        <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:py-10">
          <Link
            href="/musica"
            className="text-sm text-zinc-400 hover:text-[#8cff59] hover:underline"
          >
            ← Música
          </Link>
          <header className="mt-4 mb-6">
            <p className="eyebrow text-[#8cff59]">Operacion</p>
            <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Jukebox del local
            </h1>
            <p className="mt-3 max-w-xl text-sm text-zinc-300">
              Los temas que propone el público (QR en <span className="font-semibold">/jukebox</span>)
              suenan desde este celular. Dejá esta pantalla abierta mientras dure el evento.
            </p>
          </header>
          <JukeboxStaff initial={initial} />
        </div>
      </div>
    </main>
  );
}
