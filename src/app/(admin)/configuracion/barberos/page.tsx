import { db } from "@/db";
import { barberos } from "@/db/schema";
import { formatARS } from "@/lib/format";
import Link from "next/link";

function formatPct(value: string | null) {
  if (!value) return "—";
  return `${Number(value).toFixed(0)}%`;
}

function modeloLabel(tipo: string | null) {
  if (tipo === "hibrido") return "Hibrido";
  if (tipo === "variable") return "Variable";
  if (tipo === "fijo") return "Fijo";
  return "—";
}

function publicLink(slug: string | null) {
  return slug ? `/reservar/${slug}` : "Sin slug";
}

function initials(name: string | null) {
  const parts = (name ?? "Barbero")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "");
  return parts.join("") || "B";
}

export default async function BarberosPage() {
  const lista = await db.select().from(barberos).orderBy(barberos.nombre);

  return (
    <div className="space-y-6">
      <section className="panel-card rounded-[28px] p-6 sm:p-7">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="eyebrow">Configuracion / Barberos</p>
            <h2 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Barberos
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-zinc-400">
              Cada perfil define comision, modelo y defaults de caja. La activacion se gestiona
              desde la ficha para evitar toques accidentales.
            </p>
          </div>

          <Link
            href="/configuracion/barberos/nuevo"
            className="neon-button inline-flex min-h-[52px] items-center justify-center rounded-2xl px-5 text-sm font-semibold transition-colors"
          >
            + Nuevo barbero
          </Link>
        </div>

      </section>

      {lista.length === 0 ? (
        <div className="panel-card rounded-[28px] p-8 text-center">
          <p className="text-zinc-400">No hay barberos cargados todavia.</p>
          <Link
            href="/configuracion/barberos/nuevo"
            className="mt-4 inline-block text-sm font-semibold text-[#8cff59]"
          >
            Crear el primero
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {lista.map((barbero) => (
            <article
              key={barbero.id}
              className={`rounded-[28px] border bg-zinc-900 p-5 ${
                !barbero.activo ? "border-zinc-800 opacity-80" : "border-zinc-800"
              }`}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 flex-1 gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-sm font-bold text-white">
                    {initials(barbero.nombre)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-xl font-semibold tracking-tight text-white">
                        {barbero.nombre}
                      </span>
                      {!barbero.activo ? (
                        <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-semibold text-zinc-400">
                          Inactivo
                        </span>
                      ) : null}
                      <span className="rounded-full border border-[#8cff59]/20 bg-[#8cff59]/10 px-2 py-0.5 text-xs capitalize text-[#d8ffc7]">
                        {barbero.rol}
                      </span>
                    </div>

                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <InfoChip label="Modelo" value={modeloLabel(barbero.tipoModelo)} />
                      <InfoChip label="Comision" value={formatPct(barbero.porcentajeComision)} />
                      <InfoChip
                        label="Reserva"
                        value={barbero.publicReservaActiva ? "Publica" : "Interna"}
                      />
                      <InfoChip label="Link" value={publicLink(barbero.publicSlug)} />
                    </div>

                    {barbero.publicReservaActiva && barbero.publicReservaPasswordHash ? (
                      <p className="mt-3 text-xs text-zinc-400">Reserva protegida por clave.</p>
                    ) : null}
                  </div>
                </div>

                <Link
                  href={`/configuracion/barberos/${barbero.id}/editar`}
                  className="inline-flex min-h-[46px] shrink-0 items-center justify-center rounded-2xl bg-zinc-950 px-4 py-2 text-sm font-semibold text-zinc-300 transition-colors hover:bg-zinc-800"
                >
                  Editar
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-zinc-800 bg-zinc-950/60 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
