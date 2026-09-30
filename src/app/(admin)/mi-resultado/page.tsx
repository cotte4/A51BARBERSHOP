import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { formatARS } from "@/lib/format";
import { getMiResultadoData } from "@/lib/mi-resultado-queries";

function formatMonthLabel(fecha: string) {
  return new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date(`${fecha}T12:00:00`));
}

export default async function MiResultadoPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userRole = (session?.user as { role?: string })?.role;

  if (userRole !== "admin" && userRole !== "asesor") {
    redirect("/caja");
  }

  const { fechaHoy, ingresos, resultado } = await getMiResultadoData();

  return (
    <div className="app-shell min-h-screen px-4 py-6 pb-28">
      <div className="mx-auto flex max-w-xl flex-col gap-6">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-white">Mi resultado</h1>
          <p className="mt-1 text-sm capitalize text-zinc-300">{formatMonthLabel(fechaHoy)}</p>
        </div>

        {/* Lo de Pinky: sus cortes, ya sin la comisión de MP / tarjeta */}
        <section className="panel-card rounded-[28px] p-6">
          <p className="text-sm text-zinc-300">Tus cortes este mes</p>
          <p className="font-display mt-1 text-5xl font-bold tabular-nums tracking-tight text-white">
            {formatARS(resultado.paraVosMes)}
          </p>
          <p className="mt-2 text-sm tabular-nums text-zinc-300">Hoy: {formatARS(resultado.paraVosHoy)}</p>
        </section>

        {/* Lo de la casa: la suma se puede hacer a mano */}
        <section className="panel-card rounded-[28px] p-6">
          <h2 className="font-display text-xl font-semibold text-white">La barber este mes</h2>
          <dl className="mt-3 text-base tabular-nums">
            <div className="flex items-baseline justify-between gap-4 py-1.5">
              <dt className="text-zinc-300">Cortes de los barberos (parte de la casa)</dt>
              <dd className="text-white">{formatARS(ingresos.aporteCasaMes)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 py-1.5">
              <dt className="text-zinc-300">Ganancia por productos</dt>
              <dd className="text-white">{formatARS(ingresos.productosMes)}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-4 py-1.5">
              <dt className="text-zinc-300">Gastos del mes</dt>
              <dd className="text-white">− {formatARS(resultado.gastosMes)}</dd>
            </div>
            <div className="mt-1 flex items-baseline justify-between gap-4 border-t border-zinc-700 pt-3">
              <dt className="font-semibold text-white">Queda para la barber</dt>
              <dd className="font-display text-2xl font-bold text-white">
                {formatARS(resultado.paraLaBarberMes)}
              </dd>
            </div>
          </dl>
        </section>

        <div className="flex flex-wrap gap-x-6 gap-y-2 px-1 text-sm font-medium text-zinc-300">
          <Link href="/gastos-rapidos" className="underline underline-offset-4 hover:text-[#8cff59]">
            Ver los gastos
          </Link>
          <Link href="/dashboard/pl" className="underline underline-offset-4 hover:text-[#8cff59]">
            Ver el mes completo
          </Link>
        </div>
      </div>
    </div>
  );
}
