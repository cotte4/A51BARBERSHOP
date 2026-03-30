import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/dashboard"
            className="text-gray-400 hover:text-gray-600 text-sm mb-2 block"
          >
            ← Dashboard
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Temporadas</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-4">
        {temporadas.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-gray-500 text-sm">No hay temporadas configuradas.</p>
            <Link
              href="/configuracion/temporadas"
              className="mt-3 inline-block text-sm text-gray-900 underline"
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
                className={`bg-white rounded-xl border p-5 ${
                  esActiva
                    ? "border-gray-900 shadow-sm"
                    : esFutura
                    ? "border-gray-200 opacity-75"
                    : "border-gray-200"
                }`}
              >
                {/* Header de la temporada */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-bold text-gray-900">{temp.nombre}</h2>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          esActiva
                            ? "bg-green-100 text-green-700"
                            : esFutura
                            ? "bg-blue-50 text-blue-600"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {esActiva ? "Activa" : esFutura ? "Futura" : "Completada"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatPeriodo(temp.fechaInicio, temp.fechaFin)}
                    </p>
                  </div>
                </div>

                {/* Grilla proyectado vs real */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                  {/* Cortes/día */}
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Cortes/día proy.</p>
                    <p className="text-base font-semibold text-gray-900">
                      {temp.cortesDiaProyectados}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Cortes/día real</p>
                    {esFutura || temp.cortesDiaReal === null ? (
                      <p className="text-base font-semibold text-gray-300">—</p>
                    ) : (
                      <p className="text-base font-semibold text-gray-900">
                        {temp.cortesDiaReal.toFixed(1)}
                      </p>
                    )}
                  </div>

                  {/* Precio */}
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Precio proy.</p>
                    <p className="text-base font-semibold text-gray-900">
                      {formatARS(temp.precioBaseProyectado)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Precio real</p>
                    {esFutura || temp.precioPromedioReal === null ? (
                      <p className="text-base font-semibold text-gray-300">—</p>
                    ) : (
                      <p className="text-base font-semibold text-gray-900">
                        {formatARS(temp.precioPromedioReal)}
                      </p>
                    )}
                  </div>

                  {/* Ingreso casa */}
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Ingreso casa proy.</p>
                    <p className="text-base font-semibold text-gray-900">
                      {formatARS(temp.ingresoCasaProyectado)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Ingreso casa real</p>
                    {esFutura || temp.ingresoCasaReal === null ? (
                      <p className="text-base font-semibold text-gray-300">—</p>
                    ) : (
                      <p className="text-base font-semibold text-gray-900">
                        {formatARS(temp.ingresoCasaReal)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Desviación */}
                {!esFutura && temp.desviacionPct !== null && (
                  <div
                    className={`mt-4 pt-3 border-t border-gray-100 flex items-center justify-between`}
                  >
                    <p className="text-xs text-gray-500">Desviación vs proyectado</p>
                    <span
                      className={`text-sm font-bold ${
                        temp.desviacionPct >= 0 ? "text-green-700" : "text-red-700"
                      }`}
                    >
                      {formatPct(temp.desviacionPct)}
                    </span>
                  </div>
                )}

                {!esFutura && temp.ingresoCasaReal === null && (
                  <p className="text-xs text-gray-400 mt-3 pt-3 border-t border-gray-100">
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
