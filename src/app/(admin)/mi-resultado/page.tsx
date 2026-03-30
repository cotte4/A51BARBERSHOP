import Link from "next/link";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import IngresosSummary from "@/components/mi-resultado/IngresosSummary";
import EgresosSummary from "@/components/mi-resultado/EgresosSummary";
import ResultadoPersonal from "@/components/mi-resultado/ResultadoPersonal";
import GastoRapidoFAB from "@/components/gastos-rapidos/GastoRapidoFAB";
import { getMiResultadoData } from "@/lib/mi-resultado-queries";
import { registrarGastoRapidoAction } from "@/app/(admin)/gastos-rapidos/actions";

export default async function MiResultadoPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userRole = (session?.user as { role?: string })?.role;

  if (userRole !== "admin") {
    redirect("/caja");
  }

  const data = await getMiResultadoData();

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <header className="border-b border-gray-200 bg-white px-4 py-4">
        <div className="mx-auto max-w-4xl">
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600">
            ← Dashboard
          </Link>
          <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Mi Resultado</h1>
              <p className="text-sm text-gray-500">
                Hoy y mes actual, sin cuota Memas.
              </p>
            </div>
            <Link
              href="/gastos-rapidos"
              className="text-sm font-medium text-gray-700 underline hover:text-gray-900"
            >
              Ver historial de gastos rapidos
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-4xl flex-col gap-5 px-4 py-6">
        <IngresosSummary {...data.ingresos} />
        <EgresosSummary {...data.egresos} />
        <ResultadoPersonal {...data.resultado} />
      </main>

      <GastoRapidoFAB
        action={registrarGastoRapidoAction}
        returnTo="/mi-resultado"
        historyHref="/gastos-rapidos"
      />
    </div>
  );
}
