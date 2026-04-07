import { db } from "@/db";
import { mediosPago, servicios } from "@/db/schema";
import { eq } from "drizzle-orm";
import BarberoForm from "@/components/configuracion/BarberoForm";
import { crearBarbero } from "../actions";
import Link from "next/link";

export default async function NuevoBarberoPage() {
  const [serviciosActivos, mediosPagoActivos] = await Promise.all([
    db.select({ id: servicios.id, nombre: servicios.nombre }).from(servicios).where(eq(servicios.activo, true)),
    db.select({ id: mediosPago.id, nombre: mediosPago.nombre }).from(mediosPago).where(eq(mediosPago.activo, true)),
  ]);

  return (
    <div className="space-y-6">
      <section className="panel-card rounded-[28px] p-6 sm:p-7">
        <Link href="/configuracion/barberos" className="text-sm text-zinc-400 transition hover:text-[#8cff59]">
          ← Barberos
        </Link>
        <div className="mt-4 grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div className="max-w-2xl">
            <p className="eyebrow">Configuracion / Barberos</p>
            <h2 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Nuevo barbero
            </h2>
            <p className="mt-3 text-sm text-zinc-400">
              Definimos identidad, modelo y defaults de caja para que el perfil salga listo para
              operar desde el primer guardado.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-[22px] border border-zinc-800 bg-zinc-950/60 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Requisito</p>
              <p className="mt-2 text-sm font-medium text-white">Nombre, rol y modelo.</p>
            </div>
            <div className="rounded-[22px] border border-zinc-800 bg-zinc-950/60 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Salida</p>
              <p className="mt-2 text-sm font-medium text-white">
                Perfil listo para caja y liquidacion.
              </p>
            </div>
          </div>
        </div>
      </section>

      <BarberoForm
        action={crearBarbero}
        serviciosOptions={serviciosActivos}
        mediosPagoOptions={mediosPagoActivos}
        submitLabel="Crear barbero"
      />
    </div>
  );
}
