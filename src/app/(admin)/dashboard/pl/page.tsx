import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getPL } from "@/lib/dashboard-queries";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function formatARS(val: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(val);
}

function nombreMes(mes: number, anio: number): string {
  return new Date(anio, mes - 1, 1).toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  });
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Fila simple del P&L ──────────────────────────────────────────
function Row({
  label,
  valor,
  sub,
  negativo = false,
  muted = false,
  indent = false,
}: {
  label: string;
  valor: number;
  sub?: string;
  negativo?: boolean;
  muted?: boolean;
  indent?: boolean;
}) {
  const display = negativo ? -Math.abs(valor) : valor;
  const colorVal = display >= 0 ? "text-white" : "text-red-400";
  return (
    <div className={`flex items-center justify-between gap-4 py-2.5 ${indent ? "pl-5" : ""} border-b border-zinc-800/50 last:border-0`}>
      <div>
        <p className={`text-sm ${muted ? "text-zinc-500" : "text-zinc-300"}`}>{label}</p>
        {sub && <p className="text-xs text-zinc-600">{sub}</p>}
      </div>
      <p className={`shrink-0 text-sm font-semibold tabular-nums ${muted ? "text-zinc-600" : colorVal}`}>
        {negativo ? `− ${formatARS(Math.abs(valor))}` : formatARS(valor)}
      </p>
    </div>
  );
}

// ── Fila de subtotal / total ──────────────────────────────────────
function TotalRow({
  label,
  valor,
  badge,
  highlight = false,
}: {
  label: string;
  valor: number;
  badge?: string;
  highlight?: boolean;
}) {
  const colorVal = valor >= 0
    ? highlight ? "text-[#8cff59]" : "text-white"
    : "text-red-400";
  return (
    <div className={`flex items-center justify-between gap-4 rounded-[16px] px-4 py-3 mt-2 ${
      highlight
        ? "bg-[#8cff59]/10 border border-[#8cff59]/20"
        : "bg-zinc-800/60"
    }`}>
      <div className="flex items-center gap-2">
        <p className={`text-sm font-semibold ${highlight ? "text-[#8cff59]" : "text-white"}`}>
          {label}
        </p>
        {badge && (
          <span className="rounded-full bg-zinc-700 px-2 py-0.5 text-[10px] font-semibold text-zinc-300">
            {badge}
          </span>
        )}
      </div>
      <p className={`text-base font-bold tabular-nums ${colorVal}`}>{formatARS(valor)}</p>
    </div>
  );
}

// ── Sección con eyebrow ───────────────────────────────────────────
function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel-card rounded-[28px] p-5">
      <p className="eyebrow text-xs font-semibold">{eyebrow}</p>
      <h2 className="font-display mt-1 text-lg font-semibold text-white">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default async function PLPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth.api.getSession({ headers: await headers() });
  const userRole = (session?.user as { role?: string })?.role;
  if (userRole !== "admin" && userRole !== "asesor") redirect("/caja");

  const sp = await searchParams;
  const hoyDate = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" })
  );
  const mesActual = hoyDate.getMonth() + 1;
  const anioActual = hoyDate.getFullYear();

  const mes = sp.mes ? parseInt(String(sp.mes), 10) : mesActual;
  const anio = sp.anio ? parseInt(String(sp.anio), 10) : anioActual;

  const pl = await getPL(mes, anio);

  const mesPrev = mes === 1 ? 12 : mes - 1;
  const anioPrev = mes === 1 ? anio - 1 : anio;
  const mesNext = mes === 12 ? 1 : mes + 1;
  const anioNext = mes === 12 ? anio + 1 : anio;

  const sinDatos =
    pl.ingresosGaboteBruto === 0 && pl.ingresosPinkyBruto === 0 && pl.ingresosProductosBruto === 0;

  const gastosVsPresupuesto =
    pl.presupuestoGastos > 0
      ? Math.round((pl.gastosFijosMes / pl.presupuestoGastos) * 100)
      : null;

  const cuotaLabel =
    pl.cantidadCuotasPactadas
      ? `cuota ${pl.cuotasPagadas + 1} de ${pl.cantidadCuotasPactadas}`
      : `${pl.cuotasPagadas} pagadas`;

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="border-b border-zinc-800 bg-zinc-900/90 px-4 py-4 backdrop-blur">
        <div className="mx-auto max-w-2xl">
          <Link href="/dashboard" className="mb-2 block text-sm text-zinc-400 hover:text-[#8cff59]">
            ← Dashboard
          </Link>
          <div className="flex items-center justify-between gap-3">
            <h1 className="font-display text-xl font-bold text-white">P&amp;L mensual</h1>
            <div className="flex items-center gap-2">
              <a
                href={`/api/export/csv/${anio}-${String(mes).padStart(2, "0")}`}
                className="inline-flex min-h-[36px] items-center rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800"
              >
                CSV
              </a>
              <a
                href={`/api/pdf/pl/${anio}-${String(mes).padStart(2, "0")}`}
                className="neon-button inline-flex min-h-[36px] items-center rounded-xl px-3 text-sm font-medium"
              >
                PDF
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-6 pb-24">
        {/* Navegación de meses */}
        <div className="flex items-center justify-between">
          <Link
            href={`/dashboard/pl?mes=${mesPrev}&anio=${anioPrev}`}
            className="inline-flex min-h-[44px] items-center rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            ← Anterior
          </Link>
          <span className="text-sm font-semibold capitalize text-white">
            {nombreMes(mes, anio)}
          </span>
          <Link
            href={`/dashboard/pl?mes=${mesNext}&anio=${anioNext}`}
            className="inline-flex min-h-[44px] items-center rounded-xl border border-zinc-800 bg-zinc-900 px-4 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            Siguiente →
          </Link>
        </div>

        {sinDatos ? (
          <div className="panel-card rounded-[28px] p-8 text-center">
            <p className="text-sm text-zinc-400">No hay datos registrados para este mes.</p>
          </div>
        ) : (
          <>
            {/* ── 1. INGRESOS ───────────────────────────────────── */}
            <Section eyebrow="Paso 1" title="Ingresos">
              <Row label="Servicios Gabote" valor={pl.ingresosGaboteBruto} />
              <Row label="Servicios Pinky" valor={pl.ingresosPinkyBruto} />
              {pl.ingresosProductosBruto > 0 && (
                <Row label="Venta de productos" valor={pl.ingresosProductosBruto} />
              )}
              <TotalRow label="Ingreso bruto total" valor={pl.ingresoBrutoTotal} />
            </Section>

            {/* ── 2. COSTOS VARIABLES ───────────────────────────── */}
            <Section eyebrow="Paso 2" title="Costos variables">
              <Row
                label="Comisión Gabote"
                valor={pl.comisionGabote}
                sub={`${pl.comisionGabotePct}% de sus servicios`}
                negativo
              />
              {pl.costoProductosVendidos > 0 && (
                <Row
                  label="Costo de productos vendidos"
                  valor={pl.costoProductosVendidos}
                  negativo
                />
              )}
              <Row
                label="Fees medios de pago"
                valor={pl.feesMedioPagoTotal}
                sub={
                  pl.feesMedioPagoPinky > 0
                    ? `Gabote ${formatARS(pl.feesMedioPagoGabote)} · Pinky ${formatARS(pl.feesMedioPagoPinky)}`
                    : undefined
                }
                negativo
              />
              <TotalRow
                label="Margen bruto"
                valor={pl.margenBruto}
                badge={`${pl.margenBrutoPct}%`}
              />
            </Section>

            {/* ── 3. COSTOS FIJOS ───────────────────────────────── */}
            <Section eyebrow="Paso 3" title="Costos operativos">
              {pl.gastosPorCategoria.length === 0 ? (
                <p className="text-sm text-zinc-500">Sin gastos registrados este mes.</p>
              ) : (
                pl.gastosPorCategoria.map(({ categoria, monto }) => (
                  <Row
                    key={categoria}
                    label={capitalize(categoria)}
                    valor={monto}
                    negativo
                    indent
                  />
                ))
              )}

              {/* Total gastos + vs presupuesto */}
              <div className="mt-3 flex items-center justify-between rounded-[16px] bg-zinc-800/60 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-white">Total gastos</p>
                  {gastosVsPresupuesto !== null && (
                    <p className={`text-xs font-medium ${
                      gastosVsPresupuesto > 100 ? "text-red-400" : "text-zinc-400"
                    }`}>
                      {gastosVsPresupuesto}% del presupuesto ({formatARS(pl.presupuestoGastos)})
                    </p>
                  )}
                </div>
                <p className="text-base font-bold tabular-nums text-red-400">
                  − {formatARS(pl.gastosFijosMes)}
                </p>
              </div>

              <TotalRow label="Resultado operativo" valor={pl.resultadoOperativo} />
            </Section>

            {/* ── 4. FINANCIERO ─────────────────────────────────── */}
            {pl.cuotaMemasMes > 0 && (
              <Section eyebrow="Paso 4" title="Financiero">
                <div className="rounded-[16px] border border-zinc-800 bg-zinc-900/50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-zinc-200">Repago inversión inicial</p>
                      <p className="mt-0.5 text-xs text-zinc-500">{cuotaLabel}</p>
                      {pl.deudaUsd > 0 && (
                        <p className="mt-1 text-xs text-zinc-500">
                          Saldo pendiente: u$d {pl.deudaUsd.toLocaleString("es-AR")}
                          {pl.saldoPendiente > 0 && ` · ${formatARS(pl.saldoPendiente)}`}
                        </p>
                      )}
                    </div>
                    <p className="shrink-0 text-sm font-bold tabular-nums text-red-400">
                      − {formatARS(pl.cuotaMemasMes)}
                    </p>
                  </div>
                </div>
              </Section>
            )}

            {/* ── RESULTADO NETO ────────────────────────────────── */}
            <div className="overflow-hidden rounded-[28px] border border-[#8cff59]/30 bg-[#8cff59]/8 p-5">
              <p className="eyebrow text-xs font-semibold text-[#8cff59]/70">Resultado</p>
              <div className="mt-3 flex items-end justify-between gap-4">
                <div>
                  <p className="font-display text-lg font-semibold text-white">
                    Resultado neto del negocio
                  </p>
                  <p className="mt-1 text-xs text-zinc-400">
                    Va íntegramente a Pinky como dueño
                  </p>
                </div>
                <p className={`font-display shrink-0 text-3xl font-bold tabular-nums ${
                  pl.resultadoNeto >= 0 ? "text-[#8cff59]" : "text-red-400"
                }`}>
                  {formatARS(pl.resultadoNeto)}
                </p>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
