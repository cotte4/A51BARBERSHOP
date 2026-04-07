import Link from "next/link";
import { desc } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import AlienSignalPanel from "@/components/branding/AlienSignalPanel";
import { auth } from "@/lib/auth";
import {
  calcularCuotaSiguiente,
  calcularFechaCancelacion,
  calcularPorcentajeAvance,
  formatUSD,
  generarCronograma,
} from "@/lib/amortizacion";
import { formatFecha } from "@/lib/fecha";
import { db } from "@/db";
import { repagoMemas, repagoMemasCuotas } from "@/db/schema";
import { registrarCuota } from "./actions";
import RegistrarPagoForm from "./_RegistrarPagoForm";

function formatARS(val: string | number | null | undefined): string {
  if (val === null || val === undefined || val === "") return "$ 0";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(Number(val));
}

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

function clampProgress(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export default async function RepagoPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userRole = (session?.user as { role?: string })?.role;

  if (userRole !== "admin") {
    redirect("/caja");
  }

  const [repago] = await db.select().from(repagoMemas).limit(1);
  const cuotas = await db
    .select()
    .from(repagoMemasCuotas)
    .orderBy(desc(repagoMemasCuotas.fechaPago));

  if (!repago) {
    return (
      <div className="min-h-screen bg-zinc-950">
        <main className="mx-auto flex max-w-4xl flex-col gap-5 px-4 py-6 pb-28">
          <section className="rounded-[32px] border border-zinc-800/80 bg-[radial-gradient(circle_at_top_right,_rgba(140,255,89,0.15),_transparent_35%),linear-gradient(180deg,_rgba(24,24,27,0.98),_rgba(9,9,11,0.98))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.32)]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-3">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center text-sm font-medium text-zinc-500 transition hover:text-zinc-200"
                >
                  &larr; Dashboard
                </Link>
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
                    Panel financiero
                  </p>
                  <h1 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                    Repago Memas
                  </h1>
                  <p className="max-w-2xl text-sm leading-6 text-zinc-400">
                    Acá se sigue el préstamo, el progreso y el historial de cuotas. Cuando no hay
                    deuda configurada, esta vista queda en pausa.
                  </p>
                </div>
              </div>
              <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs font-semibold text-zinc-300">
                Sin deuda configurada
              </span>
            </div>

            <div className="mt-6 rounded-[28px] border border-zinc-800 bg-zinc-950/70 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">
                Estado
              </p>
              <h2 className="mt-2 text-xl font-semibold text-white">No hay repago activo</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Cuando se cargue la deuda, vas a ver el avance, la próxima cuota y el cronograma
                completo en esta misma pantalla.
              </p>
            </div>
          </section>
        </main>
      </div>
    );
  }

  const deudaUsd = Number(repago.deudaUsd ?? 1500);
  const tasaAnual = Number(repago.tasaAnualUsd ?? 0.1);
  const cantidadCuotas = repago.cantidadCuotasPactadas ?? 12;
  const cuotasPagadas = repago.cuotasPagadas ?? 0;
  const fechaInicio = repago.fechaInicio ?? "2026-05-01";

  const cronograma = generarCronograma(deudaUsd, tasaAnual, cantidadCuotas);
  const cuotaSiguiente = calcularCuotaSiguiente(cronograma, cuotasPagadas);
  const fechaCancelacion = calcularFechaCancelacion(fechaInicio, cuotasPagadas, cantidadCuotas);

  const capitalPagadoAcumulado = cuotas.reduce((sum, cuota) => sum + Number(cuota.capitalPagado ?? 0), 0);
  const porcentajeAvance = clampProgress(calcularPorcentajeAvance(capitalPagadoAcumulado, deudaUsd));
  const cuotasOrdenadas = [...cuotas].sort((a, b) => (a.numeroCuota ?? 0) - (b.numeroCuota ?? 0));
  const ultimaCuota = cuotas[0] ?? null;
  const saldoRestante = cuotaSiguiente?.saldoInicial ?? 0;
  const proximaCuotaTotal = cuotaSiguiente?.cuotaTotal ?? 0;

  return (
    <div className="min-h-screen bg-zinc-950">
      <main className="mx-auto max-w-6xl px-4 py-6 pb-28">
        <div className="space-y-6">
          <section className="rounded-[32px] border border-zinc-800/80 bg-[radial-gradient(circle_at_top_right,_rgba(140,255,89,0.15),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(245,158,11,0.12),_transparent_28%),linear-gradient(180deg,_rgba(24,24,27,0.98),_rgba(9,9,11,0.98))] shadow-[0_24px_80px_rgba(0,0,0,0.32)]">
            <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)] lg:p-7">
              <div className="space-y-5">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center text-sm font-medium text-zinc-500 transition hover:text-zinc-200"
                >
                  &larr; Dashboard
                </Link>

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
                        repago.pagadoCompleto
                          ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
                          : "border-sky-500/25 bg-sky-500/10 text-sky-200"
                      }`}
                    >
                      {repago.pagadoCompleto ? "Deuda cancelada" : "Plan activo"}
                    </span>
                  </div>
                  <p className="max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
                    Seguimiento de deuda, cuota actual, cronograma y registro de pago en una sola
                    pantalla para que el control financiero sea rapido de leer.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Pill label="Cuotas pagadas" value={`${cuotasPagadas}/${cantidadCuotas}`} />
                  <Pill label="Capital pagado" value={formatUSD(capitalPagadoAcumulado)} />
                  <Pill label="Inicio" value={formatMonthYear(fechaInicio)} />
                  <Pill label="Cancelacion" value={fechaCancelacion} accent />
                </div>

                <AlienSignalPanel
                  eyebrow="Orbita de deuda"
                  title="Senal de repago"
                  detail="La nave separa avance, saldo, cuota siguiente y cierre estimado para que el plan no se pierda entre números sueltos."
                  badges={[
                    repago.pagadoCompleto ? "deuda cerrada" : "plan activo",
                    `${cuotasPagadas}/${cantidadCuotas} cuotas`,
                    cuotaSiguiente ? "hay proxima cuota" : "sin cuota pendiente",
                  ]}
                  tone="fuchsia"
                />
              </div>

              <aside className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <StatCard
                  label="Deuda original"
                  value={formatUSD(deudaUsd)}
                  hint={`Tasa anual ${Number(tasaAnual * 100).toFixed(1)}%`}
                />
                <StatCard
                  label="Saldo pendiente"
                  value={formatUSD(saldoRestante)}
                  hint={cuotaSiguiente ? `Cuota #${cuotaSiguiente.numeroCuota}` : "Sin cuotas pendientes"}
                  tone={repago.pagadoCompleto ? "success" : "warning"}
                />
                <StatCard
                  label="Proxima cuota"
                  value={cuotaSiguiente ? formatUSD(proximaCuotaTotal) : "Completa"}
                  hint={repago.pagadoCompleto ? "Deuda cerrada" : `Restan ${cantidadCuotas - cuotasPagadas} cuotas`}
                />
                <StatCard
                  label="Ultimo pago"
                  value={ultimaCuota ? formatFecha(ultimaCuota.fechaPago) : "Sin pagos"}
                  hint={ultimaCuota ? formatUSD(Number(ultimaCuota.montoPagado ?? 0)) : "Aun no hubo registro"}
                />
              </aside>
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
            <div className="space-y-5">
              <section className="rounded-[30px] border border-zinc-800 bg-zinc-900 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="eyebrow text-xs font-semibold">Avance</p>
                    <h2 className="font-display mt-2 text-2xl font-semibold text-white">
                      Progreso de cancelacion
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-zinc-400">
                      El avance se mide sobre capital pagado. El saldo y la cuota siguiente te
                      ayudan a ver que queda realmente por cubrir.
                    </p>
                  </div>
                  <div className="rounded-[24px] border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-right">
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Progreso</p>
                    <p className="mt-1 text-2xl font-bold text-white">
                      {porcentajeAvance.toFixed(1)}%
                    </p>
                    <p className="text-xs text-zinc-500">Capital pagado</p>
                  </div>
                </div>

                <div className="mt-5 h-3 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-[#8cff59] transition-all"
                    style={{ width: `${porcentajeAvance}%` }}
                  />
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <InfoCard label="Pagado" value={formatUSD(capitalPagadoAcumulado)} helper="Capital acumulado" />
                  <InfoCard
                    label="Restante"
                    value={formatUSD(saldoRestante)}
                    helper={cuotaSiguiente ? `Hasta la cuota #${cuotaSiguiente.numeroCuota}` : "No quedan cuotas"}
                  />
                  <InfoCard
                    label="Cancelacion"
                    value={fechaCancelacion}
                    helper={repago.pagadoCompleto ? "Ya esta cerrada" : "Fecha estimada"}
                  />
                </div>

                {!repago.pagadoCompleto && cuotaSiguiente ? (
                  <div className="mt-5 rounded-[26px] border border-sky-500/20 bg-sky-500/10 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-200">
                      Proxima cuota
                    </p>
                    <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm text-zinc-300">
                          Cuota #{cuotaSiguiente.numeroCuota} de {cantidadCuotas}
                        </p>
                        <p className="mt-1 text-3xl font-bold text-white">
                          {formatUSD(cuotaSiguiente.cuotaTotal)}
                        </p>
                        <p className="mt-1 text-sm text-zinc-400">
                          Capital {formatUSD(cuotaSiguiente.capital)} - Interes {formatUSD(cuotaSiguiente.interes)}
                        </p>
                      </div>
                      <div className="rounded-[22px] border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-sm text-zinc-300">
                        <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                          Cierre proyectado
                        </p>
                        <p className="mt-1 font-semibold text-white">{fechaCancelacion}</p>
                        <p className="mt-1 text-zinc-400">
                          {cantidadCuotas - cuotasPagadas} cuotas restantes
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 rounded-[26px] border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                    La deuda ya quedo cancelada. Abajo vas a seguir viendo el cronograma y el
                    historial completo de pagos.
                  </div>
                )}
              </section>

              <section className="rounded-[30px] border border-zinc-800 bg-zinc-900 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="eyebrow text-xs font-semibold">Cronograma</p>
                    <h2 className="font-display mt-2 text-2xl font-semibold text-white">
                      Cuotas pactadas
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-zinc-400">
                      Toda la tabla completa para revisar el comportamiento de la deuda, con la
                      cuota siguiente resaltada.
                    </p>
                  </div>
                  <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs text-zinc-400">
                    {cronograma.length} cuotas
                  </span>
                </div>

                <div className="mt-5 overflow-x-auto">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead>
                      <tr className="border-b border-zinc-800 text-xs uppercase tracking-[0.18em] text-zinc-500">
                        <th className="pb-3 text-left font-medium">#</th>
                        <th className="pb-3 text-right font-medium">Capital</th>
                        <th className="pb-3 text-right font-medium">Interes</th>
                        <th className="pb-3 text-right font-medium">Total USD</th>
                        <th className="pb-3 text-right font-medium">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cronograma.map((cuota) => {
                        const cuotaPagada = cuotasOrdenadas.find((item) => item.numeroCuota === cuota.numeroCuota);
                        const esPagada = Boolean(cuotaPagada);
                        const esProxima = !repago.pagadoCompleto && cuota.numeroCuota === cuotasPagadas + 1;

                        return (
                          <tr
                            key={cuota.numeroCuota}
                            className={[
                              "border-b border-zinc-800/60",
                              esProxima ? "bg-[#8cff59]/8" : "",
                            ].join(" ")}
                          >
                            <td className={`py-3 font-medium ${esPagada ? "text-emerald-300" : "text-zinc-400"}`}>
                              {cuota.numeroCuota}
                            </td>
                            <td className={`py-3 text-right ${esPagada ? "text-emerald-300" : "text-zinc-300"}`}>
                              {esPagada
                                ? formatUSD(Number(cuotaPagada?.capitalPagado ?? cuota.capital))
                                : formatUSD(cuota.capital)}
                            </td>
                            <td className={`py-3 text-right ${esPagada ? "text-emerald-300" : "text-zinc-300"}`}>
                              {esPagada
                                ? formatUSD(Number(cuotaPagada?.interesPagado ?? cuota.interes))
                                : formatUSD(cuota.interes)}
                            </td>
                            <td className={`py-3 text-right font-medium ${esPagada ? "text-emerald-300" : "text-zinc-300"}`}>
                              {esPagada
                                ? formatUSD(
                                    Number(cuotaPagada?.capitalPagado ?? 0) +
                                      Number(cuotaPagada?.interesPagado ?? 0)
                                  )
                                : formatUSD(cuota.cuotaTotal)}
                            </td>
                            <td className="py-3 text-right">
                              {esPagada ? (
                                <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                                  Pagada
                                </span>
                              ) : esProxima ? (
                                <span className="rounded-full border border-sky-500/25 bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-200">
                                  Proxima
                                </span>
                              ) : (
                                <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs text-zinc-500">
                                  Pendiente
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="rounded-[30px] border border-zinc-800 bg-zinc-900 p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="eyebrow text-xs font-semibold">Historial</p>
                    <h2 className="font-display mt-2 text-2xl font-semibold text-white">
                      Pagos registrados
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-zinc-400">
                      Cronologia de cuotas pagadas, con fecha, capital, interes y equivalente en
                      pesos.
                    </p>
                  </div>
                </div>

                {cuotas.length === 0 ? (
                  <div className="mt-5 rounded-[24px] border border-dashed border-zinc-700 bg-zinc-950/40 p-8 text-center text-sm text-zinc-400">
                    Aun no hay pagos registrados.
                  </div>
                ) : (
                  <div className="mt-5 overflow-x-auto">
                    <table className="w-full min-w-[780px] text-sm">
                      <thead>
                        <tr className="border-b border-zinc-800 text-xs uppercase tracking-[0.18em] text-zinc-500">
                          <th className="pb-3 text-left font-medium">Fecha</th>
                          <th className="pb-3 text-left font-medium">Cuota</th>
                          <th className="pb-3 text-right font-medium">Capital</th>
                          <th className="pb-3 text-right font-medium">Interes</th>
                          <th className="pb-3 text-right font-medium">Total USD</th>
                          <th className="pb-3 text-right font-medium">TC</th>
                          <th className="pb-3 text-right font-medium">Monto ARS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cuotasOrdenadas.map((cuota) => {
                          const capital = Number(cuota.capitalPagado ?? 0);
                          const interes = Number(cuota.interesPagado ?? 0);
                          const totalUsd = capital + interes;

                          return (
                            <tr key={cuota.id} className="border-b border-zinc-800/60 last:border-0">
                              <td className="py-3 text-zinc-400">{formatFecha(cuota.fechaPago)}</td>
                              <td className="py-3 text-zinc-300">#{cuota.numeroCuota}</td>
                              <td className="py-3 text-right text-zinc-300">{formatUSD(capital)}</td>
                              <td className="py-3 text-right text-zinc-400">{formatUSD(interes)}</td>
                              <td className="py-3 text-right font-medium text-white">
                                {formatUSD(totalUsd)}
                              </td>
                              <td className="py-3 text-right text-zinc-400">
                                {cuota.tcDia ? `$${Number(cuota.tcDia).toLocaleString("es-AR")}` : "-"}
                              </td>
                              <td className="py-3 text-right text-zinc-300">
                                {cuota.montoPagado ? formatARS(cuota.montoPagado) : "-"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>

            <aside className="space-y-5">
              {!repago.pagadoCompleto && cuotaSiguiente ? (
                <section className="rounded-[30px] border border-zinc-800 bg-zinc-900 p-5">
                  <p className="eyebrow text-xs font-semibold">Accion</p>
                  <h2 className="font-display mt-2 text-2xl font-semibold text-white">
                    Registrar pago
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-zinc-400">
                    Carga USD, tipo de cambio y notas. El formulario ya te deja ver el impacto en
                    ARS antes de confirmar.
                  </p>
                  <div className="mt-5">
                    <RegistrarPagoForm action={registrarCuota} cuotaTotalDefault={cuotaSiguiente.cuotaTotal} />
                  </div>
                </section>
              ) : (
                <section className="rounded-[30px] border border-emerald-500/25 bg-emerald-500/10 p-5">
                  <p className="eyebrow text-xs font-semibold text-emerald-200">Cierre</p>
                  <h2 className="font-display mt-2 text-2xl font-semibold text-white">
                    Deuda cancelada
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-emerald-100/80">
                    El repago ya quedo completo. El historial sigue disponible para auditoria y
                    consulta.
                  </p>
                  {ultimaCuota ? (
                    <div className="mt-5 rounded-[24px] border border-emerald-500/20 bg-zinc-950/60 p-4">
                      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Ultimo pago</p>
                      <p className="mt-1 text-base font-semibold text-white">
                        {formatFecha(ultimaCuota.fechaPago)}
                      </p>
                      <p className="mt-1 text-sm text-zinc-400">
                        {formatUSD(Number(ultimaCuota.montoPagado ?? 0))} registrado.
                      </p>
                    </div>
                  ) : null}
                </section>
              )}

              <section className="rounded-[30px] border border-zinc-800 bg-zinc-900 p-5">
                <p className="eyebrow text-xs font-semibold">Acuerdo</p>
                <h2 className="font-display mt-2 text-2xl font-semibold text-white">
                  Datos del plan
                </h2>
                <div className="mt-4 space-y-3">
                  <KeyValueRow label="Deuda base" value={formatUSD(deudaUsd)} />
                  <KeyValueRow label="Tasa anual" value={`${Number(tasaAnual * 100).toFixed(1)}%`} />
                  <KeyValueRow label="Cuotas pactadas" value={String(cantidadCuotas)} />
                  <KeyValueRow label="Inicio" value={formatLongDate(fechaInicio)} />
                  <KeyValueRow label="Cuotas pagadas" value={`${cuotasPagadas}`} />
                </div>
              </section>
            </aside>
          </section>
        </div>
      </main>
    </div>
  );
}

function Pill({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-full border px-3 py-1 text-xs font-semibold ${
        accent
          ? "border-[#8cff59]/25 bg-[#8cff59]/10 text-[#b9ff96]"
          : "border-zinc-800 bg-zinc-950 text-zinc-300"
      }`}
    >
      <span className="text-zinc-500">{label}:</span> {value}
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

function InfoCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
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
