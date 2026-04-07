import { db } from "@/db";
import { mediosPago } from "@/db/schema";
import ToggleActivoButton from "@/components/configuracion/ToggleActivoButton";
import Link from "next/link";
import { toggleActivoMedioPago } from "./actions";

function formatComision(val: string | null) {
  if (!val || Number(val) === 0) return null;
  return `${Number(val).toFixed(2).replace(/\.00$/, "")}%`;
}

function initials(name: string | null) {
  const parts = (name ?? "MP")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "");
  return parts.join("") || "MP";
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-[22px] bg-white/6 px-4 py-4 ring-1 ring-white/8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-400">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-white">{value}</p>
      <p className="mt-2 text-xs text-zinc-400">{hint}</p>
    </div>
  );
}

export default async function MediosDePagoPage() {
  const lista = await db.select().from(mediosPago).orderBy(mediosPago.nombre);
  const activos = lista.filter((medio) => medio.activo ?? true).length;
  const conComision = lista.filter(
    (medio) => Boolean(medio.comisionPorcentaje && Number(medio.comisionPorcentaje) > 0)
  );
  const promedioComision =
    conComision.length > 0
      ? conComision.reduce((acc, medio) => acc + Number(medio.comisionPorcentaje ?? 0), 0) /
        conComision.length
      : 0;

  return (
    <main className="space-y-6">
      <section className="overflow-hidden rounded-[30px] border border-zinc-800 bg-zinc-950 shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
        <div className="bg-[radial-gradient(circle_at_top_right,_rgba(140,255,89,0.16),_transparent_34%),radial-gradient(circle_at_bottom_left,_rgba(255,255,255,0.04),_transparent_30%)] p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-400">
                Configuracion financiera
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
                Medios de pago
              </h1>
              <p className="mt-3 max-w-xl text-sm text-zinc-400">
                Ordena comisiones, netos y estados de activacion para que caja y cierres lean
                siempre el mismo dato.
              </p>
            </div>

            <Link
              href="/configuracion/medios-de-pago/nuevo"
              className="neon-button inline-flex min-h-[52px] items-center justify-center rounded-2xl px-5 text-sm font-semibold transition-colors"
            >
              + Nuevo medio
            </Link>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Totales" value={`${lista.length}`} hint="Medios cargados" />
            <MetricCard label="Activos" value={`${activos}`} hint="Listos para cobrar" />
            <MetricCard
              label="Con comision"
              value={`${conComision.length}`}
              hint="Impactan el neto"
            />
            <MetricCard
              label="Prom. comision"
              value={
                promedioComision > 0
                  ? `${promedioComision.toFixed(2).replace(/\.00$/, "")}%`
                  : "0%"
              }
              hint="Solo entre los que cobran fee"
            />
          </div>
        </div>
      </section>

      {lista.length === 0 ? (
        <div className="panel-card rounded-[28px] p-8 text-center">
          <p className="text-zinc-400">No hay medios de pago cargados todavia.</p>
          <Link
            href="/configuracion/medios-de-pago/nuevo"
            className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-zinc-800 px-4 text-sm font-medium text-white transition hover:bg-zinc-700"
          >
            Crear el primero
          </Link>
        </div>
      ) : (
        <section className="grid gap-4 xl:grid-cols-2">
          {lista.map((mp) => {
            const comision = formatComision(mp.comisionPorcentaje);
            const activo = mp.activo ?? true;

            return (
              <article
                key={mp.id}
                className={`overflow-hidden rounded-[26px] border p-5 transition ${
                  activo
                    ? "border-zinc-800 bg-zinc-900/80 hover:-translate-y-0.5 hover:border-zinc-700"
                    : "border-zinc-800 bg-zinc-900/50 opacity-80"
                }`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 flex-1 gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-800 text-sm font-semibold text-white">
                      {initials(mp.nombre)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold tracking-tight text-white">
                          {mp.nombre}
                        </h2>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            activo
                              ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                              : "bg-zinc-800 text-zinc-400 ring-1 ring-zinc-700"
                          }`}
                        >
                          {activo ? "Activo" : "Inactivo"}
                        </span>
                        {comision ? (
                          <span className="rounded-full bg-white/8 px-2.5 py-1 text-xs font-semibold text-zinc-200 ring-1 ring-white/10">
                            Comision {comision}
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-400/20">
                            Cobro limpio
                          </span>
                        )}
                      </div>

                      <p className="mt-2 text-sm text-zinc-400">
                        {comision
                          ? `Descuenta ${comision} sobre el cobro para reflejar el neto real.`
                          : "Entra limpio a caja y no descuenta comision."}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:min-w-[180px]">
                    <Link
                      href={`/configuracion/medios-de-pago/${mp.id}/editar`}
                      className="inline-flex min-h-[46px] items-center justify-center rounded-2xl bg-zinc-950 px-4 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800"
                    >
                      Editar
                    </Link>
                    <ToggleActivoButton
                      id={mp.id}
                      activo={activo}
                      toggleAction={toggleActivoMedioPago}
                    />
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
