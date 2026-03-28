import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { servicios, serviciosPreciosHistorial } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

interface HistorialServicioPageProps {
  params: Promise<{ id: string }>;
}

function formatARS(val: string | null | undefined) {
  if (!val) return "—";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(Number(val));
}

function formatFecha(fecha: string) {
  return new Date(fecha).toLocaleDateString("es-AR", { timeZone: "UTC" });
}

export default async function HistorialServicioPage({
  params,
}: HistorialServicioPageProps) {
  const { id } = await params;

  const [servicio] = await db
    .select()
    .from(servicios)
    .where(eq(servicios.id, id))
    .limit(1);

  if (!servicio) {
    notFound();
  }

  const historial = await db
    .select()
    .from(serviciosPreciosHistorial)
    .where(eq(serviciosPreciosHistorial.servicioId, id))
    .orderBy(desc(serviciosPreciosHistorial.vigenteDesdе));

  return (
    <div className="max-w-lg">
      {/* Breadcrumb */}
      <Link
        href={`/configuracion/servicios/${id}/editar`}
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-4"
      >
        ← {servicio.nombre}
      </Link>

      <h2 className="text-lg font-semibold text-gray-900 mb-6">
        Historial de precios — {servicio.nombre}
      </h2>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        {historial.length === 0 ? (
          <p className="text-sm text-gray-400">Sin historial de precios.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-gray-100">
            {historial.map((h) => (
              <li key={h.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-base font-semibold text-gray-900">
                      {formatARS(h.precio)}
                    </span>
                    {h.motivo && (
                      <span className="text-sm text-gray-500">{h.motivo}</span>
                    )}
                  </div>
                  <span className="text-sm text-gray-400 whitespace-nowrap">
                    {formatFecha(h.vigenteDesdе)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
