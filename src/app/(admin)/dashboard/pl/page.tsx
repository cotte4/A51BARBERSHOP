import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getPL } from "@/lib/dashboard-queries";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function formatARS(val: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(val);
}

function nombreMes(mes: number, anio: number): string {
  return new Date(anio, mes - 1, 1).toLocaleDateString("es-AR", {
    month: "long",
    year: "numeric",
  });
}

type PLRowProps = {
  label: string;
  valor: number;
  indent?: boolean;
  negativo?: boolean;
  subtotal?: boolean;
  total?: boolean;
  signo?: "+" | "-" | "=";
};

function PLRow({ label, valor, indent, negativo, subtotal, total, signo }: PLRowProps) {
  const signoLabel = signo === "+" ? "+ " : signo === "-" ? "- " : signo === "=" ? "= " : "";
  const valorNum = negativo ? -valor : valor;
  return (
    <div
      className={`flex items-center justify-between py-2 px-4 ${
        total
          ? "bg-gray-900 text-white rounded-lg font-bold text-base"
          : subtotal
          ? "bg-gray-100 font-semibold text-gray-900 rounded-lg"
          : "border-b border-gray-100"
      }`}
    >
      <span
        className={`${indent ? "pl-4" : ""} ${
          total ? "text-white" : subtotal ? "text-gray-900" : "text-gray-700"
        } text-sm`}
      >
        {signoLabel}{label}
      </span>
      <span
        className={`text-sm font-medium tabular-nums ${
          total
            ? valorNum >= 0
              ? "text-green-300"
              : "text-red-300"
            : subtotal
            ? valorNum >= 0
              ? "text-gray-900"
              : "text-red-600"
            : valorNum >= 0
            ? "text-gray-900"
            : "text-red-600"
        }`}
      >
        {negativo ? formatARS(Math.abs(valor)) : formatARS(valorNum)}
      </span>
    </div>
  );
}

export default async function PLPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await auth.api.getSession({ headers: await headers() });
  const userRole = (session?.user as { role?: string })?.role;
  if (userRole !== "admin") redirect("/caja");

  const sp = await searchParams;
  const hoyDate = new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" })
  );
  const mesActual = hoyDate.getMonth() + 1;
  const anioActual = hoyDate.getFullYear();

  const mes = sp.mes ? parseInt(String(sp.mes), 10) : mesActual;
  const anio = sp.anio ? parseInt(String(sp.anio), 10) : anioActual;

  const pl = await getPL(mes, anio);

  // Links de navegación de meses
  const mesPrev = mes === 1 ? 12 : mes - 1;
  const anioPrev = mes === 1 ? anio - 1 : anio;
  const mesNext = mes === 12 ? 1 : mes + 1;
  const anioNext = mes === 12 ? anio + 1 : anio;

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
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">P&amp;L mensual</h1>
            <div className="flex items-center gap-2">
              <a
                href={`/api/export/csv/${anio}-${String(mes).padStart(2, "0")}`}
                className="min-h-[36px] flex items-center gap-1.5 px-3 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-4 h-4"
                >
                  <path
                    fillRule="evenodd"
                    d="M3 3.5A1.5 1.5 0 0 1 4.5 2h6.879a1.5 1.5 0 0 1 1.06.44l4.122 4.12A1.5 1.5 0 0 1 17 7.622V16.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 16.5v-13Zm10.857 5.691a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 0 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
                    clipRule="evenodd"
                  />
                </svg>
                CSV
              </a>
              <a
                href={`/api/pdf/pl/${anio}-${String(mes).padStart(2, "0")}`}
                className="min-h-[36px] flex items-center gap-1.5 px-3 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-4 h-4"
                >
                  <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
                  <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
                </svg>
                PDF
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-5">
        {/* Selector de mes */}
        <div className="flex items-center justify-between">
          <Link
            href={`/dashboard/pl?mes=${mesPrev}&anio=${anioPrev}`}
            className="min-h-[44px] flex items-center px-4 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
          >
            ← Anterior
          </Link>
          <span className="text-sm font-semibold text-gray-900 capitalize">
            {nombreMes(mes, anio)}
          </span>
          <Link
            href={`/dashboard/pl?mes=${mesNext}&anio=${anioNext}`}
            className="min-h-[44px] flex items-center px-4 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
          >
            Siguiente →
          </Link>
        </div>

        {/* Bloque: Resultado de la casa */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
            Resultado casa
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 flex flex-col gap-0 overflow-hidden">
            <PLRow
              label="Cortes Gabote (bruto)"
              valor={pl.ingresosGaboteBruto}
              signo="+"
            />
            <PLRow
              label={`Comisión Gabote (${pl.comisionGabotePct}%)`}
              valor={pl.comisionesGabote}
              negativo
              signo="-"
              indent
            />
            <PLRow
              label="Fees medios de pago (Gabote)"
              valor={pl.feesMedioPagoGabote}
              negativo
              signo="-"
              indent
            />
            <PLRow
              label="Alquiler banco"
              valor={pl.alquilerBancoMes}
              signo="+"
            />
            <PLRow
              label="Margen productos"
              valor={pl.margenProductosMes}
              signo="+"
            />
            <div className="p-2">
              <PLRow
                label="Ingresos casa"
                valor={pl.ingresosCasaGabote + pl.alquilerBancoMes + pl.margenProductosMes}
                subtotal
                signo="="
              />
            </div>
            <PLRow
              label="Gastos del mes"
              valor={pl.gastosFijosMes}
              negativo
              signo="-"
              indent
            />
            <div className="p-2">
              <PLRow
                label="Resultado casa"
                valor={pl.resultadoCasa}
                total
                signo="="
              />
            </div>
          </div>
        </section>

        {/* Bloque: Resultado personal Pinky */}
        <section>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
            Resultado personal Pinky
          </h2>
          <div className="bg-white rounded-xl border border-gray-200 flex flex-col gap-0 overflow-hidden">
            <PLRow
              label="Ingresos Pinky (neto)"
              valor={pl.ingresosNetosPinky}
              signo="+"
            />
            <PLRow
              label="Resultado casa"
              valor={pl.resultadoCasa}
              signo="+"
            />
            {pl.cuotaMemasMes > 0 && (
              <PLRow
                label="Cuota Memas"
                valor={pl.cuotaMemasMes}
                negativo
                signo="-"
                indent
              />
            )}
            <div className="p-2">
              <PLRow
                label="Resultado personal Pinky"
                valor={pl.resultadoPersonalPinky}
                total
                signo="="
              />
            </div>
          </div>
        </section>

        {/* Nota aclaratoria si no hay datos */}
        {pl.ingresosGaboteBruto === 0 &&
          pl.ingresosNetosPinky === 0 &&
          pl.gastosFijosMes === 0 && (
            <p className="text-sm text-gray-400 text-center">
              No hay datos registrados para este mes.
            </p>
          )}
      </main>
    </div>
  );
}
