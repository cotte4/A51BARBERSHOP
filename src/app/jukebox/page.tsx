import { isJukeboxEnabled } from "@/lib/jukebox";
import JukeboxClient from "./_JukeboxClient";

export const dynamic = "force-dynamic";

export default async function JukeboxPage() {
  const enabled = await isJukeboxEnabled();

  if (!enabled) {
    return (
      <main className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-8">
        <section className="panel-card rounded-[28px] p-6 text-center">
          <p className="eyebrow text-zinc-500">Jukebox</p>
          <h1 className="mt-3 font-display text-2xl font-semibold text-white">
            Jukebox pausado
          </h1>
          <p className="mt-3 text-sm text-zinc-400">
            El sistema de propuestas está temporalmente desactivado. Volvé más tarde.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-8">
      <JukeboxClient />
    </main>
  );
}
