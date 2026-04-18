import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  barberShopAssetPayments,
  barberShopAssets,
  capitalMovimientos,
  costosFijosNegocio,
  costosFijosValores,
} from "@/db/schema";
import { auth } from "@/lib/auth";
import { formatARS } from "@/lib/format";
import {
  getAssetFinancials,
  getEstadoCompraLabel,
  HANGAR_ASSET_CATEGORIAS,
} from "@/lib/hangar";

function getMesActualArgentina() {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  }).slice(0, 7);
}

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

function getCategoryTone(category: string) {
  switch (category) {
    case "Mobiliario":
      return "border-sky-500/30 bg-sky-500/10";
    case "Equipamiento":
      return "border-violet-500/30 bg-violet-500/10";
    case "Iluminación":
      return "border-yellow-400/30 bg-yellow-400/10";
    case "Herramientas":
      return "border-orange-400/30 bg-orange-400/10";
    case "Tecnología":
      return "border-cyan-400/30 bg-cyan-400/10";
    default:
      return "border-zinc-700 bg-zinc-800/80";
  }
}

export default async function HangarPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string; estado?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  const userRole = (session?.user as { role?: string } | undefined)?.role;
  if (userRole !== "admin" && userRole !== "asesor") {
    redirect("/caja");
  }

  const { categoria, estado } = await searchParams;
  const mesActual = getMesActualArgentina();

  const [assets, payments, capitalRows, costosMes] = await Promise.all([
    db.select().from(barberShopAssets).orderBy(desc(barberShopAssets.creadoEn)),
    db.select().from(barberShopAssetPayments).orderBy(desc(barberShopAssetPayments.fecha)),
    db.select().from(capitalMovimientos).orderBy(desc(capitalMovimientos.fecha)),
    db
      .select({ monto: costosFijosValores.monto, categoria: costosFijosNegocio.categoria })
      .from(costosFijosValores)
      .innerJoin(costosFijosNegocio, eq(costosFijosValores.costoId, costosFijosNegocio.id))
      .where(eq(costosFijosValores.mes, mesActual)),
  ]);

  const paymentsByAsset = new Map<string, typeof payments>();
  for (const payment of payments) {
    const list = paymentsByAsset.get(payment.assetId) ?? [];
    list.push(payment);
    paymentsByAsset.set(payment.assetId, list);
  }

  const assetRows = assets.map((asset) => {
    const assetPayments = paymentsByAsset.get(asset.id) ?? [];
    const orderedPayments = assetPayments.slice().reverse();
    const totalPaid = assetPayments.reduce((sum, payment) => sum + Number(payment.monto ?? 0), 0);
    const financials = getAssetFinancials({
      precioObjetivo: asset.precioObjetivo,
      precioCompra: asset.precioCompra,
      totalPaid,
      paymentCount: assetPayments.length,
      estadoCompra: asset.estadoCompra,
      firstPaymentType: orderedPayments[0]?.tipo ?? null,
    });

    return {
      ...asset,
      payments: orderedPayments,
      financials,
    };
  });

  const filteredAssets = assetRows.filter((asset) => {
    if (categoria && asset.categoria !== categoria) return false;
    if (estado && asset.financials.estadoCompra !== estado) return false;
    return true;
  });

  const groupedAssets = HANGAR_ASSET_CATEGORIAS.map((category) => {
    const items = filteredAssets.filter((asset) => asset.categoria === category);
    const totalTarget = items.reduce((sum, asset) => sum + asset.financials.target, 0);
    const totalPaid = items.reduce((sum, asset) => sum + asset.financials.paid, 0);

    return {
      category,
      items,
      totalTarget,
      totalPaid,
    };
  }).filter((group) => group.items.length > 0);

  const totalAportado = capitalRows
    .filter((movement) => movement.tipo === "aporte")
    .reduce((sum, movement) => sum + Number(movement.monto ?? 0), 0);
  const totalRetirado = capitalRows
    .filter((movement) => movement.tipo === "retiro")
    .reduce((sum, movement) => sum + Number(movement.monto ?? 0), 0);
  const totalInvertido = capitalRows
    .filter((movement) => movement.tipo === "inversion_activo")
    .reduce((sum, movement) => sum + Number(movement.monto ?? 0), 0);
  const capitalBase = totalAportado - totalRetirado;
  const capitalDisponible = capitalBase - totalInvertido;
  const totalComprometido = assetRows.reduce((sum, asset) => sum + asset.financials.pending, 0);
  const totalTarget = assetRows.reduce((sum, asset) => sum + asset.financials.target, 0);
  const totalActivos = assetRows.filter((asset) => asset.estado === "activo").length;
  const comprasRecientes = assetRows.slice(0, 4);
  const costosFijosMes = costosMes.reduce((sum, item) => sum + Number(item.monto ?? 0), 0);

  return (
    <div className="app-shell min-h-screen pb-24">
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[34px] border border-zinc-800/80 bg-[radial-gradient(circle_at_top_right,_rgba(140,255,89,0.18),_transparent_28%),radial-gradient(circle_at_bottom_left,_rgba(56,189,248,0.08),_transparent_24%),linear-gradient(180deg,_rgba(24,24,27,0.98),_rgba(9,9,11,0.98))] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.35)] sm:p-7">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
            <div className="space-y-5">
              <div className="space-y-3">
                <p className="eyebrow text-xs font-semibold">Hangar / Inversion inicial</p>
                <h1 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  Capital fisico y compras del negocio
                </h1>
                <p className="max-w-3xl text-sm leading-6 text-zinc-300 sm:text-base">
                  El Hangar organiza lo que querias comprar, lo que ya entro, lo que sigue en cuotas y
                  cuanto capital queda disponible sin mezclarlo con costos fijos del asesor.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <FilterChip href="/negocio/activos" active={!categoria && !estado} label="Todo Hangar" />
                {HANGAR_ASSET_CATEGORIAS.map((item) => (
                  <FilterChip
                    key={item}
                    href={`/negocio/activos?categoria=${encodeURIComponent(item)}`}
                    active={categoria === item}
                    label={item}
                  />
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <HeroStat label="Capital disponible" value={formatARS(capitalDisponible)} helper="Aportes - retiros - inversion en activos" accent />
                <HeroStat label="Ya invertido" value={formatARS(totalInvertido)} helper="Pagos que ya pegaron en Finanzas" />
                <HeroStat label="Comprometido" value={formatARS(totalComprometido)} helper="Saldo pendiente de compras en curso" />
                <HeroStat label="Activos vivos" value={`${totalActivos}`} helper={`${assetRows.length} items en total`} />
              </div>
            </div>

            <div className="space-y-4">
              <section className="panel-soft rounded-[28px] p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="eyebrow text-xs font-semibold">Contexto lateral</p>
                    <h2 className="mt-2 text-xl font-semibold text-white">Finanzas y costos</h2>
                  </div>
                  <Link
                    href="/finanzas"
                    className="ghost-button inline-flex min-h-[42px] items-center rounded-[16px] px-4 text-sm font-semibold"
                  >
                    Abrir Finanzas
                  </Link>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <MiniMetric label="Capital base" value={formatARS(capitalBase)} helper="Antes de descontar inversion de activos" />
                  <MiniMetric label="Costos fijos mes" value={formatARS(costosFijosMes)} helper={`${costosMes.length} item${costosMes.length === 1 ? "" : "s"} del asesor`} />
                </div>
              </section>

              <section className="panel-soft rounded-[28px] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="eyebrow text-xs font-semibold">Pulso actual</p>
                    <h2 className="mt-2 text-xl font-semibold text-white">Compras recientes</h2>
                  </div>
                  <Link
                    href="/negocio/activos/nuevo"
                    className="neon-button inline-flex min-h-[42px] items-center rounded-[16px] px-4 text-sm font-semibold"
                  >
                    + Nuevo activo
                  </Link>
                </div>

                <div className="mt-4 space-y-3">
                  {comprasRecientes.length > 0 ? (
                    comprasRecientes.map((asset) => (
                      <Link
                        key={asset.id}
                        href={`/negocio/activos/${asset.id}`}
                        className="flex items-center gap-3 rounded-[22px] border border-zinc-800 bg-zinc-950/70 px-4 py-3 hover:border-[#8cff59]/25 hover:bg-zinc-900"
                      >
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
                          {asset.fotoUrl ? (
                            <Image src={asset.fotoUrl} alt={asset.nombre} fill sizes="48px" className="object-cover" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                              HGR
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-white">{asset.nombre}</p>
                          <p className="mt-1 text-xs text-zinc-500">
                            {asset.categoria} · {getEstadoCompraLabel(asset.financials.estadoCompra)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-white">{formatARS(asset.financials.target)}</p>
                          <p className="text-xs text-zinc-500">{asset.financials.progress}% cubierto</p>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="rounded-[24px] border border-dashed border-zinc-700 bg-zinc-950/60 p-5 text-sm text-zinc-400">
                      Todavia no hay activos cargados. El primer item abre el Hangar.
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        </section>

        <section className="mt-5 flex flex-wrap items-center gap-2">
          {["planificado", "senado", "en_cuotas", "pagado"].map((item) => (
            <FilterChip
              key={item}
              href={`/negocio/activos?estado=${item}`}
              active={estado === item}
              label={getEstadoCompraLabel(item)}
            />
          ))}
        </section>

        <section className="mt-5 space-y-5">
          {groupedAssets.length === 0 ? (
            <div className="panel-card rounded-[30px] p-6 text-center">
              <p className="text-sm text-zinc-400">
                No encontramos activos para el filtro actual.
              </p>
              <Link
                href="/negocio/activos"
                className="mt-3 inline-flex text-sm font-semibold text-[#8cff59] hover:underline"
              >
                Limpiar filtros
              </Link>
            </div>
          ) : (
            groupedAssets.map((group) => (
              <section key={group.category} className="rounded-[30px] border border-zinc-800/80 bg-[linear-gradient(180deg,rgba(24,24,27,0.96),rgba(9,9,11,0.98))] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.25)]">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getCategoryTone(group.category)}`}>
                      {group.category}
                    </div>
                    <h2 className="font-display mt-3 text-2xl font-semibold text-white">{group.items.length} item{group.items.length === 1 ? "" : "s"}</h2>
                    <p className="mt-1 text-sm text-zinc-400">
                      Objetivo {formatARS(group.totalTarget)} · Pagado {formatARS(group.totalPaid)}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {group.items.map((asset) => (
                    <Link
                      key={asset.id}
                      href={`/negocio/activos/${asset.id}`}
                      className="group overflow-hidden rounded-[28px] border border-zinc-800 bg-zinc-950/70 hover:border-[#8cff59]/25 hover:bg-zinc-900"
                    >
                      <div className="relative h-44 overflow-hidden border-b border-zinc-800 bg-zinc-900">
                        {asset.fotoUrl ? (
                          <Image
                            src={asset.fotoUrl}
                            alt={asset.nombre}
                            fill
                            sizes="(max-width: 768px) 100vw, 33vw"
                            className="object-cover transition duration-300 group-hover:scale-[1.03]"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(140,255,89,0.18),_transparent_30%),linear-gradient(180deg,rgba(39,39,42,0.92),rgba(18,18,20,0.92))]" />
                        )}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${getEstadoTone(asset.financials.estadoCompra)}`}>
                              {getEstadoCompraLabel(asset.financials.estadoCompra)}
                            </span>
                            {!asset.fotoUrl ? (
                              <span className="rounded-full border border-zinc-700 bg-zinc-900/80 px-2.5 py-1 text-[11px] font-semibold text-zinc-300">
                                Sin foto
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4 p-5">
                        <div>
                          <p className="text-lg font-semibold text-white">{asset.nombre}</p>
                          <p className="mt-1 text-sm text-zinc-400">
                            {[asset.marca, asset.modelo].filter(Boolean).join(" · ") || "Sin marca/modelo cargado"}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-zinc-500">
                            <span>Avance</span>
                            <span>{asset.financials.progress}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-zinc-800">
                            <div
                              className="h-2 rounded-full bg-[linear-gradient(90deg,#8cff59,#b6ff84)]"
                              style={{ width: `${Math.max(asset.financials.progress, 4)}%` }}
                            />
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                          <CardMetric label="Objetivo" value={formatARS(asset.financials.target)} />
                          <CardMetric label="Pagado" value={formatARS(asset.financials.paid)} />
                          <CardMetric label="Pendiente" value={formatARS(asset.financials.pending)} />
                        </div>

                        <div className="flex items-center justify-between text-xs text-zinc-500">
                          <span>{asset.payments.length} pago{asset.payments.length === 1 ? "" : "s"}</span>
                          <span>{asset.estado === "activo" ? "Activo" : "Baja"}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            ))
          )}
        </section>
      </main>
    </div>
  );
}

function HeroStat({
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
    <div className={`rounded-[24px] border p-4 ${accent ? "border-[#8cff59]/22 bg-[#8cff59]/10" : "border-zinc-800 bg-zinc-950/70"}`}>
      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${accent ? "text-[#b9ff96]" : "text-white"}`}>
        {value}
      </p>
      <p className="mt-1 text-xs text-zinc-500">{helper}</p>
    </div>
  );
}

function MiniMetric({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-[22px] border border-zinc-800 bg-zinc-950/70 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{helper}</p>
    </div>
  );
}

function CardMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-zinc-800 bg-zinc-950/80 px-3 py-3">
      <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function FilterChip({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${active ? "border-[#8cff59]/30 bg-[#8cff59]/10 text-[#b9ff96]" : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"}`}
    >
      {label}
    </Link>
  );
}
