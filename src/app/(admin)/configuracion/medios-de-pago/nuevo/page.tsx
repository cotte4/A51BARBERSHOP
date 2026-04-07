import Link from "next/link";
import { crearMedioPago } from "../actions";
import MedioPagoForm from "@/components/configuracion/MedioPagoForm";

export default function NuevoMedioPagoPage() {
  return (
    <main className="space-y-6">
      <section className="panel-card rounded-[30px] p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <Link
              href="/configuracion/medios-de-pago"
              className="text-sm text-zinc-400 transition-colors hover:text-[#8cff59]"
            >
              &lt;- Medios de pago
            </Link>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
              Nuevo medio de pago
            </h1>
            <p className="mt-3 max-w-xl text-sm text-zinc-400">
              Definilo una sola vez para que caja, cierres y netos lean la misma comision.
            </p>
          </div>
          <div className="rounded-[22px] bg-zinc-900 px-4 py-3 text-sm text-zinc-300 ring-1 ring-zinc-700">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Lectura rapida</p>
            <p className="mt-2">Si tiene comision, descuenta del neto automaticamente.</p>
          </div>
        </div>
      </section>

      <div className="panel-card rounded-[28px] p-5">
        <MedioPagoForm
          action={crearMedioPago}
          submitLabel="Crear medio de pago"
          cancelHref="/configuracion/medios-de-pago"
        />
      </div>
    </main>
  );
}
