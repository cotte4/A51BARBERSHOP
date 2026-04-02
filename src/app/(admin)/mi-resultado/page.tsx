import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import IngresosSummary from "@/components/mi-resultado/IngresosSummary";
import EgresosSummary from "@/components/mi-resultado/EgresosSummary";
import ResultadoPersonal from "@/components/mi-resultado/ResultadoPersonal";
import GastoRapidoFAB from "@/components/gastos-rapidos/GastoRapidoFAB";
import GastosHistorialModal from "@/components/gastos-rapidos/GastosHistorialModal";
import { getMiResultadoData, getGastosRapidosDelMes } from "@/lib/mi-resultado-queries";
import { registrarGastoRapidoAction } from "@/app/(admin)/gastos-rapidos/actions";

export default async function MiResultadoPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userRole = (session?.user as { role?: string })?.role;

  if (userRole !== "admin") {
    redirect("/caja");
  }

  const [data, { gastos, total }] = await Promise.all([
    getMiResultadoData(),
    getGastosRapidosDelMes(),
  ]);

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-6 pb-24">
      <div className="mx-auto flex max-w-4xl flex-col gap-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Link href="/dashboard" className="text-xs text-zinc-600 hover:text-zinc-400">
              ← Dashboard
            </Link>
            <h1 className="mt-2 text-2xl font-bold text-white">Mi Resultado</h1>
            <p className="mt-0.5 text-sm text-zinc-500">Hoy y mes actual, sin cuota Memas.</p>
          </div>
          <GastosHistorialModal gastos={gastos} total={total} />
        </div>

        <IngresosSummary {...data.ingresos} />
        <EgresosSummary {...data.egresos} />
        <ResultadoPersonal {...data.resultado} />
      </div>

      <GastoRapidoFAB
        action={registrarGastoRapidoAction}
        returnTo="/mi-resultado"
        historyHref="/gastos-rapidos"
      />
    </div>
  );
}
