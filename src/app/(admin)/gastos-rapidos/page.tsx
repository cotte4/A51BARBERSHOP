import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import GastoRapidoFAB from "@/components/gastos-rapidos/GastoRapidoFAB";
import GastoRapidoList from "@/components/gastos-rapidos/GastoRapidoList";
import { auth } from "@/lib/auth";
import { GASTO_RAPIDO_CATEGORIAS } from "@/lib/gastos-rapidos";
import { getGastosRapidosDelMes } from "@/lib/mi-resultado-queries";
import { registrarGastoRapidoAction } from "./actions";

type SearchParams = Promise<{ categoria?: string | string[] | undefined }>;

function formatARS(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(value);
}

export default async function GastosRapidosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  const userRole = (session?.user as { role?: string })?.role;

  if (userRole !== "admin") {
    redirect("/caja");
  }

  const [{ gastos, total, totalsByCategory }, params] = await Promise.all([
    getGastosRapidosDelMes(),
    searchParams,
  ]);

  const categoriaSeleccionada =
    typeof params.categoria === "string" ? params.categoria : undefined;

  const gastosFiltrados = categoriaSeleccionada
    ? gastos.filter((gasto) => {
        const categoria = GASTO_RAPIDO_CATEGORIAS.find(
          (item) => item.emoji === gasto.categoriaVisual
        );
        return categoria?.key === categoriaSeleccionada;
      })
    : gastos;

  const mesActual = new Date().toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-4 py-4">
        <div className="mx-auto max-w-4xl">
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600">
            ← Dashboard
          </Link>
          <div className="mt-2 flex items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gastos rápidos</h1>
              <p className="text-sm capitalize text-gray-500">{mesActual}</p>
            </div>
            <div className="rounded-2xl bg-gray-900 px-4 py-3 text-right text-white">
              <p className="text-xs uppercase tracking-wide text-gray-300">Total general</p>
              <p className="mt-1 text-2xl font-bold text-red-300">{formatARS(total)}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-6">
        <section className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400">
                Acción rápida
              </p>
              <h2 className="mt-2 text-xl font-semibold text-gray-900">
                Registrar un gasto sin entrar a reportes
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Ideal para café, cápsulas, limpieza y compras chicas del día.
              </p>
            </div>

            <GastoRapidoFAB
              action={registrarGastoRapidoAction}
              returnTo="/gastos-rapidos"
              historyHref="/gastos-rapidos"
              fixed={false}
              showHistoryLink={false}
              buttonLabel="+ Registrar nuevo gasto"
              buttonClassName="inline-flex min-h-[56px] items-center justify-center rounded-2xl bg-gray-900 px-6 text-sm font-semibold text-white transition hover:bg-gray-700"
            />
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {GASTO_RAPIDO_CATEGORIAS.map((categoria) => (
            <Link
              key={categoria.key}
              href={`/gastos-rapidos?categoria=${encodeURIComponent(categoria.key)}`}
              className={`rounded-[24px] border p-4 shadow-sm transition hover:-translate-y-0.5 ${
                categoriaSeleccionada === categoria.key
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-200 bg-white text-gray-900 hover:border-gray-300"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-2xl">{categoria.emoji}</p>
                  <p className="mt-3 text-base font-semibold">{categoria.label}</p>
                  <p
                    className={`mt-1 text-sm ${
                      categoriaSeleccionada === categoria.key ? "text-gray-200" : "text-gray-500"
                    }`}
                  >
                    Ver y cargar gastos de esta categoría
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-semibold ${
                    categoriaSeleccionada === categoria.key
                      ? "bg-white/10 text-white"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {formatARS(totalsByCategory[categoria.key] ?? 0)}
                </span>
              </div>
            </Link>
          ))}
        </section>

        <section className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-400">
                Historial del mes
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {categoriaSeleccionada
                  ? `Mostrando ${gastosFiltrados.length} gasto(s) de la categoría seleccionada.`
                  : `${gastosFiltrados.length} gasto(s) registrados este mes.`}
              </p>
            </div>
            <Link
              href="/gastos-rapidos"
              className="text-sm font-medium text-gray-600 underline-offset-4 hover:text-gray-900 hover:underline"
            >
              Ver todo
            </Link>
          </div>
          <GastoRapidoList gastos={gastosFiltrados} />
        </section>
      </main>

      <GastoRapidoFAB
        action={registrarGastoRapidoAction}
        returnTo="/gastos-rapidos"
        historyHref="/gastos-rapidos"
      />
    </div>
  );
}
