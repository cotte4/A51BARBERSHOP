import { db } from "@/db";
import { barberos } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import NuevaLiquidacionForm from "./_NuevaLiquidacionForm";

export default async function NuevaLiquidacionPage() {
  const barberosActivos = await db.select().from(barberos).where(eq(barberos.activo, true));
  const barberosLiquidables = barberosActivos.filter((barbero) => barbero.rol !== "admin");

  return (
    <main className="min-h-screen bg-stone-100 px-4 py-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="overflow-hidden rounded-[32px] bg-stone-950 text-stone-50 shadow-[0_24px_80px_rgba(28,25,23,0.2)]">
          <div className="bg-[radial-gradient(circle_at_top_right,_rgba(251,191,36,0.26),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(16,185,129,0.18),_transparent_30%)] p-6 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-2xl">
                <Link href="/liquidaciones" className="text-sm text-stone-300 hover:text-white">
                  ← Liquidaciones
                </Link>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight">Nueva liquidacion</h1>
                <p className="mt-3 text-sm text-stone-300">
                  Prepara el periodo, confirma a quien corresponde y genera una liquidacion lista
                  para revisar sin pasar por un formulario gris de backoffice.
                </p>
              </div>

              <div className="rounded-[24px] bg-white/10 px-5 py-4 text-sm text-stone-100 ring-1 ring-white/15">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-300">
                  Liquidables hoy
                </p>
                <p className="mt-2 text-2xl font-semibold">{barberosLiquidables.length}</p>
                <p className="mt-1 text-stone-300">barberos activos disponibles</p>
              </div>
            </div>
          </div>
        </section>

        <NuevaLiquidacionForm
          barberosList={barberosLiquidables.map((barbero) => ({
            id: barbero.id,
            nombre: barbero.nombre,
          }))}
        />
      </div>
    </main>
  );
}
