import type { Metadata } from "next";
import Link from "next/link";
import { listarTemas } from "@/lib/estudio";
import BrandMark from "@/components/BrandMark";
import EstudioClient from "./_EstudioClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Estudio · A51" };

export default async function EstudioPage() {
  const temas = await listarTemas();

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
        <EstudioClient temas={temas} />
      </main>
    </div>
  );
}
