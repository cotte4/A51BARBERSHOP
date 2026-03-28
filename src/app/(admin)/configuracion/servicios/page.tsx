import { db } from "@/db";
import { servicios, serviciosPreciosHistorial, serviciosAdicionales } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { toggleActivoServicio } from "./actions";
import ToggleActivoButton from "@/components/configuracion/ToggleActivoButton";

function formatARS(val: string | null | undefined) {
  if (!val) return "—";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(Number(val));
}

export default async function ServiciosPage() {
  const lista = await db.select().from(servicios).orderBy(servicios.nombre);

  // Cargar adicionales y último precio para cada servicio
  const serviciosConDetalle = await Promise.all(
    lista.map(async (s) => {
      const adicionales = await db
        .select()
        .from(serviciosAdicionales)
        .where(eq(serviciosAdicionales.servicioId, s.id));

      const historial = await db
        .select()
        .from(serviciosPreciosHistorial)
        .where(eq(serviciosPreciosHistorial.servicioId, s.id))
        .orderBy(desc(serviciosPreciosHistorial.vigenteDesdе))
        .limit(1);

      return { ...s, adicionales, ultimoPrecio: historial[0] ?? null };
    })
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Servicios</h2>
        <Link
          href="/configuracion/servicios/nuevo"
          className="min-h-[44px] inline-flex items-center bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
        >
          + Nuevo
        </Link>
      </div>

      {serviciosConDetalle.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500">No hay servicios cargados todavía.</p>
          <Link
            href="/configuracion/servicios/nuevo"
            className="mt-4 inline-block text-sm text-gray-900 underline"
          >
            Crear el primero
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {serviciosConDetalle.map((s) => (
            <div
              key={s.id}
              className={`bg-white rounded-xl border p-4 ${
                !s.activo ? "opacity-60 border-gray-200" : "border-gray-200"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900">{s.nombre}</span>
                    {!s.activo && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                        Inactivo
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-sm text-gray-500 flex flex-wrap gap-x-4 gap-y-1">
                    <span className="text-base font-medium text-gray-900">
                      {formatARS(s.precioBase)}
                    </span>
                    {s.adicionales.length > 0 && (
                      <span className="text-gray-400">
                        {s.adicionales.length} adicional{s.adicionales.length > 1 ? "es" : ""}
                        {" "}(
                        {s.adicionales.map((a) => `${a.nombre} +${formatARS(a.precioExtra)}`).join(", ")}
                        )
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link
                    href={`/configuracion/servicios/${s.id}/editar`}
                    className="min-h-[44px] inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors"
                  >
                    Editar
                  </Link>
                  <ToggleActivoButton
                    id={s.id}
                    activo={s.activo ?? true}
                    toggleAction={toggleActivoServicio}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
