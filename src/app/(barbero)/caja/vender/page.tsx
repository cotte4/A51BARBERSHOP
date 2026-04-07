import Link from "next/link";
import { eq, asc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { db } from "@/db";
import { cierresCaja, mediosPago, productos } from "@/db/schema";
import VentaProductoForm from "@/components/caja/VentaProductoForm";
import { registrarVentaProducto } from "../actions";

function formatARS(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "$0";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(Number(value));
}

function getFechaHoy(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

function getLowStockLabel(stockActual: number) {
  if (stockActual <= 1) return "Stock critico";
  if (stockActual <= 3) return "Stock bajo";
  return "Stock ok";
}

export default async function VenderProductoPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10">
        <section className="w-full rounded-[32px] border border-zinc-800 bg-zinc-900 p-6 text-center shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">
            Caja segura
          </p>
          <h1 className="mt-3 text-3xl font-bold text-white">Necesitas iniciar sesion</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            La venta de productos queda reservada a usuarios autenticados para no romper stock ni
            caja.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/login"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#8cff59] px-5 text-sm font-semibold text-[#07130a] transition hover:bg-[#a8ff80]"
            >
              Ir a login
            </Link>
            <Link
              href="/caja"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-zinc-700 bg-zinc-950 px-5 text-sm font-medium text-zinc-200 transition hover:bg-zinc-800"
            >
              Volver a caja
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const fechaHoy = getFechaHoy();
  const [cierreExistente] = await db
    .select({ id: cierresCaja.id })
    .from(cierresCaja)
    .where(eq(cierresCaja.fecha, fechaHoy))
    .limit(1);

  if (cierreExistente) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10">
        <section className="w-full rounded-[32px] border border-zinc-800 bg-zinc-900 p-6 text-center shadow-[0_24px_60px_rgba(0,0,0,0.35)]">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-300">
            Caja cerrada
          </p>
          <h1 className="mt-3 text-3xl font-bold text-white">No se pueden registrar nuevas ventas</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-400">
            El cierre de hoy ya fue guardado. Si queres revisar el resumen, te dejamos el detalle
            y el acceso al historial.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href={`/caja/cierre/${fechaHoy}`}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#8cff59] px-5 text-sm font-semibold text-[#07130a] transition hover:bg-[#a8ff80]"
            >
              Ver cierre de hoy
            </Link>
            <Link
              href="/caja"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-zinc-700 bg-zinc-950 px-5 text-sm font-medium text-zinc-200 transition hover:bg-zinc-800"
            >
              Volver a caja
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const [productosActivos, mediosPagoActivos] = await Promise.all([
    db
      .select()
      .from(productos)
      .where(eq(productos.activo, true))
      .orderBy(asc(productos.nombre)),
    db.select().from(mediosPago).where(eq(mediosPago.activo, true)),
  ]);

  const productosConStock = productosActivos.filter((producto) => (producto.stockActual ?? 0) > 0);
  const stockUnidadesTotales = productosConStock.reduce(
    (sum, producto) => sum + Number(producto.stockActual ?? 0),
    0
  );
  const productosBajoStock = productosConStock
    .filter((producto) => (producto.stockActual ?? 0) <= 3)
    .slice(0, 4);
  const puedeVender = productosConStock.length > 0 && mediosPagoActivos.length > 0;

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-5 pb-24 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/caja"
          className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 px-4 text-sm font-medium text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-800 hover:text-white"
        >
          <span aria-hidden="true">&larr;</span>
          Caja
        </Link>
        <Link
          href="/inventario"
          className="inline-flex min-h-[40px] items-center rounded-full border border-zinc-800 bg-zinc-950 px-4 text-sm font-medium text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-200"
        >
          Revisar inventario
        </Link>
      </div>

      <section className="mt-5 rounded-[32px] border border-zinc-800/80 bg-[radial-gradient(circle_at_top_left,_rgba(140,255,89,0.16),_transparent_30%),linear-gradient(180deg,_rgba(24,24,27,0.96),_rgba(9,9,11,0.98))] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.35)] sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-[#8cff59]">
              Venta express
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Vender producto sin perder ritmo
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-zinc-300 sm:text-base">
              Elegi producto, cantidad y cobro en una sola pasada. El resumen te marca stock,
              comision y neto antes de confirmar.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[520px]">
            <StatCard label="Productos con stock" value={productosConStock.length} />
            <StatCard label="Medios activos" value={mediosPagoActivos.length} />
            <StatCard label="Unidades en stock" value={stockUnidadesTotales} subtle />
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div className="space-y-5">
          {puedeVender ? (
            <div className="rounded-[28px] border border-zinc-800 bg-zinc-900 p-4 sm:p-5">
              <VentaProductoForm
                action={registrarVentaProducto}
                productosList={productosConStock.map((producto) => ({
                  id: producto.id,
                  nombre: producto.nombre,
                  precioVenta: producto.precioVenta,
                  stockActual: producto.stockActual,
                }))}
                mediosPagoList={mediosPagoActivos.map((medio) => ({
                  id: medio.id,
                  nombre: medio.nombre,
                  comisionPorcentaje: medio.comisionPorcentaje,
                }))}
              />
            </div>
          ) : (
            <div className="space-y-4">
              {productosConStock.length === 0 ? (
                <section className="rounded-[28px] border border-zinc-800 bg-zinc-900 p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
                    Sin stock
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">
                    No hay productos listos para vender
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
                    Cuando no hay stock disponible, la venta queda bloqueada para evitar descuadres.
                    Cargalo desde inventario y volve a esta pantalla.
                  </p>
                  <Link
                    href="/inventario"
                    className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[#8cff59] px-5 text-sm font-semibold text-[#07130a] transition hover:bg-[#a8ff80]"
                  >
                    Ir a inventario
                  </Link>
                </section>
              ) : null}

              {mediosPagoActivos.length === 0 ? (
                <section className="rounded-[28px] border border-zinc-800 bg-zinc-900 p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
                    Sin medios
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">
                    Falta un medio de pago activo
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
                    No se puede confirmar una venta sin una forma de cobro activa. Activala en
                    configuracion y volve a esta pantalla.
                  </p>
                  <Link
                    href="/configuracion/medios-de-pago"
                    className="mt-5 inline-flex min-h-[44px] items-center justify-center rounded-xl border border-zinc-700 bg-zinc-950 px-5 text-sm font-medium text-zinc-200 transition hover:bg-zinc-800"
                  >
                    Ir a medios de pago
                  </Link>
                </section>
              ) : null}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <section className="rounded-[28px] border border-zinc-800 bg-zinc-900 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">
              Antes de cobrar
            </p>
            <h2 className="mt-2 text-lg font-semibold text-white">Orden rapido</h2>
            <div className="mt-4 space-y-3 text-sm leading-6 text-zinc-300">
              <p>1. Elegi el producto que queres sacar del stock.</p>
              <p>2. Confirmá cantidad y precio si hubo descuento o ajuste.</p>
              <p>3. Elegi el medio de pago y revisa el neto antes de guardar.</p>
            </div>
          </section>

          <section className="rounded-[28px] border border-zinc-800 bg-zinc-900 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">
                  Stock sensible
                </p>
                <h2 className="mt-2 text-lg font-semibold text-white">Lo que conviene reponer</h2>
              </div>
              <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs text-zinc-400">
                {productosBajoStock.length} alertas
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {productosBajoStock.length === 0 ? (
                <p className="text-sm text-zinc-400">No hay productos en zona de reposicion hoy.</p>
              ) : (
                productosBajoStock.map((producto) => {
                  const stockActual = producto.stockActual ?? 0;
                  return (
                    <div
                      key={producto.id}
                      className="rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-white">{producto.nombre}</p>
                        <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300">
                          {getLowStockLabel(stockActual)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-zinc-400">
                        Stock actual: {stockActual} | Precio: {formatARS(producto.precioVenta)}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section className="rounded-[28px] border border-[#8cff59]/20 bg-[#8cff59]/10 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8cff59]">
              Regla de oro
            </p>
            <p className="mt-2 text-sm leading-6 text-zinc-200">
              Si el producto o el medio de pago no estan activos, frenamos antes de escribir en
              stock o caja. Menos sorpresa, mas control.
            </p>
          </section>
        </aside>
      </section>
    </main>
  );
}

function StatCard({
  label,
  value,
  subtle = false,
}: {
  label: string;
  value: string | number;
  subtle?: boolean;
}) {
  return (
    <div className="rounded-[24px] border border-zinc-800 bg-zinc-950/70 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${subtle ? "text-zinc-200" : "text-white"}`}>
        {value}
      </p>
    </div>
  );
}
