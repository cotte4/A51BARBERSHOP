import type { Metadata } from "next";
import Link from "next/link";
import { listarTemas } from "@/lib/estudio";
import { META_TEMAS } from "@/lib/estudio-reglas";
import BrandMark from "@/components/BrandMark";
import EstudioClient from "./_EstudioClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Estudio · A51" };

export default async function EstudioPage() {
  const temas = await listarTemas();
  const progreso = Math.min(100, (temas.length / META_TEMAS) * 100);

  return (
    <div className="app-shell min-h-screen">
      <header className="relative z-20 border-b border-zinc-800/80 bg-zinc-950/90 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-4">
          <BrandMark href="/negocio" subtitle="Estudio" />
          <Link href="/negocio" className="text-sm text-zinc-400 hover:text-[#8cff59]">
            Volver
          </Link>
        </div>
      </header>

      <main className="relative mx-auto flex max-w-xl flex-col gap-6 px-4 py-6 pb-40">
        <section className="relative z-10">
          <p className="font-display text-4xl font-bold tabular-nums text-white">
            {temas.length}
            <span className="text-zinc-500">/{META_TEMAS}</span>
          </p>
          <p className="mt-1 text-sm text-zinc-400">Was &amp; Pinky</p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-zinc-800">
            <div className="h-full rounded-full bg-[#8cff59]" style={{ width: `${progreso}%` }} />
          </div>
        </section>

        <EstudioClient temas={temas} />
      </main>
    </div>
  );
}
