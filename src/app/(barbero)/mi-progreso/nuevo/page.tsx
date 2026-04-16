import Link from "next/link";
import { redirect } from "next/navigation";
import { getCajaActorContext } from "@/lib/caja-access";
import NuevoCorteForm from "./_NuevoCorteForm";

export default async function NuevoCortePageWrapper() {
  const ctx = await getCajaActorContext();
  if (!ctx?.barberoId) {
    redirect("/caja");
  }

  return (
    <div className="app-shell min-h-screen">
      <header className="border-b border-zinc-800/80 bg-zinc-950/90 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-4">
          <Link
            href="/mi-progreso"
            className="text-sm text-zinc-400 hover:text-[#8cff59] transition"
          >
            ← Mi Progreso
          </Link>
        </div>
      </header>
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 pb-24">
        <div>
          <p className="eyebrow text-xs font-semibold">Mi Progreso</p>
          <h1 className="font-display mt-2 text-2xl font-semibold text-white">Registrar corte</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Cada corte suma al contador y te acerca al siguiente nivel.
          </p>
        </div>
        <NuevoCorteForm />
      </main>
    </div>
  );
}
