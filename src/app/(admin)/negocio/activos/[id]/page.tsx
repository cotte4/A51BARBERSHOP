import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { barberShopAssetPayments, barberShopAssets } from "@/db/schema";
import { auth } from "@/lib/auth";
import {
  getAssetFinancials,
  getEstadoCompraLabel,
  getPaymentTypeLabel,
} from "@/lib/hangar";
import { formatARS } from "@/lib/format";
import { formatFecha } from "@/lib/fecha";
import DarDeBajaButton from "../_DarDeBajaButton";
import RegistrarPagoForm from "./_RegistrarPagoForm";

function getEstadoTone(estado: string) {
  switch (estado) {
    case "planificado":
      return "border-zinc-700 bg-zinc-800/80 text-zinc-200";
    case "senado":
      return "border-amber-400/30 bg-amber-400/10 text-amber-200";
    case "en_cuotas":
      return "border-sky-400/30 bg-sky-400/10 text-sky-200";
    case "pagado":
      return "border-[#8cff59]/30 bg-[#8cff59]/10 text-[#b9ff96]";
    case "cancelado":
      return "border-red-500/30 bg-red-500/10 text-red-300";
    default:
      return "border-zinc-700 bg-zinc-800/80 text-zinc-200";
  }
}

export default async function HangarAssetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  const userRole = (session?.user as { role?: string } | undefined)?.role;
  if (userRole !== "admin" && userRole !== "asesor") {
    redirect("/caja");
  }

  const { id } = await params;
  const asset = await db.query.barberShopAssets.findFirst({
    where: eq(barberShopAssets.id, id),
  });

  if (!asset) {
    notFound();
  }

  const payments = await db
    .select()
    .from(barberShopAssetPayments)
    .where(eq(barberShopAssetPayments.assetId, id))
    .orderBy(asc(barberShopAssetPayments.fecha), asc(barberShopAssetPayments.creadoEn));

  const totalPaid = payments.reduce((sum, payment) => sum + Number(payment.monto ?? 0), 0);
  const financials = getAssetFinancials({
    precioObjetivo: asset.precioObjetivo,
    precioCompra: asset.precioCompra,
    totalPaid,
    paymentCount: payments.length,
    estadoCompra: asset.estadoCompra,
    firstPaymentType: payments[0]?.tipo,
  });
  const isActive = asset.estado === "activo";

  return (
    <div className="app-shell min-h-screen pb-24">
      <main className="mx-auto max-w-6xl px-4 py-6">
        <section className="relative overflow-hidden rounded-[32px] border border-zinc-800/80 bg-[radial-gradient(circle_at_top_right,_rgba(140,255,89,0.16),_transparent_28%),radial-gradient(circle_at_bottom_left,_rgba(56,189,248,0.08),_transparent_22%),linear-gradient(180deg,_rgba(24,24,27,0.98),_rgba(9,9,11,0.98))] p-6 shadow-[0_28px_80px_rgba(0,0,0,0.35)]">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex flex-1 gap-4">
              <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-[28px] border border-zinc-800 bg-zinc-900">
                {asset.fotoUrl ? (
                  <Image
                    src={asset.fotoUrl}
                    alt={asset.nombre}
                    fill
                    sizes="112px"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs font-semibold uppercase tracking-[0.26em] text-zinc-500">
                    Hangar
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <Link href="/negocio/activos" className="text-sm text-zinc-400 hover:text-[#8cff59]">
                  ← Volver a Hangar
                </Link>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${getEstadoTone(financials.estadoCompra)}`}>
                    {getEstadoCompraLabel(financials.estadoCompra)}
                  </span>
                  <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs font-semibold text-zinc-300">
                    {asset.categoria}
                  </span>
                  {!isActive ? (
                    <span className="rounded-full border border-zinc-600 bg-zinc-800/80 px-3 py-1 text-xs font-semibold text-zinc-400">
                      Dado de baja
                    </span>
                  ) : null}
                </div>
                <h1 className="font-display mt-3 text-3xl font-semibold text-white sm:text-4xl">
                  {asset.nombre}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                  {asset.marca || asset.modelo
                    ? [asset.marca, asset.modelo].filter(Boolean).join(" · ")
                    : "Activo cargado en Hangar para seguir su compra y su impacto en inversion inicial."}
                </p>

                <div className="mt-4 flex flex-wrap gap-3 text-sm text-zinc-300">
                  <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1">
                    Objetivo {formatARS(financials.target)}
                  </span>
                  <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1">
                    Pagado {formatARS(financials.paid)}
                  </span>
                  <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1">
                    Pendiente {formatARS(financials.pending)}
                  </span>
                </div>
              </div>
            </div>

            {isActive ? <DarDeBajaButton assetId={asset.id} /> : null}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <MetricCard label="Objetivo" value={formatARS(financials.target)} helper="Valor total proyectado" />
            <MetricCard label="Pagado" value={formatARS(financials.paid)} helper={`${payments.length} movimiento${payments.length === 1 ? "" : "s"} registrado${payments.length === 1 ? "" : "s"}`} />
            <MetricCard label="Pendiente" value={formatARS(financials.pending)} helper={`${financials.progress}% del objetivo cubierto`} accent={financials.pending <= 0} />
          </div>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <div className="space-y-5">
            <section className="panel-card rounded-[28px] p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="eyebrow text-xs font-semibold">Ficha Hangar</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">Contexto del activo</h2>
                </div>
                {asset.comprobanteUrl ? (
                  <a
                    href={asset.comprobanteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="ghost-button inline-flex min-h-[42px] items-center rounded-[16px] px-4 text-sm font-semibold"
                  >
                    Ver comprobante base
                  </a>
                ) : null}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <InfoRow label="Proveedor" value={asset.proveedor || "-"} />
                <InfoRow label="Marca / modelo" value={[asset.marca, asset.modelo].filter(Boolean).join(" · ") || "-"} />
                <InfoRow label="Fecha de compra" value={asset.fechaCompra ? formatFecha(asset.fechaCompra) : "-"} />
                <InfoRow label="Primer pago" value={asset.fechaPrimerPago ? formatFecha(asset.fechaPrimerPago) : "-"} />
                <InfoRow label="Pago completo" value={asset.fechaPagoCompleto ? formatFecha(asset.fechaPagoCompleto) : "-"} />
                <InfoRow label="Estado general" value={isActive ? "Activo" : "Dado de baja"} />
              </div>

              {asset.notas ? (
                <div className="mt-4 rounded-[22px] border border-zinc-800 bg-zinc-950/70 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Notas</p>
                  <p className="mt-2 text-sm leading-6 text-zinc-300">{asset.notas}</p>
                </div>
              ) : null}
            </section>

            <section className="panel-card rounded-[28px] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="eyebrow text-xs font-semibold">Linea de pagos</p>
                  <h2 className="mt-2 text-xl font-semibold text-white">Movimiento del activo</h2>
                </div>
                <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs font-semibold text-zinc-400">
                  {payments.length} registro{payments.length === 1 ? "" : "s"}
                </span>
              </div>

              {payments.length === 0 ? (
                <div className="mt-5 rounded-[24px] border border-dashed border-zinc-700 bg-zinc-950/60 p-5 text-sm text-zinc-400">
                  Todavia no hay pagos asociados. Si este activo ya comenzo a comprarse, registralos
                  desde el panel lateral.
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  {payments.slice().reverse().map((payment) => (
                    <div
                      key={payment.id}
                      className="rounded-[24px] border border-zinc-800 bg-zinc-950/65 px-4 py-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-300">
                              {getPaymentTypeLabel(payment.tipo)}
                            </span>
                            <span className="text-xs text-zinc-500">{formatFecha(payment.fecha)}</span>
                          </div>
                          <p className="mt-2 text-sm font-semibold text-white">
                            {formatARS(payment.monto)}
                          </p>
                          {payment.descripcion ? (
                            <p className="mt-1 text-sm text-zinc-400">{payment.descripcion}</p>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {payment.capitalMovimientoId ? (
                            <Link
                              href="/finanzas"
                              className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs font-semibold text-zinc-300 hover:border-[#8cff59]/35 hover:text-[#b9ff96]"
                            >
                              Ver en Finanzas
                            </Link>
                          ) : null}
                          {payment.comprobanteUrl ? (
                            <a
                              href={payment.comprobanteUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs font-semibold text-zinc-300 hover:border-[#8cff59]/35 hover:text-[#b9ff96]"
                            >
                              Comprobante
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-5">
            <section className="rounded-[28px] border border-[#8cff59]/20 bg-[#8cff59]/10 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8cff59]">
                Accion inmediata
              </p>
              <h2 className="mt-2 text-xl font-semibold text-white">Registrar pago</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-200">
                Cada pago que sumas aca impacta tambien en Finanzas y recalcula el estado de compra.
              </p>
            </section>

            <section className="panel-card rounded-[28px] p-5">
              <RegistrarPagoForm assetId={asset.id} />
            </section>
          </aside>
        </section>
      </main>
    </div>
  );
}

function MetricCard({
  label,
  value,
  helper,
  accent = false,
}: {
  label: string;
  value: string;
  helper: string;
  accent?: boolean;
}) {
  return (
    <div className={`rounded-[24px] border p-4 ${accent ? "border-[#8cff59]/25 bg-[#8cff59]/10" : "border-zinc-800 bg-zinc-950/70"}`}>
      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${accent ? "text-[#b9ff96]" : "text-white"}`}>
        {value}
      </p>
      <p className="mt-1 text-xs text-zinc-500">{helper}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-zinc-800 bg-zinc-950/70 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-white">{value}</p>
    </div>
  );
}
