import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import AlienSignalPanel from "@/components/branding/AlienSignalPanel";
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
      className={`flex items-center justify-between px-4 py-2 ${
        total
          ? "rounded-lg bg-zinc-800 text-base font-bold text-white"
          : subtotal
            ? "rounded-lg bg-zinc-800 font-semibold text-white"
            : "border-b border-zinc-800"
      }`}
    >
      <span
        className={`${indent ? "pl-4" : ""} ${
          total ? "text-white" : subtotal ? "text-white" : "text-zinc-300"
        } text-sm`}
      >
        {signoLabel}
        {label}
      </span>
      <span
        className={`text-sm font-medium tabular-nums ${
          total
            ? valorNum >= 0
              ? "text-green-300"
              : "text-red-300"
            : subtotal
              ? valorNum >= 0
                ? "text-white"
                : "text-red-400"
              : valorNum >= 0
                ? "text-white"
                : "text-red-400"
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

  const mesPrev = mes === 1 ? 12 : mes - 1;
  const anioPrev = mes === 1 ? anio - 1 : anio;
  const mesNext = mes === 12 ? 1 : mes + 1;
  const anioNext = mes === 12 ? anio + 1 : anio;

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="border-b border-zinc-800 bg-zinc-900 px-4 py-4">
        <div className="mx-auto max-w-2xl">
          <Link
            href="/dashboard"
            className="mb-2 block text-sm text-zinc-400 hover:text-[#8cff59]"
          >
            ← Dashboard
          </Link>
          <div className="flex items-center justify-between">
            <h1 className="font-display text-xl font-bold text-white">P&amp;L mensual</h1>
            <div className="flex items-center gap-2">
              <a
                href={`/api/export/csv/${anio}-${String(mes).padStart(2, "0")}`}
                className="min-h-[36px] rounded-lg border border-zinc-700 bg-zinc-900 px-3 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800"
              >
                CSV
              </a>
              <a
                href={`/api/pdf/pl/${anio}-${String(mes).padStart(2, "0")}`}
                className="neon-button min-h-[36px] rounded-lg px-3 text-sm font-medium transition-colors"
              >
                PDF
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-2xl flex-col gap-5 px-4 py-6">
        <div className="flex items-center justify-between">
          <Link
            href={`/dashboard/pl?mes=${mesPrev}&anio=${anioPrev}`}
            className="min-h-[44px] rounded-lg border border-zinc-800 bg-zinc-900 px-4 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            ← Anterior
          </Link>
          <span className="text-sm font-semibold capitalize text-white">
            {nombreMes(mes, anio)}
          </span>
          <Link
            href={`/dashboard/pl?mes=${mesNext}&anio=${anioNext}`}
            className="min-h-[44px] rounded-lg border border-zinc-800 bg-zinc-900 px-4 text-sm text-zinc-300 hover:bg-zinc-800"
          >
            Siguiente →
          </Link>
        </div>

        <AlienSignalPanel
          eyebrow="Radar mensual"
          title="Senal de P&L"
          detail="Ingresos, costos, resultado casa y resultado personal quedan en la misma orbita para leer el mes sin perder jerarquia."
          badges={[
            nombreMes(mes, anio),
            pl.resultadoCasa >= 0 ? "casa en verde" : "casa en rojo",
            pl.resultadoPersonalPinky >= 0 ? "pinky en verde" : "pinky en rojo",
          ]}
          tone="sky"
        />

        <section>
          <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Resultado casa
          </h2>
          <div className="panel-card flex flex-col gap-0 overflow-hidden rounded-[28px]">
            <PLRow label="Cortes Gabote (bruto)" valor={pl.ingresosGaboteBruto} signo="+" />
            <PLRow
              label={`Comision Gabote (${pl.comisionGabotePct}%)`}
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
            <PLRow label="Margen productos" valor={pl.margenProductosMes} signo="+" />
            <div className="p-2">
              <PLRow
                label="Ingresos casa"
                valor={pl.ingresosCasaGabote + pl.margenProductosMes}
                subtotal
                signo="="
              />
            </div>
            <PLRow label="Gastos del mes" valor={pl.gastosFijosMes} negativo signo="-" indent />
            <div className="p-2">
              <PLRow label="Resultado casa" valor={pl.resultadoCasa} total signo="=" />
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Resultado personal Pinky
          </h2>
          <div className="panel-card flex flex-col gap-0 overflow-hidden rounded-[28px]">
            <PLRow label="Ingresos Pinky (neto)" valor={pl.ingresosNetosPinky} signo="+" />
            <PLRow label="Resultado casa" valor={pl.resultadoCasa} signo="+" />
            {pl.cuotaMemasMes > 0 ? (
              <PLRow label="Cuota Memas" valor={pl.cuotaMemasMes} negativo signo="-" indent />
            ) : null}
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

        {pl.ingresosGaboteBruto === 0 &&
        pl.ingresosNetosPinky === 0 &&
        pl.gastosFijosMes === 0 ? (
          <p className="text-center text-sm text-zinc-400">
            No hay datos registrados para este mes.
          </p>
        ) : null}
      </main>
    </div>
  );
}
