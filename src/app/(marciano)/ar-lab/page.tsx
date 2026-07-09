"use client";

import dynamic from "next/dynamic";

const ArLabCanvas = dynamic(() => import("./_ArLabCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center bg-[#121212]">
      <p className="text-zinc-400 text-sm">Cargando AR Lab...</p>
    </div>
  ),
});

export default function ArLabPage() {
  return (
    <div className="app-shell min-h-screen">
      <header className="border-b border-zinc-800/80 bg-zinc-950/90 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <h1 className="font-display text-xl font-semibold text-white">AR Lab</h1>
          <span className="rounded-full bg-[#8cff59]/15 px-2.5 py-0.5 text-xs font-medium text-[#8cff59]">
            Spike — Fase 0
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-6 pb-24">
        <ArLabCanvas />
      </main>
    </div>
  );
}
