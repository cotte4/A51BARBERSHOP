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
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/configuracion/barberos"
          className="text-gray-400 hover:text-gray-600 text-sm"
        >
          ← Barberos
        </Link>
      </div>
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Nuevo barbero</h2>
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <BarberoForm
          action={crearBarbero}
          serviciosOptions={serviciosActivos}
          mediosPagoOptions={mediosPagoActivos}
          submitLabel="Crear barbero"
        />
      </div>
    </div>
  );
}
