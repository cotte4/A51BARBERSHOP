import Link from "next/link";
import { crearTemporada } from "../actions";
import TemporadaForm from "@/components/configuracion/TemporadaForm";

export default function NuevaTemporadaPage() {
  return (
    <div className="space-y-6">
      <section className="panel-card rounded-[32px] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <Link
              href="/configuracion/temporadas"
              className="inline-flex items-center gap-1 text-sm text-zinc-400 transition-colors hover:text-[#8cff59]"
            >
              {"<-"} Temporadas
            </Link>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">
                Alta de proyeccion
              </p>
              <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-white">
                Nueva temporada
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">
                Marca una ventana de negocio para que el dashboard y la lectura del equipo no
                dependan de interpretaciones. La temporada ordena el pulso de la operación.
              </p>
            </div>
          </div>

          <div className="rounded-[24px] bg-zinc-950/80 px-4 py-3 ring-1 ring-zinc-800">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Guia rapida</p>
            <p className="mt-2 text-sm text-zinc-300">
              Nombre, fechas y proyeccion de ritmo. Si no hay cierre, el periodo sigue abierto.
            </p>
          </div>
        </div>
      </section>

      <section className="panel-card rounded-[32px] p-5 sm:p-6">
        <TemporadaForm
          action={crearTemporada}
          submitLabel="Crear temporada"
          cancelHref="/configuracion/temporadas"
        />
      </section>
    </div>
  );
}
