import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { formatUSD, mesesRestantesEstimados } from "@/lib/amortizacion";
import { formatFecha } from "@/lib/fecha";
import { db } from "@/db";
import { configuracionNegocio } from "@/db/schema";
import { fechaHoyArgentina, getEstadoRepago, montoUsdDeFila } from "@/lib/repago-service";
import { registrarCuota } from "./actions";
import { formatARS } from "@/lib/format";
import BrandMark from "@/components/BrandMark";
import RegistrarPagoForm from "./_RegistrarPagoForm";

function formatLongDate(value: string | null | undefined): string {
  if (!value) return "-";

  return new Date(`${value}T12:00:00`).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

function formatMonthYear(value: string): string {
  return new Date(`${value}T12:00:00`).toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

function addMonths(value: string, months: number): string {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + months, Math.min(d, 28), 12)).toISOString().slice(0, 10);
}

type TcOnline = { oficial: number | null; blue: number | null };

async function getTcOnline(): Promise<TcOnline> {
  try {
    const res = await fetch("https://dolarapi.com/v1/dolares", {
      next: { revalidate: 900 },
    });
    if (!res.ok) return { oficial: null, blue: null };
    const data = (await res.json()) as Array<{ casa?: string; compra?: number; venta?: number }>;
    const venta = (casa: string) => {
      const value = data.find((item) => item.casa === casa)?.venta;
      return typeof value === "number" && value > 0 ? Math.round(value) : null;
    };
    const blueItem = data.find((item) => item.casa === "blue");
    const blueCompra = blueItem?.compra;
    const blueVenta = blueItem?.venta;
    const blueMidpoint =
      typeof blueCompra === "number" &&
      blueCompra > 0 &&
      typeof blueVenta === "number" &&
      blueVenta > 0
        ? Math.round((blueCompra + blueVenta) / 2)
        : null;
    return { oficial: venta("oficial"), blue: blueMidpoint };
  } catch {
    return { oficial: null, blue: null };
  }
}

export default async function RepagoPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userRole = (session?.user as { role?: string })?.role;

  if (userRole !== "admin" && userRole !== "asesor") {
    redirect("/caja");
  }

  const hoy = fechaHoyArgentina();
  const [completo, [config], tcOnline] = await Promise.all([
    getEstadoRepago(hoy),
    db
      .select({ tcReferencia: configuracionNegocio.tcReferencia })
      .from(configuracionNegocio)
      .limit(1),
    getTcOnline(),
  ]);
  const tcReferencia = Number(config?.tcReferencia ?? 1400);

  if (!completo) {
    return (
      <div className="app-shell min-h-screen">
        <header className="border-b border-zinc-800/80 bg-zinc-950/90 px-4 py-4 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
            <BrandMark href="/dashboard" subtitle="Repago Memas" />
          </div>
        </header>
        <main className="mx-auto flex max-w-4xl flex-col gap-5 px-4 py-6 pb-24">
          <section className="rounded-[32px] border border-zinc-800/80 bg-[radial-gradient(circle_at_top_right,_rgba(140,255,89,0.15),_transparent_35%),linear-gradient(180deg,_rgba(24,24,27,0.98),_rgba(9,9,11,0.98))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.32)]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
                  Panel financiero
                </p>
                <h1 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  Repago Memas
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-zinc-400">
                  Acá se sigue el préstamo y el historial de pagos. Cuando no hay deuda configurada,
                  esta vista queda en pausa.
                </p>
              </div>
              <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs font-semibold text-zinc-300">
                Sin deuda configurada
              </span>
            </div>
          </section>
        </main>
      </div>
    );
  }

  const { plan, filas, estado } = completo;
  const saldada = estado.pagadoCompleto;
  const pagos = estado.aplicaciones.map(({ fecha, montoUsd }) => ({ fecha, montoUsd }));
  const primerPago = estado.aplicaciones[0]?.fecha ?? null;
  const ultimoPago = estado.aplicaciones.at(-1) ?? null;
  const cantidadPagos = estado.aplicaciones.length;

  // Lo que entregaron, en la moneda en que lo entregaron
  const totalArsEntregado = filas
    .filter((fila) => fila.monedaIngresada !== "USD")
    .reduce((sum, fila) => sum + Number(fila.montoIngresado ?? fila.montoPagado ?? 0), 0);
  const totalUsdEntregado = filas
    .filter((fila) => fila.monedaIngresada === "USD")
    .reduce((sum, fila) => sum + montoUsdDeFila(fila), 0);
  const entregadoDetalle = [
    totalArsEntregado > 0 ? `${formatARS(totalArsEntregado)} en pesos` : null,
    totalUsdEntregado > 0 ? `${formatUSD(totalUsdEntregado)} en dólares` : null,
  ]
    .filter(Boolean)
    .join(" + ");

  const porcentajeDevuelto = Math.min(100, (estado.capitalPagado / plan.deudaUsd) * 100);
  const interesTotalHoy = estado.interesPagado + estado.interesCorrido;
  const mesesEstimados = mesesRestantesEstimados(estado.saldoCapital, estado.capitalFijo);
  const fechaEstimada = formatMonthYear(
    saldada ? (ultimoPago?.fecha ?? hoy) : addMonths(hoy, mesesEstimados)
  );

  return (
    <div className="app-shell min-h-screen">
      <header className="border-b border-zinc-800/80 bg-zinc-950/90 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <BrandMark href="/dashboard" subtitle="Repago Memas" />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 pb-24">
        <div className="space-y-6">
          <section className="rounded-[32px] border border-zinc-800/80 bg-[radial-gradient(circle_at_top_right,_rgba(140,255,89,0.15),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(245,158,11,0.12),_transparent_28%),linear-gradient(180deg,_rgba(24,24,27,0.98),_rgba(9,9,11,0.98))] shadow-[0_24px_80px_rgba(0,0,0,0.32)]">
            <div className="space-y-5 p-6 lg:p-7">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
                  Panel financiero
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
                    Repago Memas
                  </h1>
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                      saldada
                        ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
                        : "border-sky-500/25 bg-sky-500/10 text-sky-200"
                    }`}
                  >
                    {saldada ? "¡Deuda saldada!" : "Plan activo"}
                  </span>
                </div>
                <p className="max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
                  Préstamo en dólares. Se paga cuando se puede: cada pago cubre primero el interés
                  de los días que pasaron y el resto baja la deuda.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  label="Préstamo"
                  value={formatUSD(plan.deudaUsd)}
                  hint={`${(plan.tasaAnual * 100).toFixed(0)}% anual · interés máx. ${formatUSD(estado.topeInteres)}`}
                />
                <StatCard
                  label="Ya pagaron"
                  value={formatUSD(estado.totalPagadoUsd)}
                  hint={
                    cantidadPagos > 0
                      ? `${entregadoDetalle} · ${cantidadPagos} ${cantidadPagos === 1 ? "pago" : "pagos"}`
                      : "Aún no hubo pagos"
                  }
                  tone="success"
                />
                <StatCard
                  label="Falta devolver"
                  value={formatUSD(estado.saldoCapital)}
                  hint={`Del préstamo ya devolvieron ${formatUSD(estado.capitalPagado)}`}
                  tone={saldada ? "success" : "warning"}
                />
                <StatCard
                  label="Para cancelar hoy"
                  value={saldada ? "Nada" : formatUSD(estado.totalParaCancelar)}
                  hint={
                    saldada
                      ? "Deuda cerrada"
                      : `Deuda + ${formatUSD(estado.interesCorrido)} de interés corrido`
                  }
                />
              </div>
            </div>
          </section>

          {!saldada ? (
            <section className="rounded-[30px] border border-zinc-800 bg-zinc-900 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="eyebrow text-xs font-semibold">Acción</p>
                  <h2 className="font-display mt-2 text-2xl font-semibold text-white">
                    Registrar pago
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-zinc-400">
                    Cargá lo que te dieron y el día en que te lo dieron.
                  </p>
                </div>
                <div className="rounded-[22px] border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-right">
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Cuota sugerida hoy</p>
                  <p className="mt-1 text-2xl font-bold text-white">{formatUSD(estado.cuotaSugerida)}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {formatUSD(Math.min(estado.capitalFijo, estado.saldoCapital))} de deuda +{" "}
                    {formatUSD(estado.interesCorrido)} de interés
                  </p>
                </div>
              </div>
              <div className="mt-5">
                <RegistrarPagoForm
                  action={registrarCuota}
                  plan={plan}
                  pagos={pagos}
                  hoy={hoy}
                  tcReferencia={tcReferencia}
                  tcSistema={tcOnline.blue}
                />
              </div>
            </section>
          ) : (
            <section className="rounded-[30px] border border-emerald-500/25 bg-emerald-500/10 p-5">
              <p className="eyebrow text-xs font-semibold text-emerald-200">Cierre</p>
              <h2 className="font-display mt-2 text-2xl font-semibold text-white">¡Deuda saldada!</h2>
              <p className="mt-1 text-sm leading-6 text-emerald-100/80">
                Ya está: devolvieron los {formatUSD(plan.deudaUsd)} y pagaron{" "}
                {formatUSD(estado.interesPagado)} de interés (el plan preveía hasta{" "}
                {formatUSD(estado.topeInteres)}).
              </p>
            </section>
          )}

          <section className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
            <div className="min-w-0 space-y-5">
              <section className="rounded-[30px] border border-zinc-800 bg-zinc-900 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="eyebrow text-xs font-semibold">Avance</p>
                    <h2 className="font-display mt-2 text-2xl font-semibold text-white">
                      Cuánto del préstamo ya volvió
                    </h2>
                  </div>
                  <div className="rounded-[24px] border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-right">
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Devuelto</p>
                    <p className="mt-1 text-2xl font-bold text-white">{porcentajeDevuelto.toFixed(1)}%</p>
                    <p className="text-xs text-zinc-500">
                      = {estado.cuotasCubiertas} de {plan.cantidadCuotas} cuotas
                    </p>
                  </div>
                </div>

                <div className="mt-5 h-3 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-[#8cff59] transition-all"
                    style={{ width: `${porcentajeDevuelto}%` }}
                  />
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <InfoCard
                    label="Devuelto"
                    value={formatUSD(estado.capitalPagado)}
                    helper={`de ${formatUSD(plan.deudaUsd)} prestados`}
                  />
                  <InfoCard
                    label="Interés"
                    value={formatUSD(interesTotalHoy)}
                    helper={`${formatUSD(estado.interesPagado)} pagado + ${formatUSD(estado.interesCorrido)} corrido · máx. ${formatUSD(estado.topeInteres)}`}
                  />
                  <InfoCard
                    label={saldada ? "Cancelada" : "Cancelación"}
                    value={fechaEstimada}
                    helper={
                      saldada
                        ? "Ya está cerrada"
                        : `Estimada: ${mesesEstimados} ${mesesEstimados === 1 ? "mes" : "meses"} más a ${formatUSD(estado.capitalFijo)} de deuda por mes`
                    }
                  />
                </div>
              </section>

              <section className="rounded-[30px] border border-zinc-800 bg-zinc-900 p-5">
                <p className="eyebrow text-xs font-semibold">Historial</p>
                <h2 className="font-display mt-2 text-2xl font-semibold text-white">Pagos</h2>
                <p className="mt-1 text-sm leading-6 text-zinc-400">
                  Cada pago con lo que entregaron, a qué dólar, y cómo se repartió entre interés y
                  deuda.
                </p>

                {cantidadPagos === 0 ? (
                  <div className="mt-5 rounded-[24px] border border-dashed border-zinc-700 bg-zinc-950/40 p-8 text-center text-sm text-zinc-400">
                    Aún no hay pagos registrados.
                  </div>
                ) : (
                  <div className="mt-5 overflow-x-auto">
                    <table className="w-full min-w-[820px] text-sm">
                      <thead>
                        <tr className="border-b border-zinc-800 text-xs uppercase tracking-[0.18em] text-zinc-500">
                          <th className="pb-3 text-left font-medium">#</th>
                          <th className="pb-3 text-left font-medium">Fecha</th>
                          <th className="pb-3 text-right font-medium">Entregaron</th>
                          <th className="pb-3 text-right font-medium">Dólar</th>
                          <th className="pb-3 text-right font-medium">En USD</th>
                          <th className="pb-3 text-right font-medium">Interés</th>
                          <th className="pb-3 text-right font-medium">Baja deuda</th>
                          <th className="pb-3 text-right font-medium">Deuda queda</th>
                        </tr>
                      </thead>
                      <tbody>
                        {estado.aplicaciones.map((aplicacion, index) => {
                          const fila = filas[index];
                          const ingresado = Number(fila.montoIngresado ?? fila.montoPagado ?? 0);
                          return (
                            <tr key={fila.id} className="border-b border-zinc-800/60">
                              <td className="py-3 text-zinc-500">{index + 1}</td>
                              <td className="py-3 text-zinc-300">
                                {formatFecha(aplicacion.fecha)}
                                {fila.notas ? (
                                  <span className="block text-xs text-zinc-500">{fila.notas}</span>
                                ) : null}
                              </td>
                              <td className="py-3 text-right text-white">
                                {fila.monedaIngresada === "USD" ? formatUSD(ingresado) : formatARS(ingresado)}
                              </td>
                              <td className="py-3 text-right text-zinc-400">
                                {fila.tcDia ? formatARS(fila.tcDia) : "-"}
                              </td>
                              <td className="py-3 text-right font-medium text-white">
                                {formatUSD(aplicacion.montoUsd)}
                              </td>
                              <td className="py-3 text-right text-zinc-400">
                                {formatUSD(aplicacion.interes)}
                                <span className="block text-xs text-zinc-600">
                                  {aplicacion.dias} {aplicacion.dias === 1 ? "día" : "días"}
                                </span>
                              </td>
                              <td className="py-3 text-right text-[#8cff59]">
                                {formatUSD(aplicacion.capital)}
                              </td>
                              <td className="py-3 text-right text-zinc-300">
                                {formatUSD(aplicacion.saldoDespues)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="text-sm font-semibold">
                          <td className="pt-3 text-zinc-400" colSpan={2}>
                            Total
                          </td>
                          <td className="pt-3 text-right text-xs font-normal text-zinc-400" colSpan={2}>
                            {entregadoDetalle}
                          </td>
                          <td className="pt-3 text-right text-white">{formatUSD(estado.totalPagadoUsd)}</td>
                          <td className="pt-3 text-right text-zinc-300">{formatUSD(estado.interesPagado)}</td>
                          <td className="pt-3 text-right text-[#8cff59]">{formatUSD(estado.capitalPagado)}</td>
                          <td className="pt-3 text-right text-white">{formatUSD(estado.saldoCapital)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </section>
            </div>

            <aside className="space-y-5">
              <section className="rounded-[30px] border border-zinc-800 bg-zinc-900 p-5">
                <p className="eyebrow text-xs font-semibold">Acuerdo</p>
                <h2 className="font-display mt-2 text-2xl font-semibold text-white">Datos del plan</h2>
                <div className="mt-4 space-y-3">
                  <KeyValueRow label="Préstamo" value={formatUSD(plan.deudaUsd)} />
                  <KeyValueRow label="Tasa anual" value={`${(plan.tasaAnual * 100).toFixed(1)}%`} />
                  <KeyValueRow label="Interés máximo" value={formatUSD(estado.topeInteres)} />
                  <KeyValueRow
                    label="Plan de referencia"
                    value={`${plan.cantidadCuotas} × ${formatUSD(estado.capitalFijo)} + interés`}
                  />
                  <KeyValueRow label="Interés corre desde" value={formatLongDate(primerPago)} />
                </div>
              </section>

              <section className="rounded-[30px] border border-zinc-800 bg-zinc-900 p-5">
                <p className="eyebrow text-xs font-semibold">Cómo se calcula</p>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-zinc-400">
                  <li>
                    El interés es del {(plan.tasaAnual * 100).toFixed(0)}% anual sobre lo que todavía se
                    debe, por los días que pasan desde el primer pago.
                  </li>
                  <li>Cada pago cubre primero ese interés; el resto baja la deuda.</li>
                  <li>
                    El interés nunca pasa de {formatUSD(estado.topeInteres)} (lo que costaba el plan de{" "}
                    {plan.cantidadCuotas} cuotas). Si terminan antes, pagan menos.
                  </li>
                  <li>
                    Los pagos en pesos se pasan a dólares con el dólar del día del pago. La deuda
                    siempre está en dólares.
                  </li>
                </ul>
              </section>
            </aside>
          </section>
        </div>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "neutral" | "warning" | "success";
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-500/25 bg-emerald-500/10"
      : tone === "warning"
        ? "border-amber-500/25 bg-amber-500/10"
        : "border-zinc-800 bg-zinc-950/70";
  const valueClass =
    tone === "success"
      ? "text-emerald-200"
      : tone === "warning"
        ? "text-amber-100"
        : "text-white";

  return (
    <div className={`rounded-[24px] border p-4 ${toneClass}`}>
      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className={`mt-2 text-lg font-semibold ${valueClass}`}>{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{hint}</p>
    </div>
  );
}

function InfoCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-[22px] border border-zinc-800 bg-zinc-950/70 px-4 py-4">
      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{helper}</p>
    </div>
  );
}

function KeyValueRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[20px] border border-zinc-800 bg-zinc-950/70 px-4 py-3">
      <span className="text-sm text-zinc-400">{label}</span>
      <span className="text-sm font-medium text-white">{value}</span>
    </div>
  );
}
