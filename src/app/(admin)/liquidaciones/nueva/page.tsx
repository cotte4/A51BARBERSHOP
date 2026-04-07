import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { barberos } from "@/db/schema";
import NuevaLiquidacionForm from "./_NuevaLiquidacionForm";

type NuevaLiquidacionPageProps = {
  searchParams: Promise<{
    barberoId?: string;
    fecha?: string;
  }>;
};

export default async function NuevaLiquidacionPage({ searchParams }: NuevaLiquidacionPageProps) {
  const params = await searchParams;
  const barberosActivos = await db.select().from(barberos).where(eq(barberos.activo, true));
  const barberosLiquidables = barberosActivos.filter((barbero) => barbero.rol !== "admin");

  return (
    <div className="min-h-screen app-shell px-4 py-6 pb-24">
      <div className="mx-auto flex max-w-5xl flex-col gap-5">
        <Link href="/liquidaciones" className="eyebrow text-xs text-zinc-500 hover:text-zinc-300">
          ← Liquidaciones
        </Link>

        <section className="panel-card overflow-hidden rounded-[32px]">
          <div className="bg-[radial-gradient(circle_at_top_right,_rgba(140,255,89,0.14),_transparent_36%),radial-gradient(circle_at_bottom_left,_rgba(140,255,89,0.06),_transparent_28%)] p-6 sm:p-7">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <p className="eyebrow text-xs">Nueva liquidacion</p>
                <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  Crear liquidacion
                </h1>
                <p className="mt-3 max-w-2xl text-sm text-zinc-300">
                  Elegi a quien liquidar, define el periodo y revisa el preview antes de generar el
                  registro. El flujo esta armado para que no haya dudas sobre lo que se esta cerrando.
                </p>
              </div>

              <div className="panel-soft rounded-[24px] px-5 py-4 text-sm text-zinc-200">
                <p className="eyebrow text-[10px]">Liquidables hoy</p>
                <p className="mt-2 font-display text-3xl font-semibold tracking-tight text-[#8cff59]">
                  {barberosLiquidables.length}
                </p>
                <p className="mt-1 text-sm text-zinc-400">barberos activos disponibles</p>
              </div>
            </div>
          </div>
        </section>

        <NuevaLiquidacionForm
          barberosList={barberosLiquidables.map((barbero) => ({
            id: barbero.id,
            nombre: barbero.nombre,
          }))}
          initialBarberoId={params.barberoId}
          initialFecha={params.fecha}
        />
      </div>
    </div>
  );
}
