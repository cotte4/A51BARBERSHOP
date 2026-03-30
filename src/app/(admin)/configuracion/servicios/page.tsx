import { db } from "@/db";
import { servicios, serviciosPreciosHistorial, serviciosAdicionales } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { toggleActivoServicio } from "./actions";
import ToggleActivoButton from "@/components/configuracion/ToggleActivoButton";

function formatARS(val: string | null | undefined) {
  if (!val) return "-";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(Number(val));
}

function getServicioAccent(nombre: string) {
  const normalized = nombre.toLowerCase();

  if (normalized.includes("corte")) return { icon: "CT", tone: "bg-stone-900 text-white" };
  if (normalized.includes("barba")) return { icon: "BR", tone: "bg-amber-100 text-amber-900" };
  if (normalized.includes("color")) return { icon: "CL", tone: "bg-rose-100 text-rose-900" };
  if (normalized.includes("lavado")) return { icon: "LV", tone: "bg-sky-100 text-sky-900" };
  return { icon: "SV", tone: "bg-emerald-100 text-emerald-900" };
}

export default async function ServiciosPage() {
  const lista = await db.select().from(servicios).orderBy(servicios.nombre);

  const serviciosConDetalle = await Promise.all(
    lista.map(async (servicio) => {
      const adicionales = await db
        .select()
        .from(serviciosAdicionales)
        .where(eq(serviciosAdicionales.servicioId, servicio.id));

      const historial = await db
        .select()
        .from(serviciosPreciosHistorial)
        .where(eq(serviciosPreciosHistorial.servicioId, servicio.id))
        .orderBy(desc(serviciosPreciosHistorial.vigenteDesdе))
        .limit(1);

      return { ...servicio, adicionales, ultimoPrecio: historial[0] ?? null };
    })
  );

  const activos = serviciosConDetalle.filter((servicio) => servicio.activo ?? true).length;

  return (
    <main className="space-y-6">
      <section className="overflow-hidden rounded-[30px] bg-stone-950 text-stone-50 shadow-[0_24px_80px_rgba(28,25,23,0.18)]">
        <div className="bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.22),_transparent_34%),radial-gradient(circle_at_bottom_left,_rgba(245,158,11,0.18),_transparent_30%)] p-6 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-300">
                Configuracion
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight">Servicios</h1>
              <p className="mt-3 text-sm text-stone-300">
                Organiza precios, adicionales y disponibilidad con una vista mas clara y accionable,
                sin caer en un CRUD plano.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="inline-flex min-h-[36px] items-center rounded-full bg-white/10 px-3 text-sm text-stone-200 ring-1 ring-white/10">
                  {serviciosConDetalle.length} servicios totales
                </span>
                <span className="inline-flex min-h-[36px] items-center rounded-full bg-emerald-400 px-3 text-sm font-medium text-emerald-950">
                  {activos} activos
                </span>
              </div>
            </div>

            <Link
              href="/configuracion/servicios/nuevo"
              className="inline-flex min-h-[52px] items-center justify-center rounded-2xl bg-emerald-400 px-5 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-300"
            >
              + Nuevo servicio
            </Link>
          </div>
        </div>
      </section>

      {serviciosConDetalle.length === 0 ? (
        <section className="rounded-[28px] border border-stone-200 bg-white p-10 text-center shadow-sm">
          <p className="text-stone-500">No hay servicios cargados todavia.</p>
          <Link
            href="/configuracion/servicios/nuevo"
            className="mt-4 inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-stone-900 px-5 text-sm font-medium text-white transition hover:bg-stone-700"
          >
            Crear el primero
          </Link>
        </section>
      ) : (
        <section className="grid gap-4 xl:grid-cols-2">
          {serviciosConDetalle.map((servicio) => {
            const accent = getServicioAccent(servicio.nombre);
            const isActive = servicio.activo ?? true;

            return (
              <article
                key={servicio.id}
                className={`group relative overflow-hidden rounded-[28px] border bg-white p-5 shadow-sm transition ${
                  isActive
                    ? "border-stone-200 hover:-translate-y-0.5 hover:shadow-md"
                    : "border-stone-200 opacity-80"
                }`}
              >
                <Link
                  href={`/configuracion/servicios/${servicio.id}/editar`}
                  className="absolute inset-0 z-0"
                  aria-label={`Editar ${servicio.nombre}`}
                />

                <div className="relative z-10 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-semibold ${accent.tone}`}
                      >
                        {accent.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-xl font-semibold tracking-tight text-stone-950">
                            {servicio.nombre}
                          </h2>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              isActive
                                ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                : "bg-stone-100 text-stone-500 ring-1 ring-stone-200"
                            }`}
                          >
                            {isActive ? "Activo" : "Inactivo"}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-stone-500">
                          Tocá la card para editar precios, adicionales e historial.
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
                      <div className="rounded-[22px] bg-stone-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                          Precio base
                        </p>
                        <p className="mt-2 text-3xl font-semibold tracking-tight text-stone-950">
                          {formatARS(servicio.precioBase)}
                        </p>
                        <p className="mt-2 text-sm text-stone-500">
                          {servicio.adicionales.length > 0
                            ? `${servicio.adicionales.length} adicional${servicio.adicionales.length > 1 ? "es" : ""} disponible${servicio.adicionales.length > 1 ? "s" : ""}`
                            : "Sin adicionales configurados"}
                        </p>
                      </div>

                      <div className="flex min-w-[182px] flex-col gap-2">
                        <ToggleActivoButton
                          id={servicio.id}
                          activo={isActive}
                          toggleAction={toggleActivoServicio}
                        />
                        <Link
                          href={`/configuracion/servicios/${servicio.id}/editar`}
                          className="inline-flex min-h-[46px] items-center justify-center rounded-2xl bg-stone-100 px-4 text-sm font-medium text-stone-700 transition hover:bg-stone-200"
                        >
                          Editar servicio
                        </Link>
                      </div>
                    </div>

                    {servicio.adicionales.length > 0 ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {servicio.adicionales.map((adicional) => (
                          <span
                            key={adicional.id}
                            className="rounded-full bg-white px-3 py-2 text-sm text-stone-700 ring-1 ring-stone-200"
                          >
                            {adicional.nombre} +{formatARS(adicional.precioExtra)}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}
