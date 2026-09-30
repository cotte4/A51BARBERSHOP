import { formatUSD, type CalendarioCuotas, type CuotaCalendario } from "@/lib/amortizacion";
import { nombreMes } from "@/components/repago/situacion";

function listarMeses(cuotas: CuotaCalendario[]): string {
  const nombres = cuotas.map((cuota) => nombreMes(cuota.mes, "largo"));
  return nombres.length <= 1
    ? (nombres[0] ?? "")
    : `${nombres.slice(0, -1).join(", ")} y ${nombres.at(-1)}`;
}

/** La frase que contesta "¿cómo vienen?" con números. */
function fraseSituacion(calendario: CalendarioCuotas): string {
  const { situacion, ultimaPagada, proxima, faltaProxima, atrasoUsd, cuotas } = calendario;

  if (situacion === "devuelto") return "Todas las cuotas están cubiertas.";

  if (situacion === "atrasado") {
    const atrasadas = cuotas.filter((cuota) => cuota.estado === "atrasada");
    return `Faltan ${formatUSD(atrasoUsd)} para ponerse al día: ${listarMeses(atrasadas)}.`;
  }

  const siguiente = proxima
    ? proxima.cubierto > 0
      ? `A la cuota de ${nombreMes(proxima.mes, "largo")} le faltan ${formatUSD(faltaProxima)}.`
      : `La próxima es la de ${nombreMes(proxima.mes, "largo")} (${formatUSD(proxima.monto)}).`
    : "";

  if (situacion === "adelantado") {
    return ultimaPagada
      ? `Este mes no deben nada: tienen cubierto hasta ${nombreMes(ultimaPagada.mes, "largo")}. ${siguiente}`
      : siguiente;
  }

  // Al día: la cuota de este mes todavía se puede pagar en el mes
  return proxima?.esMesActual
    ? `Este mes vence la cuota de ${nombreMes(proxima.mes, "largo")}: ${
        proxima.cubierto > 0 ? `le faltan ${formatUSD(faltaProxima)}` : formatUSD(proxima.monto)
      }.`
    : `La cuota de este mes está cubierta. ${siguiente}`;
}

const CELDA: Record<CuotaCalendario["estado"], { caja: string; relleno: string; icono: string }> = {
  pagada: { caja: "border-[#8cff59]/40 bg-zinc-900", relleno: "bg-[#8cff59]", icono: "✓" },
  parcial: { caja: "border-[#8cff59]/40 bg-zinc-900", relleno: "bg-[#8cff59]/40", icono: "" },
  atrasada: { caja: "border-amber-500/60 bg-amber-500/10", relleno: "bg-amber-500/50", icono: "!" },
  pendiente: { caja: "border-zinc-700 bg-zinc-900", relleno: "", icono: "" },
};

function descripcionCuota(cuota: CuotaCalendario): string {
  const base = `Cuota ${cuota.numero}, ${nombreMes(cuota.mes, "largo")}`;
  switch (cuota.estado) {
    case "pagada":
      return `${base}: pagada`;
    case "parcial":
      return `${base}: pagó ${formatUSD(cuota.cubierto)} de ${formatUSD(cuota.monto)}`;
    case "atrasada":
      return `${base}: atrasada, faltan ${formatUSD(cuota.monto - cuota.cubierto)}`;
    default:
      return `${base}: pendiente`;
  }
}

export default function CuotasPlan({
  calendario,
  porcentajeDevuelto,
}: {
  calendario: CalendarioCuotas;
  porcentajeDevuelto: number;
}) {
  const { cuotas } = calendario;
  const montoComun = cuotas.every((cuota) => cuota.monto === cuotas[0]?.monto)
    ? `${cuotas.length} × ${formatUSD(cuotas[0]?.monto ?? 0)}`
    : `${cuotas.length} cuotas`;

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold text-zinc-300">
          Cuotas del plan <span className="font-normal text-zinc-500">· {montoComun}</span>
        </p>
        <p className="text-sm font-semibold tabular-nums text-zinc-300">
          {porcentajeDevuelto.toFixed(0)}% devuelto
        </p>
      </div>

      <ol className="mt-3 grid grid-cols-6 gap-x-1.5 gap-y-3 sm:grid-cols-12">
        {cuotas.map((cuota, index) => {
          const estilo = CELDA[cuota.estado];
          const porcentaje = Math.min(100, (cuota.cubierto / cuota.monto) * 100);
          const mostrarAnio = index === 0 || cuota.mes.endsWith("-01");
          return (
            <li key={cuota.numero} title={descripcionCuota(cuota)} aria-label={descripcionCuota(cuota)}>
              <div
                className={`relative h-9 overflow-hidden rounded-lg border ${estilo.caja} ${
                  cuota.esMesActual ? "ring-2 ring-white/70 ring-offset-2 ring-offset-zinc-900" : ""
                }`}
              >
                {porcentaje > 0 ? (
                  <div
                    className={`absolute inset-y-0 left-0 ${estilo.relleno}`}
                    style={{ width: `${porcentaje}%` }}
                  />
                ) : null}
                {estilo.icono ? (
                  <span
                    className={`relative flex h-full items-center justify-center text-sm font-bold ${
                      cuota.estado === "pagada" ? "text-[#07130a]" : "text-amber-300"
                    }`}
                  >
                    {estilo.icono}
                  </span>
                ) : null}
              </div>
              <p
                className={`mt-1.5 text-center text-[11px] leading-tight ${
                  cuota.esMesActual ? "font-semibold text-white" : "text-zinc-400"
                }`}
              >
                {nombreMes(cuota.mes, "corto")}
                {mostrarAnio ? ` ${cuota.mes.slice(2, 4)}` : ""}
              </p>
              <p className="h-3 text-center text-[10px] font-semibold uppercase leading-3 tracking-wider text-white">
                {cuota.esMesActual ? "hoy" : ""}
              </p>
            </li>
          );
        })}
      </ol>

      <p className="mt-3 text-sm leading-6 text-zinc-300">{fraseSituacion(calendario)}</p>
    </div>
  );
}
