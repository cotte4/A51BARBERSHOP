import Link from "next/link";
import ServicioForm from "@/components/configuracion/ServicioForm";
import { crearServicio } from "../actions";

export default function NuevoServicioPage() {
  return (
    <div className="space-y-6">
      <section className="panel-card rounded-[32px] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <Link
              href="/configuracion/servicios"
              className="inline-flex items-center gap-1 text-sm text-zinc-400 transition-colors hover:text-[#8cff59]"
            >
              {"<-"} Servicios
            </Link>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">
                Alta operativa
              </p>
              <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-white">
                Nuevo servicio
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">
                Definilo una sola vez y va a alimentar caja, turnos y liquidaciones. Cuanto más
                claro quede ahora, menos ruido vamos a tener después en la operación.
              </p>
            </div>
          </div>

          <div className="rounded-[24px] bg-zinc-950/80 px-4 py-3 ring-1 ring-zinc-800">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Guia rapida</p>
            <p className="mt-2 text-sm text-zinc-300">
              Nombre, precio y duración. Lo demás se apoya sobre esta base.
            </p>
          </div>
        </div>
      </section>

      <section className="panel-card rounded-[32px] p-5 sm:p-6">
        <ServicioForm
          action={crearServicio}
          submitLabel="Crear servicio"
          cancelHref="/configuracion/servicios"
        />
      </section>
    </div>
  );
}
