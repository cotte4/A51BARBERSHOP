import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Jukebox — A51 Barber",
  description: "Proponé tu tema para el local.",
};

export default function JukeboxLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell min-h-screen">
      <header className="border-b border-zinc-800/80 bg-zinc-950/90 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <span className="font-display text-lg font-semibold text-white">A51</span>
          <span className="text-zinc-600">/</span>
          <span className="text-sm font-medium text-zinc-400">Jukebox</span>
        </div>
      </header>
      {children}
    </div>
  );
}
