import Link from "next/link";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { GASTO_RAPIDO_CATEGORIAS } from "@/lib/gastos-rapidos";
import { getGastosRapidosDelMes } from "@/lib/mi-resultado-queries";
import GastoRapidoFAB from "@/components/gastos-rapidos/GastoRapidoFAB";
import GastoRapidoList from "@/components/gastos-rapidos/GastoRapidoList";
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
    <div className="min-h-screen bg-gray-50 pb-28">
      <header className="border-b border-gray-200 bg-white px-4 py-4">
        <div className="mx-auto max-w-4xl">
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600">
            ← Dashboard
          </Link>
          <div className="mt-2 flex items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gastos rapidos</h1>
              <p className="text-sm text-gray-500 capitalize">{mesActual}</p>
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
          <div className="flex flex-wrap gap-2">
            <Link
              href="/gastos-rapidos"
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                !categoriaSeleccionada
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Todas
            </Link>
            {GASTO_RAPIDO_CATEGORIAS.map((categoria) => (
              <Link
                key={categoria.key}
                href={`/gastos-rapidos?categoria=${encodeURIComponent(categoria.key)}`}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  categoriaSeleccionada === categoria.key
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {categoria.emoji} {categoria.label}
              </Link>
            ))}
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
          {GASTO_RAPIDO_CATEGORIAS.map((categoria) => (
            <div
              key={categoria.key}
              className="rounded-[24px] border border-gray-200 bg-white p-4 shadow-sm"
            >
              <p className="text-2xl">{categoria.emoji}</p>
              <p className="mt-2 text-sm font-semibold text-gray-900">{categoria.label}</p>
              <p className="mt-3 text-lg font-bold text-gray-900">
                {formatARS(totalsByCategory[categoria.key] ?? 0)}
              </p>
            </div>
          ))}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-400">
              Historial del mes
            </h2>
            <span className="text-sm text-gray-500">{gastosFiltrados.length} registros</span>
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
