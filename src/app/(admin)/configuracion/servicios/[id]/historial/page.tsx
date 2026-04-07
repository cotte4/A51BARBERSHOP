import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { servicios, serviciosPreciosHistorial } from "@/db/schema";

interface HistorialServicioPageProps {
  params: Promise<{ id: string }>;
}

function formatARS(val: string | null | undefined) {
  if (!val) return "-";
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

  const ultimoCambio = historial[0] ?? null;

  return (
    <div className="space-y-6">
      <section className="panel-card rounded-[32px] p-6">
        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr] xl:items-start">
          <div className="space-y-4">
            <Link
              href={`/configuracion/servicios/${id}/editar`}
              className="inline-flex items-center gap-1 text-sm text-zinc-400 transition-colors hover:text-[#8cff59]"
            >
              {"<-"} {servicio.nombre}
            </Link>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">
                Historial de precios
              </p>
              <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-white">
                {servicio.nombre}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-300">
                El historial le da trazabilidad al precio base y evita que una correccion quede
                escondida. Aca se ve el pulso real del servicio con fecha, valor y motivo.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <SummaryCard label="Precio actual" value={formatARS(servicio.precioBase)} strong />
            <SummaryCard label="Movimientos" value={`${historial.length}`} />
            <SummaryCard
              label="Ultimo cambio"
              value={ultimoCambio ? formatFecha(ultimoCambio.vigenteDesdе) : "Sin cambios"}
            />
            <SummaryCard
              label="Estado"
              value={ultimoCambio?.motivo ? "Con motivo registrado" : "Sin motivo adicional"}
            />
          </div>
        </div>
      </section>

      {historial.length === 0 ? (
        <section className="panel-card rounded-[28px] p-8 text-center">
          <p className="text-zinc-400">Todavia no hay movimientos de precio para este servicio.</p>
          <Link
            href={`/configuracion/servicios/${id}/editar`}
            className="neon-button mt-4 inline-flex min-h-[48px] items-center justify-center rounded-[20px] px-5 text-sm font-medium transition"
          >
            Volver a editar
          </Link>
        </section>
      ) : (
        <section className="panel-card rounded-[32px] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">
                Registro
              </p>
              <h2 className="mt-2 text-xl font-semibold text-white">Linea de cambios</h2>
            </div>
            <span className="rounded-full bg-[#8cff59]/10 px-3 py-1 text-xs font-semibold text-[#8cff59] ring-1 ring-[#8cff59]/20">
              {historial.length} evento{historial.length > 1 ? "s" : ""}
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {historial.map((h, index) => {
              const isLatest = index === 0;
              return (
                <article
                  key={h.id}
                  className={`rounded-[24px] p-4 ring-1 ${
                    isLatest
                      ? "bg-[#8cff59]/10 ring-[#8cff59]/20"
                      : "bg-zinc-950/80 ring-zinc-800"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-2xl font-semibold tracking-tight text-white">
                          {formatARS(h.precio)}
                        </p>
                        {isLatest ? (
                          <span className="rounded-full bg-[#8cff59] px-3 py-1 text-xs font-semibold text-zinc-950">
                            Actual
                          </span>
                        ) : null}
                      </div>
                      <p className="text-sm uppercase tracking-[0.18em] text-zinc-400">
                        Vigente desde {formatFecha(h.vigenteDesdе)}
                      </p>
                    </div>

                    <p className="text-sm text-zinc-400">{formatFecha(h.vigenteDesdе)}</p>
                  </div>

                  {h.motivo ? (
                    <p className="mt-3 text-sm leading-6 text-zinc-300">{h.motivo}</p>
                  ) : (
                    <p className="mt-3 text-sm text-zinc-500">Sin motivo registrado.</p>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function SummaryCard({
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
      className={`rounded-[22px] p-4 ring-1 ${
        strong ? "bg-[#8cff59]/10 ring-[#8cff59]/20" : "bg-white/5 ring-white/10"
      }`}
    >
      <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">{label}</p>
      <p className={`mt-2 text-lg font-semibold ${strong ? "text-[#8cff59]" : "text-white"}`}>
        {value}
      </p>
    </div>
  );
}
