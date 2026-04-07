import { db } from "@/db";
import {
  servicios,
  serviciosAdicionales,
  serviciosPreciosHistorial,
} from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import Link from "next/link";
import AlienSignalPanel from "@/components/branding/AlienSignalPanel";
import { toggleActivoServicio } from "./actions";
import ToggleActivoButton from "@/components/configuracion/ToggleActivoButton";

function formatARS(val: string | null | undefined) {
  if (!val) return "$ 0";
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
  const inactivos = serviciosConDetalle.length - activos;
  const totalAdicionales = serviciosConDetalle.reduce(
    (total, servicio) => total + servicio.adicionales.length,
    0
  );
  const precioPromedio =
    serviciosConDetalle.length > 0
      ? serviciosConDetalle.reduce(
          (total, servicio) => total + Number(servicio.precioBase ?? 0),
          0
        ) / serviciosConDetalle.length
      : 0;

  return (
    <main className="space-y-6">
      <section className="panel-card overflow-hidden rounded-[32px] border border-zinc-800 p-6">
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-400">
              Configuracion
            </p>
            <div className="space-y-3">
              <h1 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Servicios
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-zinc-300 sm:text-base">
                Acá se define la oferta real de caja: precios, duración, estado y adicionales.
                La lectura tiene que ser directa, para que el barbero vea qué se vende y qué
                conviene ajustar sin abrir diez pantallas.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Metric label="Servicios" value={`${serviciosConDetalle.length}`} />
              <Metric label="Activos" value={`${activos}`} tone="accent" />
              <Metric label="Inactivos" value={`${inactivos}`} />
              <Metric label="Precio promedio" value={formatARS(precioPromedio.toFixed(2))} />
            </div>
          </div>

          <div className="rounded-[28px] bg-zinc-950/80 p-5 ring-1 ring-zinc-800">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Atajo operativo
            </p>
            <div className="mt-4 space-y-3">
              <div className="rounded-[22px] bg-white/5 p-4 ring-1 ring-white/10">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Estado</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {activos > 0 ? "Oferta disponible para caja" : "Todavia no hay servicios activos"}
                </p>
                <p className="mt-2 text-sm text-zinc-400">
                  Cada cambio de precio deja rastro en historial y alimenta liquidaciones.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href="/configuracion/servicios/nuevo"
                  className="neon-button inline-flex min-h-[48px] items-center justify-center rounded-2xl px-4 text-sm font-semibold"
                >
                  + Nuevo servicio
                </Link>
                <span className="inline-flex min-h-[48px] items-center rounded-2xl bg-zinc-900 px-4 text-sm text-zinc-300 ring-1 ring-zinc-800">
                  {totalAdicionales} adicionales cargados
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-5">
          <AlienSignalPanel
            eyebrow="Cabina de oferta"
            title="Senal de servicios"
            detail="La nave junta precio, duración y extras para que la carta del local no pierda claridad ni trazabilidad."
            badges={[
              `${serviciosConDetalle.length} servicios`,
              `${totalAdicionales} adicionales`,
              `${activos} activos`,
            ]}
            tone="fuchsia"
          />
        </div>
      </section>

      {serviciosConDetalle.length === 0 ? (
        <section className="panel-card rounded-[28px] p-10 text-center">
          <p className="text-zinc-400">No hay servicios cargados todavia.</p>
          <Link
            href="/configuracion/servicios/nuevo"
            className="neon-button mt-4 inline-flex min-h-[48px] items-center justify-center rounded-[20px] px-5 text-sm font-medium transition"
          >
            Crear el primero
          </Link>
        </section>
      ) : (
        <section className="grid gap-4 xl:grid-cols-2">
          {serviciosConDetalle.map((servicio) => {
            const accent = getServicioAccent(servicio.nombre);
            const isActive = servicio.activo ?? true;
            const extrasCount = servicio.adicionales.length;

            return (
              <article
                key={servicio.id}
                className={`group relative overflow-hidden rounded-[28px] border p-5 transition ${
                  isActive
                    ? "border-zinc-800 bg-zinc-900 hover:-translate-y-0.5 hover:border-zinc-700"
                    : "border-zinc-800 bg-zinc-900/70 opacity-80"
                }`}
              >
                <Link
                  href={`/configuracion/servicios/${servicio.id}/editar`}
                  className="absolute inset-0 z-0"
                  aria-label={`Editar ${servicio.nombre}`}
                />

                <div className="relative z-10 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-3">
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-semibold ${accent.tone}`}
                        >
                          {accent.icon}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="font-display text-xl font-semibold tracking-tight text-white">
                              {servicio.nombre}
                            </h2>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                isActive
                                  ? "bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/20"
                                  : "bg-zinc-800 text-zinc-400 ring-1 ring-zinc-700"
                              }`}
                            >
                              {isActive ? "Activo" : "Inactivo"}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-zinc-400">
                            Tocá la card para editar precio, duración, adicionales e historial.
                          </p>
                        </div>
                      </div>
                    </div>

                    <span className="rounded-full bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.18em] text-zinc-400 ring-1 ring-white/10">
                      {servicio.duracionMinutos} min
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
                    <div className="rounded-[22px] bg-zinc-950/80 p-4 ring-1 ring-zinc-800">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                        Precio base
                      </p>
                      <p className="mt-2 text-3xl font-semibold tracking-tight text-white">
                        {formatARS(servicio.precioBase)}
                      </p>
                      <p className="mt-2 text-sm text-zinc-400">
                        {extrasCount > 0
                          ? `${extrasCount} adicional${extrasCount > 1 ? "es" : ""} disponible${
                              extrasCount > 1 ? "s" : ""
                            }`
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
                        className="inline-flex min-h-[46px] items-center justify-center rounded-2xl bg-zinc-800 px-4 text-sm font-medium text-zinc-300 transition hover:bg-zinc-700"
                      >
                        Editar servicio
                      </Link>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <InfoBlock label="Lectura operativa" value="Base de caja y liquidaciones" />
                    <InfoBlock
                      label="Historial"
                      value={servicio.ultimoPrecio ? "Con trazabilidad" : "Precio inicial activo"}
                    />
                  </div>

                  {servicio.ultimoPrecio?.motivo ? (
                    <div className="rounded-[20px] bg-zinc-950/70 px-4 py-3 ring-1 ring-zinc-800">
                      <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">
                        Ultimo cambio
                      </p>
                      <p className="mt-2 text-sm text-zinc-300">
                        {servicio.ultimoPrecio.motivo}
                      </p>
                    </div>
                  ) : null}

                  {extrasCount > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {servicio.adicionales.map((adicional) => (
                        <span
                          key={adicional.id}
                          className="rounded-full bg-zinc-950 px-3 py-2 text-sm text-zinc-300 ring-1 ring-zinc-800"
                        >
                          {adicional.nombre} +{formatARS(adicional.precioExtra)}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "accent";
}) {
  return (
    <div
      className={`rounded-[22px] p-4 ring-1 ${
        tone === "accent" ? "bg-[#8cff59]/10 ring-[#8cff59]/20" : "bg-white/5 ring-white/10"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">{label}</p>
      <p
        className={`mt-2 text-2xl font-semibold tracking-tight ${
          tone === "accent" ? "text-[#8cff59]" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] bg-zinc-950/70 px-4 py-3 ring-1 ring-zinc-800">
      <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">{label}</p>
      <p className="mt-2 text-sm font-medium text-white">{value}</p>
    </div>
  );
}
