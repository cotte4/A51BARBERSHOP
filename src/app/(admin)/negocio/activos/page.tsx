import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, desc, eq, sql, sum } from "drizzle-orm";
import { db } from "@/db";
import { barberShopAssets } from "@/db/schema";
import { auth } from "@/lib/auth";
import DarDeBajaButton from "./_DarDeBajaButton";
import { ASSET_CATEGORIAS, type AssetCategoria } from "./actions";

function formatARS(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatFecha(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

const CATEGORIA_COLORS: Record<AssetCategoria, string> = {
  Mobiliario: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  Equipamiento: "border-violet-500/30 bg-violet-500/10 text-violet-300",
  "Iluminación": "border-yellow-400/30 bg-yellow-400/10 text-yellow-300",
  Herramientas: "border-orange-400/30 bg-orange-400/10 text-orange-300",
  "Tecnología": "border-cyan-400/30 bg-cyan-400/10 text-cyan-300",
  Otros: "border-zinc-600/40 bg-zinc-600/15 text-zinc-400",
};

interface ActivosPageProps {
  searchParams: Promise<{ categoria?: string }>;
}

export default async function ActivosPage({ searchParams }: ActivosPageProps) {
  const session = await auth.api.getSession({ headers: await headers() });
  const userRole = (session?.user as { role?: string })?.role;
  if (userRole !== "admin" && userRole !== "asesor") {
    redirect("/caja");
  }

  const { categoria: categoriaFiltro } = await searchParams;
  const categoriaValida = ASSET_CATEGORIAS.includes(categoriaFiltro as AssetCategoria)
    ? (categoriaFiltro as AssetCategoria)
    : null;

  const [allAssets, totalesGlobales, totalesPorCategoria] = await Promise.all([
    db
      .select()
      .from(barberShopAssets)
      .orderBy(desc(barberShopAssets.fechaCompra)),
    db
      .select({
        totalInvertido: sum(barberShopAssets.precioCompra),
        count: sql<number>`count(*)::int`,
      })
      .from(barberShopAssets)
      .where(eq(barberShopAssets.estado, "activo")),
    db
      .select({
        categoria: barberShopAssets.categoria,
        total: sum(barberShopAssets.precioCompra),
        count: sql<number>`count(*)::int`,
      })
      .from(barberShopAssets)
      .where(eq(barberShopAssets.estado, "activo"))
      .groupBy(barberShopAssets.categoria),
  ]);

  const totalInvertido = Number(totalesGlobales[0]?.totalInvertido ?? 0);
  const totalActivos = totalesGlobales[0]?.count ?? 0;

  const assetsToShow = categoriaValida
    ? allAssets.filter((a) => a.categoria === categoriaValida)
    : allAssets;

  return (
    <div className="app-shell min-h-screen">
      <header className="border-b border-zinc-800/80 bg-zinc-950/90 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div>
            <Link href="/negocio" className="text-sm text-zinc-400 hover:text-[#8cff59] transition">
              ← Negocio
            </Link>
            <h1 className="font-display mt-1 text-xl font-semibold text-white">Equipamiento</h1>
          </div>
          <Link
            href="/negocio/activos/nuevo"
            className="neon-button rounded-[20px] px-4 py-2.5 text-sm font-semibold"
          >
            + Agregar
          </Link>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 pb-24">
        {/* Resumen */}
        <section className="panel-card rounded-[28px] p-5">
          <p className="eyebrow text-xs font-semibold">Capital físico</p>
          <div className="mt-3 flex flex-wrap items-end gap-4">
            <div>
              <p className="text-xs text-zinc-500">Total invertido</p>
              <p className="font-display mt-1 text-4xl font-bold text-white">
                {formatARS(totalInvertido)}
              </p>
            </div>
            <span className="mb-1 rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs font-semibold text-zinc-300">
              {totalActivos} activo{totalActivos !== 1 ? "s" : ""}
            </span>
          </div>

          {totalesPorCategoria.length > 0 && (
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {totalesPorCategoria.map((row) => {
                const cat = row.categoria as AssetCategoria;
                const color = CATEGORIA_COLORS[cat] ?? CATEGORIA_COLORS.Otros;
                return (
                  <Link
                    key={cat}
                    href={categoriaValida === cat ? "/negocio/activos" : `/negocio/activos?categoria=${encodeURIComponent(cat)}`}
                    className={`rounded-[20px] border px-4 py-3 transition hover:-translate-y-0.5 ${
                      categoriaValida === cat ? "ring-1 ring-[#8cff59]/40" : ""
                    } ${color}`}
                  >
                    <p className="text-xs font-semibold">{cat}</p>
                    <p className="mt-1.5 text-lg font-bold text-white">
                      {formatARS(Number(row.total ?? 0))}
                    </p>
                    <p className="text-xs opacity-70">
                      {row.count} ítem{row.count !== 1 ? "s" : ""}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* Filtro activo */}
        {categoriaValida && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-zinc-400">Filtrando por:</span>
            <span className="font-semibold text-white">{categoriaValida}</span>
            <Link href="/negocio/activos" className="text-zinc-500 hover:text-[#8cff59] transition">
              × Limpiar filtro
            </Link>
          </div>
        )}

        {/* Lista */}
        <section>
          <p className="eyebrow mb-4 text-xs font-semibold">
            Historial {categoriaValida ? `— ${categoriaValida}` : "completo"}
          </p>

          {assetsToShow.length === 0 ? (
            <div className="panel-card rounded-[28px] p-6 text-center">
              <p className="text-zinc-400">
                {categoriaValida
                  ? `No hay equipamiento en la categoría "${categoriaValida}".`
                  : "Todavía no hay equipamiento registrado."}
              </p>
              <Link
                href="/negocio/activos/nuevo"
                className="mt-4 inline-block text-sm font-semibold text-[#8cff59] hover:underline"
              >
                Registrar el primer ítem →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {assetsToShow.map((asset) => {
                const cat = asset.categoria as AssetCategoria;
                const catColor = CATEGORIA_COLORS[cat] ?? CATEGORIA_COLORS.Otros;
                const isActivo = asset.estado === "activo";

                return (
                  <div
                    key={asset.id}
                    className="panel-card rounded-[22px] px-4 py-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-white">{asset.nombre}</p>
                          <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${catColor}`}>
                            {cat}
                          </span>
                          {!isActivo && (
                            <span className="rounded-full border border-zinc-600/40 bg-zinc-700/30 px-2 py-0.5 text-xs font-semibold text-zinc-500">
                              Dado de baja
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-3 text-sm text-zinc-400">
                          <span className="font-semibold text-white">
                            {formatARS(Number(asset.precioCompra))}
                          </span>
                          <span>{formatFecha(asset.fechaCompra)}</span>
                          {asset.proveedor && <span>{asset.proveedor}</span>}
                        </div>
                        {asset.notas && (
                          <p className="mt-1.5 text-xs text-zinc-500 line-clamp-2">{asset.notas}</p>
                        )}
                      </div>

                      {isActivo && <DarDeBajaButton assetId={asset.id} />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
