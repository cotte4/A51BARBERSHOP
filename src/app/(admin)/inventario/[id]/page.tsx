import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { mediosPago, productos, stockMovimientos } from "@/db/schema";
import { registrarMovimiento } from "../actions";
import MovimientoForm from "./_MovimientoForm";

function formatARS(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(Number(value));
}

function formatFechaHora(value: Date | string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

const tipoBadge: Record<string, string> = {
  entrada: "border-emerald-500/25 bg-emerald-500/10 text-emerald-200",
  uso_interno: "border-amber-500/25 bg-amber-500/10 text-amber-200",
  ajuste: "border-zinc-700 bg-zinc-900 text-zinc-300",
  venta: "border-sky-500/25 bg-sky-500/10 text-sky-200",
};

const tipoLabel: Record<string, string> = {
  entrada: "Entrada",
  uso_interno: "Uso interno",
  ajuste: "Ajuste",
  venta: "Venta",
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProductoDetallePage({ params }: Props) {
  const { id } = await params;

  const [producto] = await db.select().from(productos).where(eq(productos.id, id)).limit(1);
  if (!producto) notFound();

  const [movimientos, mediosPagoList] = await Promise.all([
    db
      .select()
      .from(stockMovimientos)
      .where(eq(stockMovimientos.productoId, id))
      .orderBy(desc(stockMovimientos.fecha))
      .limit(20),
    db.select({ id: mediosPago.id, nombre: mediosPago.nombre }).from(mediosPago),
  ]);

  const mediosPagoMap = new Map(
    mediosPagoList.map((medio) => [medio.id, medio.nombre ?? "Medio de pago"])
  );
  const stockActual = Number(producto.stockActual ?? 0);
  const stockMinimo = Number(producto.stockMinimo ?? 5);
  const stockBajo = stockActual <= stockMinimo;
  const precioVenta = Number(producto.precioVenta ?? 0);
  const costoCompra = Number(producto.costoCompra ?? 0);
  const margenUnitario =
    producto.precioVenta !== null && producto.costoCompra !== null ? precioVenta - costoCompra : null;
  const valorStockCosto = stockActual * costoCompra;
  const registrarConId = registrarMovimiento.bind(null, id);

  return (
    <div className="min-h-screen bg-zinc-950">
      <main className="mx-auto max-w-6xl px-4 py-6 pb-24 sm:px-6 lg:px-8">
        <section className="rounded-[32px] border border-zinc-800/80 bg-[radial-gradient(circle_at_top_left,_rgba(140,255,89,0.16),_transparent_36%),linear-gradient(180deg,_rgba(24,24,27,0.96),_rgba(9,9,11,0.98))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-4">
              <Link
                href="/inventario"
                className="inline-flex items-center text-sm font-medium text-zinc-500 transition hover:text-zinc-200"
              >
                &larr; Inventario
              </Link>

              <div className="space-y-3">
                <p className="eyebrow text-[11px] font-semibold">Ficha de stock</p>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
                    {producto.nombre}
                  </h1>
                  {producto.esConsumicion ? (
                    <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                      Consumicion Marciano
                    </span>
                  ) : null}
                  {stockBajo ? (
                    <span className="rounded-full border border-amber-500/25 bg-amber-500/12 px-3 py-1 text-xs font-semibold text-amber-200">
                      Stock bajo
                    </span>
                  ) : null}
                </div>
                <p className="max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
                  Todo lo que necesita el equipo para leer el producto, tocar stock y registrar
                  movimientos sin perder contexto.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs font-semibold text-zinc-300">
                  {stockActual} en stock
                </span>
                <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs font-semibold text-zinc-300">
                  Min {stockMinimo}
                </span>
                <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs font-semibold text-zinc-300">
                  Margen {margenUnitario !== null ? formatARS(margenUnitario) : "N/A"}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/inventario/${id}/editar`}
                className="inline-flex min-h-[44px] items-center rounded-full bg-[#8cff59] px-4 text-sm font-semibold text-[#07130a] transition hover:bg-[#b6ff84]"
              >
                Editar
              </Link>
              <Link
                href="/inventario/rotacion"
                className="inline-flex min-h-[44px] items-center rounded-full border border-zinc-700 bg-zinc-900 px-4 text-sm font-medium text-zinc-200 transition hover:bg-zinc-800"
              >
                Ver rotacion
              </Link>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Stock actual"
              value={stockActual}
              helper={stockBajo ? "Reponer pronto" : "Saludable por ahora"}
              tone={
                stockBajo
                  ? "border-amber-500/20 bg-amber-500/10 text-white"
                  : "border-zinc-800 bg-zinc-950/70 text-white"
              }
            />
            <StatCard
              label="Precio venta"
              value={producto.precioVenta ? formatARS(producto.precioVenta) : "Sin precio"}
              helper="Valor mostrado en caja y fichas."
            />
            <StatCard
              label="Costo compra"
              value={producto.costoCompra ? formatARS(producto.costoCompra) : "Sin costo"}
              helper={`Valor a costo del stock: ${formatARS(valorStockCosto)}`}
            />
            <StatCard
              label="Tipo"
              value={producto.esConsumicion ? "Consumicion" : "Producto"}
              helper="Clasificacion operativa del item."
            />
          </div>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <div className="space-y-5">
            <section className="rounded-[28px] border border-zinc-800 bg-zinc-900 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="eyebrow text-xs font-semibold">Informacion</p>
                  <h2 className="font-display mt-2 text-2xl font-semibold text-white">
                    Datos clave del producto
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-zinc-400">
                    La ficha se usa como referencia rapida para compras, caja y reposicion.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <InfoCard label="Descripcion" value={producto.descripcion ?? "Sin descripcion"} />
                <InfoCard
                  label="Stock minimo"
                  value={String(producto.stockMinimo ?? 5)}
                />
                <InfoCard
                  label="Precio de venta"
                  value={producto.precioVenta ? formatARS(producto.precioVenta) : "Sin precio"}
                />
                <InfoCard
                  label="Costo de compra"
                  value={producto.costoCompra ? formatARS(producto.costoCompra) : "Sin costo"}
                />
              </div>
            </section>

            <section className="rounded-[28px] border border-zinc-800 bg-zinc-900 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="eyebrow text-xs font-semibold">Registrar</p>
                  <h2 className="font-display mt-2 text-2xl font-semibold text-white">
                    Movimiento manual
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-zinc-400">
                    Solo administracion puede tocar el stock manualmente. Cada carga queda
                    registrada para auditoria.
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-[24px] border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                Usalo para entradas, bajas internas o ajustes puntuales cuando el stock real no
                coincide con el sistema.
              </div>

              <div className="mt-5">
                <MovimientoForm registrarAction={registrarConId} />
              </div>
            </section>

            <section className="rounded-[28px] border border-zinc-800 bg-zinc-900 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="eyebrow text-xs font-semibold">Historial</p>
                  <h2 className="font-display mt-2 text-2xl font-semibold text-white">
                    Ultimos movimientos
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-zinc-400">
                    La linea de tiempo muestra como se movio este producto en el tiempo.
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {movimientos.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-zinc-700 bg-zinc-950/30 p-8 text-center text-sm text-zinc-400">
                    No hay movimientos registrados.
                  </div>
                ) : (
                  movimientos.map((movimiento) => {
                    const qty = Number(movimiento.cantidad ?? 0);
                    const isPositive = qty >= 0;

                    return (
                      <article
                        key={movimiento.id}
                        className="rounded-[24px] border border-zinc-800 bg-zinc-950/60 p-4"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                                  tipoBadge[movimiento.tipo] ?? "border-zinc-700 bg-zinc-900 text-zinc-300"
                                }`}
                              >
                                {tipoLabel[movimiento.tipo] ?? movimiento.tipo}
                              </span>
                              <span className="text-xs text-zinc-500">
                                {formatFechaHora(movimiento.fecha)}
                              </span>
                            </div>
                            <p className="mt-3 text-sm font-medium text-white">
                              {formatMovimientoTitulo(
                                movimiento.tipo,
                                movimiento.notas,
                                mediosPagoMap
                              )}
                            </p>
                            {movimiento.notas?.trim() ? (
                              <p className="mt-2 text-sm leading-6 text-zinc-400">
                                {movimiento.notas}
                              </p>
                            ) : null}
                          </div>

                          <div className="rounded-[20px] border border-zinc-800 bg-zinc-900 px-4 py-3 text-right">
                            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                              Cantidad
                            </p>
                            <p
                              className={`mt-2 text-2xl font-bold ${
                                isPositive ? "text-emerald-200" : "text-red-200"
                              }`}
                            >
                              {qty > 0 ? "+" : ""}
                              {qty}
                            </p>
                          </div>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </section>
          </div>

          <aside className="space-y-5">
            <section className="rounded-[28px] border border-zinc-800 bg-zinc-900 p-5">
              <p className="eyebrow text-xs font-semibold">Lectura rapida</p>
              <h2 className="font-display mt-2 text-xl font-semibold text-white">
                Estado del item
              </h2>
              <div className="mt-4 grid gap-3">
                <MiniStat label="Actual" value={String(stockActual)} />
                <MiniStat label="Minimo" value={String(stockMinimo)} />
                <MiniStat
                  label="Valor a costo"
                  value={formatARS(valorStockCosto)}
                />
                <MiniStat
                  label="Margen unitario"
                  value={margenUnitario !== null ? formatARS(margenUnitario) : "N/A"}
                />
              </div>
            </section>

            <section className="rounded-[28px] border border-zinc-800 bg-zinc-900 p-5">
              <p className="eyebrow text-xs font-semibold">Atajos</p>
              <h2 className="font-display mt-2 text-xl font-semibold text-white">
                Acciones seguras
              </h2>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Volve al inventario general, ajusta la ficha o revisa la rotacion historica.
              </p>
              <div className="mt-4 flex flex-col gap-3">
                <Link
                  href={`/inventario/${id}/editar`}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-[#8cff59] px-4 text-sm font-semibold text-[#07130a] transition hover:bg-[#b6ff84]"
                >
                  Editar ficha
                </Link>
                <Link
                  href="/inventario/rotacion"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-950 px-4 text-sm font-medium text-zinc-200 transition hover:bg-zinc-800"
                >
                  Ver rotacion
                </Link>
              </div>
            </section>
          </aside>
        </section>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  helper,
  tone = "border-zinc-800 bg-zinc-950/70 text-white",
}: {
  label: string;
  value: string | number;
  helper: string;
  tone?: string;
}) {
  return (
    <div className={`rounded-[24px] border px-4 py-4 ${tone}`}>
      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-white">{value}</p>
      <p className="mt-1 text-xs leading-5 text-zinc-400">{helper}</p>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-zinc-800 bg-zinc-950/70 px-4 py-4">
      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="mt-2 text-sm leading-6 text-zinc-200">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-zinc-800 bg-zinc-950/70 px-4 py-4">
      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function formatMovimientoTitulo(
  tipo: string,
  nota: string | null,
  mediosPagoMap: Map<string, string>
) {
  if (tipo === "venta") {
    if (nota && mediosPagoMap.has(nota)) {
      return `Venta por ${mediosPagoMap.get(nota)}`;
    }
    return "Venta registrada";
  }

  if (nota?.trim()) {
    return nota;
  }

  if (tipo === "entrada") return "Reposicion manual";
  if (tipo === "uso_interno") return "Uso interno del salon";
  if (tipo === "ajuste") return "Ajuste manual";
  return "Movimiento";
}
