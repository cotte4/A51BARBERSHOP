import Link from "next/link";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { barberos, cierresCaja } from "@/db/schema";
import { normalizeCierreResumen, type ResumenBarberoCierre } from "@/lib/caja-finance";
import PrintButton from "./_PrintButton";

export default async function CierreDetallePage({
  params,
}: {
  params: Promise<{ fecha: string }>;
}) {
  const { fecha } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  const userRole = (session?.user as { role?: string })?.role;
  const isAdmin = userRole === "admin";
  const userId = session?.user?.id;

  const [cierre] = await db
    .select()
    .from(cierresCaja)
    .where(eq(cierresCaja.fecha, fecha))
    .limit(1);

  if (!cierre) notFound();

  const resumen = normalizeCierreResumen({
    resumenBarberos: cierre.resumenBarberos,
    totalNeto: cierre.totalNeto,
    totalProductos: cierre.totalProductos,
  });

  let barberoIdDelUsuario: string | null = null;
  if (!isAdmin && userId) {
    const [barberoDelUsuario] = await db
      .select({ id: barberos.id })
      .from(barberos)
      .where(eq(barberos.userId, userId))
      .limit(1);
    barberoIdDelUsuario = barberoDelUsuario?.id ?? null;
  }

  const resumenFiltrado: Record<string, ResumenBarberoCierre> = isAdmin
    ? resumen.barberos
    : barberoIdDelUsuario && resumen.barberos[barberoIdDelUsuario]
      ? { [barberoIdDelUsuario]: resumen.barberos[barberoIdDelUsuario] }
      : {};

  const horaCierre = cierre.cerradoEn
    ? new Intl.DateTimeFormat("es-AR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Argentina/Buenos_Aires",
      }).format(new Date(cierre.cerradoEn))
    : null;

  const summaryCards = [
    {
      eyebrow: "Estado",
      label: "Caja cerrada",
      value: horaCierre ? `A las ${horaCierre}` : "Sellada",
      helper: "El cierre ya quedo grabado y no admite nuevas ventas.",
    },
    {
      eyebrow: "Bruto",
      label: "Ingresos del dia",
      value: formatARS(cierre.totalBruto),
      helper: "Total antes de comisiones y ajustes.",
    },
    {
      eyebrow: "Neto",
      label: "Caja neta",
      value: formatARS(cierre.totalNeto),
      helper: `${formatARS(resumen.totales.cajaNetaServicios)} en servicios netos`,
    },
    {
      eyebrow: "Volumen",
      label: "Atenciones",
      value: String(cierre.cantidadAtenciones ?? 0),
      helper: Number(cierre.totalProductos ?? 0) > 0
        ? `${formatARS(cierre.totalProductos)} en productos`
        : "Sin ventas de producto",
    },
  ];

  return (
    <main className="app-shell min-h-screen px-4 py-6 pb-28">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="overflow-hidden rounded-[32px] border border-zinc-800/80 bg-[radial-gradient(circle_at_top_right,rgba(140,255,89,0.16),transparent_30%),linear-gradient(180deg,rgba(24,24,27,0.96),rgba(9,9,11,0.98))] shadow-[0_24px_80px_rgba(0,0,0,0.32)]">
          <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] lg:p-7">
            <div className="space-y-5">
              <Link
                href="/caja"
                className="inline-flex items-center text-sm font-medium text-zinc-500 transition hover:text-zinc-200"
              >
                {"<- Caja"}
              </Link>

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-zinc-500">
                  Cierre ejecutado
                </p>
                <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl capitalize">
                  Cierre de caja - {formatFechaLarga(fecha)}
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-zinc-400">
                  Este resumen deja claro lo que entro, lo que quedo neto y como se distribuyo el
                  dia. Ideal para imprimir o revisar rapido sin leer toda la planilla.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs font-semibold text-zinc-300">
                  {cierre.cantidadAtenciones ?? 0} atenciones
                </span>
                {Number(cierre.totalProductos ?? 0) > 0 ? (
                  <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs font-semibold text-zinc-300">
                    {formatARS(cierre.totalProductos)} en productos
                  </span>
                ) : null}
                <span className="rounded-full border border-[#8cff59]/25 bg-[#8cff59]/10 px-3 py-1 text-xs font-semibold text-[#8cff59]">
                  Neto {formatARS(cierre.totalNeto)}
                </span>
              </div>
            </div>

            <aside className="space-y-3">
              <div className="rounded-[24px] border border-zinc-800 bg-zinc-950/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
                  Caja cerrada
                </p>
                <p className="mt-2 text-3xl font-bold text-white">
                  {horaCierre ? `A las ${horaCierre}` : "Registrada"}
                </p>
                <p className="mt-1 text-sm text-zinc-400">
                  {isAdmin ? "Incluye vista completa y PDF." : "Vista filtrada por tu cuenta."}
                </p>
              </div>

              <div className="rounded-[24px] border border-zinc-800 bg-zinc-950/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
                  Acciones
                </p>
                <div className="mt-3 flex flex-col gap-2">
                  <PrintButton />
                  {isAdmin ? (
                    <a
                      href={`/api/pdf/cierre/${fecha}`}
                      download
                      className="min-h-[44px] inline-flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800"
                    >
                      Descargar PDF
                    </a>
                  ) : null}
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <div key={card.label} className="panel-card rounded-[26px] p-5">
              <p className="eyebrow text-xs font-semibold">{card.eyebrow}</p>
              <p className="mt-3 text-sm text-zinc-400">{card.label}</p>
              <p className="font-display mt-2 text-2xl font-semibold tracking-tight text-white">
                {card.value}
              </p>
              <p className="mt-2 text-sm text-zinc-400">{card.helper}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <div className="space-y-5">
            <section className="panel-card rounded-[30px] p-5">
              <h2 className="font-display text-2xl font-semibold text-white">Totales del dia</h2>
              <div className="mt-5 flex flex-col gap-2">
                <Row label="Total bruto del dia" value={formatARS(cierre.totalBruto)} />
                {Number(cierre.totalComisionesMedios ?? 0) > 0 ? (
                  <Row
                    label="Comisiones medios de pago"
                    value={`-${formatARS(cierre.totalComisionesMedios)}`}
                    tone="text-red-300"
                  />
                ) : null}
                <Row label="Caja neta del dia" value={formatARS(cierre.totalNeto)} strong />
                <Row
                  label="Servicios netos"
                  value={formatARS(resumen.totales.cajaNetaServicios)}
                  tone="text-white"
                />
                {Number(cierre.totalProductos ?? 0) > 0 ? (
                  <Row label="Productos brutos" value={formatARS(cierre.totalProductos)} />
                ) : null}
              </div>
            </section>

            {Object.keys(resumenFiltrado).length > 0 ? (
              <section className="panel-card rounded-[30px] p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="eyebrow text-xs font-semibold">Por barbero</p>
                    <h2 className="font-display mt-2 text-2xl font-semibold text-white">
                      Reparto del dia
                    </h2>
                    <p className="mt-1 text-sm text-zinc-400">
                      Lo que dejo cada barbero en bruto, cortes y comision.
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 lg:grid-cols-2">
                  {Object.values(resumenFiltrado).map((barbero) => (
                    <article
                      key={barbero.nombre}
                      className="rounded-[24px] border border-zinc-800 bg-zinc-950/25 p-4 text-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold text-white">{barbero.nombre}</p>
                          <p className="mt-1 text-zinc-400">
                            {barbero.cortes} {barbero.cortes === 1 ? "corte" : "cortes"} hoy
                          </p>
                        </div>
                        <span className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs font-semibold text-zinc-300">
                          {formatARS(barbero.totalBruto)}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-2 text-xs text-zinc-400">
                        <p>Comision: {formatARS(barbero.comisionCalculada)}</p>
                        {barbero.aporteCasaServicios > 0 ? (
                          <p>Aporte casa por servicios: {formatARS(barbero.aporteCasaServicios)}</p>
                        ) : null}
                        {barbero.ingresoNetoServicios > 0 ? (
                          <p>Ingreso neto propio: {formatARS(barbero.ingresoNetoServicios)}</p>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <aside className="space-y-4">
            <section className="rounded-[28px] border border-zinc-800 bg-zinc-900 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">
                Resumen ejecutivo
              </p>
              <div className="mt-4 grid gap-3">
                <ExecRow label="Caja neta del dia" value={formatARS(resumen.totales.cajaNetaDia)} />
                <ExecRow
                  label="Servicios netos"
                  value={formatARS(resumen.totales.cajaNetaServicios)}
                />
                <ExecRow
                  label="Productos netos"
                  value={formatARS(resumen.totales.cajaNetaProductos)}
                />
                {isAdmin ? (
                  <ExecRow
                    label="Aporte economico casa"
                    value={formatARS(resumen.totales.aporteEconomicoCasaDia)}
                  />
                ) : null}
              </div>
            </section>
          </aside>
        </section>

        <div className="text-sm text-zinc-400">
          Atenciones: <strong className="text-white">{cierre.cantidadAtenciones ?? 0}</strong>
        </div>
      </div>

      <style>{`
        @media print {
          body { background: white; }
          @page { margin: 1.5cm; }
        }
      `}</style>
    </main>
  );
}

function Row({
  label,
  value,
  tone = "text-zinc-400",
  strong = false,
}: {
  label: string;
  value: string;
  tone?: string;
  strong?: boolean;
}) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-zinc-400">{label}</span>
      <span className={strong ? "font-bold text-white" : `font-medium ${tone}`}>{value}</span>
    </div>
  );
}

function ExecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[22px] border border-zinc-800 bg-zinc-950/70 px-4 py-3">
      <span className="text-sm text-zinc-400">{label}</span>
      <span className="text-sm font-semibold text-white">{value}</span>
    </div>
  );
}

function formatARS(val: string | number | null | undefined): string {
  if (val === null || val === undefined || val === "") return "$0";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(Number(val));
}

function formatFechaLarga(fecha: string): string {
  return new Date(fecha + "T12:00:00").toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}
