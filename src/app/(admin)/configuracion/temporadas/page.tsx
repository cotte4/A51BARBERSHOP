import { db } from "@/db";
import { temporadas } from "@/db/schema";
import { desc } from "drizzle-orm";
import Link from "next/link";
import { formatFecha } from "@/lib/fecha";
import TemporadaDeleteButton from "./_TemporadaDeleteButton";


function temporadaEstado(
  temporada: {
    fechaInicio: string | null;
    fechaFin: string | null;
  },
  today: string
) {
  if (temporada.fechaInicio && temporada.fechaInicio > today) return "Programada";
  if (temporada.fechaFin && temporada.fechaFin < today) return "Finalizada";
  if (temporada.fechaInicio && (!temporada.fechaFin || temporada.fechaFin >= today)) {
    return "Activa";
  }
  return "Pendiente";
}

export default async function TemporadasPage() {
  const lista = await db.select().from(temporadas).orderBy(desc(temporadas.fechaInicio));
  const today = new Date().toISOString().split("T")[0];

  const activaActual = lista.find(
    (temporada) =>
      temporada.fechaInicio &&
      temporada.fechaInicio <= today &&
      (!temporada.fechaFin || temporada.fechaFin >= today)
  );
  const programadas = lista.filter((temporada) => temporada.fechaInicio && temporada.fechaInicio > today);
  const conProyeccion = lista.filter(
    (temporada) =>
      temporada.cortesDiaProyectados !== null || temporada.precioBaseProyectado !== null
  ).length;

  return (
    <div className="space-y-6">
      <section className="panel-card rounded-[32px] p-6">
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-400">
              Configuracion
            </p>
            <div className="space-y-3">
              <h1 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Temporadas
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-zinc-300 sm:text-base">
                Las temporadas ordenan la lectura del negocio por etapas. Acá se proyecta el
                ritmo, se anticipan cambios y se deja claro qué ventana está activa, cuál viene y
                cuál ya quedó cerrada.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Metric label="Temporadas" value={`${lista.length}`} />
              <Metric label="Activa" value={activaActual ? "En curso" : "Sin activa"} tone="accent" />
              <Metric label="Programadas" value={`${programadas.length}`} />
              <Metric label="Con proyeccion" value={`${conProyeccion}`} />
            </div>
          </div>

          <div className="rounded-[28px] bg-zinc-950/80 p-5 ring-1 ring-zinc-800">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Lectura rapida
            </p>
            <div className="mt-4 space-y-3">
              <div className="rounded-[22px] bg-white/5 p-4 ring-1 ring-white/10">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">Temporada actual</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {activaActual?.nombre ?? "Ninguna activa"}
                </p>
                <p className="mt-2 text-sm text-zinc-400">
                  {activaActual
                    ? `${formatFecha(activaActual.fechaInicio)} -> ${formatFecha(
                        activaActual.fechaFin
                      )}`
                    : "Definila para alinear la lectura del dashboard."}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href="/configuracion/temporadas/nuevo"
                  className="neon-button inline-flex min-h-[48px] items-center justify-center rounded-2xl px-4 text-sm font-semibold"
                >
                  + Nueva temporada
                </Link>
                <span className="inline-flex min-h-[48px] items-center rounded-2xl bg-zinc-900 px-4 text-sm text-zinc-300 ring-1 ring-zinc-800">
                  {programadas.length} proximas
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {lista.length === 0 ? (
        <section className="panel-card rounded-[28px] p-8 text-center">
          <p className="text-zinc-400">No hay temporadas cargadas todavia.</p>
          <Link
            href="/configuracion/temporadas/nuevo"
            className="neon-button mt-4 inline-flex min-h-[48px] items-center justify-center rounded-[20px] px-5 text-sm font-medium transition"
          >
            Crear la primera
          </Link>
        </section>
      ) : (
        <section className="grid gap-4 xl:grid-cols-2">
          {lista.map((temporada) => {
            const status = temporadaEstado(temporada, today);
            const isActive = status === "Activa";

            return (
              <article
                key={temporada.id}
                className={`rounded-[28px] border p-5 transition ${
                  isActive
                    ? "border-[#8cff59]/20 bg-[#8cff59]/10"
                    : "border-zinc-800 bg-zinc-900"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-xl font-semibold tracking-tight text-white">
                        {temporada.nombre ?? "Sin nombre"}
                      </h2>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          isActive
                            ? "bg-[#8cff59] text-zinc-950"
                            : "bg-zinc-800 text-zinc-400 ring-1 ring-zinc-700"
                        }`}
                      >
                        {status}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-400">
                      {formatFecha(temporada.fechaInicio)}{" "}
                      {temporada.fechaFin ? `-> ${formatFecha(temporada.fechaFin)}` : "-> en curso"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/configuracion/temporadas/${temporada.id}/editar`}
                      className="inline-flex min-h-[44px] items-center rounded-lg bg-zinc-950 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800"
                    >
                      Editar
                    </Link>
                    <TemporadaDeleteButton id={temporada.id} />
                  </div>
                </div>

                {(temporada.cortesDiaProyectados !== null ||
                  temporada.precioBaseProyectado !== null) && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {temporada.cortesDiaProyectados !== null ? (
                      <InfoCard
                        label="Cortes por dia"
                        value={`${temporada.cortesDiaProyectados} proy.`}
                      />
                    ) : (
                      <InfoCard label="Cortes por dia" value="Sin proyeccion" />
                    )}
                    {temporada.precioBaseProyectado !== null ? (
                      <InfoCard
                        label="Precio base"
                        value={`$${Number(temporada.precioBaseProyectado).toLocaleString("es-AR")}`}
                        strong
                      />
                    ) : (
                      <InfoCard label="Precio base" value="Sin estimacion" />
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </section>
      )}
    </div>
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
      <p className={`mt-2 text-2xl font-semibold tracking-tight ${tone === "accent" ? "text-[#8cff59]" : "text-white"}`}>
        {value}
      </p>
    </div>
  );
}

function InfoCard({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={`rounded-[20px] px-4 py-3 ring-1 ${
        strong ? "bg-[#8cff59]/10 ring-[#8cff59]/20" : "bg-zinc-950/70 ring-zinc-800"
      }`}
    >
      <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">{label}</p>
      <p className={`mt-2 text-sm font-semibold ${strong ? "text-[#8cff59]" : "text-white"}`}>
        {value}
      </p>
    </div>
  );
}
