import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import AlienSignalPanel from "@/components/branding/AlienSignalPanel";
import { getComparativaTemporadas } from "@/lib/dashboard-queries";

function formatARS(val: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(val);
}

function formatPct(val: number): string {
  const sign = val >= 0 ? "+" : "";
  return `${sign}${val.toFixed(1)}%`;
}

function formatPeriodo(inicio: string, fin: string): string {
  const opciones: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    timeZone: "America/Argentina/Buenos_Aires",
  };
  const i = new Date(inicio + "T12:00:00").toLocaleDateString("es-AR", opciones);
  const f = new Date(fin + "T12:00:00").toLocaleDateString("es-AR", {
    ...opciones,
    year: "numeric",
  });
  return `${i} — ${f}`;
}

export default async function TemporadasPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userRole = (session?.user as { role?: string })?.role;
  if (userRole !== "admin") redirect("/caja");

  const temporadas = await getComparativaTemporadas();

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="bg-zinc-900 border-b border-zinc-800 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/dashboard"
            className="text-zinc-400 hover:text-[#8cff59] text-sm mb-2 block"
          >
            ← Dashboard
          </Link>
          <h1 className="font-display text-xl font-bold text-white">Temporadas</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-4">
        <AlienSignalPanel
          eyebrow="Radar de temporadas"
          title="Senal de comparativa"
          detail="La cabina alinea proyección y realidad para leer si cada temporada empuja, frena o se queda corta."
          badges={[
            `${temporadas.length} temporadas`,
            temporadas.some((item) => item.estado === "activa") ? "hay activa" : "sin activa",
            temporadas.some((item) => item.estado === "futura") ? "hay futura" : "sin futura",
          ]}
          tone="sky"
        />

        {temporadas.length === 0 ? (
          <div className="panel-card rounded-[28px] p-8 text-center">
            <p className="text-zinc-400 text-sm">No hay temporadas configuradas.</p>
            <Link
              href="/configuracion/temporadas"
              className="mt-3 inline-block text-sm text-white underline hover:text-[#8cff59]"
            >
              Configurar temporadas →
            </Link>
          </div>
        ) : (
          temporadas.map((temp) => {
            const esFutura = temp.estado === "futura";
            const esActiva = temp.estado === "activa";

            return (
              <div
                key={temp.id}
                className={`panel-card rounded-[28px] border p-5 ${
                  esActiva
                    ? "border-[#8cff59]/40"
                    : esFutura
                    ? "border-zinc-800 opacity-75"
                    : "border-zinc-800"
                }`}
              >
                {/* Header de la temporada */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-bold text-white">{temp.nombre}</h2>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          esActiva
                            ? "bg-emerald-500/15 text-emerald-300"
                            : esFutura
                            ? "bg-sky-500/15 text-sky-300"
                            : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {esActiva ? "Activa" : esFutura ? "Futura" : "Completada"}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      {formatPeriodo(temp.fechaInicio, temp.fechaFin)}
                    </p>
                  </div>
                </div>

                {/* Grilla proyectado vs real */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                  {/* Cortes/día */}
                  <div>
                    <p className="text-xs text-zinc-400 mb-1">Cortes/día proy.</p>
                    <p className="text-base font-semibold text-white">
                      {temp.cortesDiaProyectados}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-400 mb-1">Cortes/día real</p>
                    {esFutura || temp.cortesDiaReal === null ? (
                      <p className="text-base font-semibold text-zinc-600">—</p>
                    ) : (
                      <p className="text-base font-semibold text-white">
                        {temp.cortesDiaReal.toFixed(1)}
                      </p>
                    )}
                  </div>

                  {/* Precio */}
                  <div>
                    <p className="text-xs text-zinc-400 mb-1">Precio proy.</p>
                    <p className="text-base font-semibold text-white">
                      {formatARS(temp.precioBaseProyectado)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-400 mb-1">Precio real</p>
                    {esFutura || temp.precioPromedioReal === null ? (
                      <p className="text-base font-semibold text-zinc-600">—</p>
                    ) : (
                      <p className="text-base font-semibold text-white">
                        {formatARS(temp.precioPromedioReal)}
                      </p>
                    )}
                  </div>

                  {/* Ingreso casa */}
                  <div>
                    <p className="text-xs text-zinc-400 mb-1">Ingreso casa proy.</p>
                    <p className="text-base font-semibold text-white">
                      {formatARS(temp.ingresoCasaProyectado)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-400 mb-1">Ingreso casa real</p>
                    {esFutura || temp.ingresoCasaReal === null ? (
                      <p className="text-base font-semibold text-zinc-600">—</p>
                    ) : (
                      <p className="text-base font-semibold text-white">
                        {formatARS(temp.ingresoCasaReal)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Desviación */}
                {!esFutura && temp.desviacionPct !== null && (
                  <div
                    className={`mt-4 pt-3 border-t border-zinc-800 flex items-center justify-between`}
                  >
                    <p className="text-xs text-zinc-400">Desviación vs proyectado</p>
                    <span
                      className={`text-sm font-bold ${
                        temp.desviacionPct >= 0 ? "text-emerald-300" : "text-red-300"
                      }`}
                    >
                      {formatPct(temp.desviacionPct)}
                    </span>
                  </div>
                )}

                {!esFutura && temp.ingresoCasaReal === null && (
                  <p className="text-xs text-zinc-400 mt-3 pt-3 border-t border-zinc-800">
                    Sin datos de atenciones registrados en este período.
                  </p>
                )}
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
