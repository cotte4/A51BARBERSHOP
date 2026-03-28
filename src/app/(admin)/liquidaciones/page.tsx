import { db } from "@/db";
import { liquidaciones, barberos } from "@/db/schema";
import { desc } from "drizzle-orm";
import Link from "next/link";

function formatARS(val: string | null | undefined): string {
  if (!val) return "$0";
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0 }).format(Number(val));
}

export default async function LiquidacionesPage() {
  const lista = await db
    .select()
    .from(liquidaciones)
    .orderBy(desc(liquidaciones.creadoEn));

  const barberosMap = new Map((await db.select().from(barberos)).map(b => [b.id, b]));

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 text-sm mb-2 block">← Dashboard</Link>
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">Liquidaciones</h1>
            <Link
              href="/liquidaciones/nueva"
              className="min-h-[44px] inline-flex items-center bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700"
            >
              + Generar
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {lista.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-gray-500">No hay liquidaciones generadas todavía.</p>
            <Link href="/liquidaciones/nueva" className="mt-4 inline-block text-sm text-gray-900 underline">
              Generar la primera
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {lista.map((liq) => {
              const barbero = barberosMap.get(liq.barberoId ?? "");
              const inicio = liq.periodoInicio
                ? new Date(liq.periodoInicio + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short", timeZone: "America/Argentina/Buenos_Aires" })
                : "—";
              const fin = liq.periodoFin
                ? new Date(liq.periodoFin + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short", year: "numeric", timeZone: "America/Argentina/Buenos_Aires" })
                : "—";
              return (
                <Link
                  key={liq.id}
                  href={`/liquidaciones/${liq.id}`}
                  className="bg-white rounded-xl border border-gray-200 p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900">{barbero?.nombre ?? "—"}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${liq.pagado ? "bg-green-50 text-green-700" : "bg-yellow-50 text-yellow-700"}`}>
                          {liq.pagado ? "Pagado" : "Pendiente"}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 mt-0.5">{inicio} — {fin}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-bold text-gray-900">{formatARS(liq.montoAPagar)}</div>
                      <div className="text-xs text-gray-400">{liq.totalCortes} cortes</div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
