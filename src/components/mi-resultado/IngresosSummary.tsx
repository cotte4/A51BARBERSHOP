import { formatARS } from "@/lib/format";

type IngresosSummaryProps = {
  totalHoy: number;
  totalMes: number;
  tusCortesHoy: number;
  tusCortesMes: number;
  aporteCasaHoy: number;
  aporteCasaMes: number;
  productosHoy: number;
  productosMes: number;
};

function DetailRow({
  label,
  hoy,
  mes,
  tone = "neutral",
}: {
  label: string;
  hoy: number;
  mes: number;
  tone?: "neutral" | "accent";
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-4 border-t border-zinc-800/80 px-4 py-3 first:border-t-0 first:pt-0">
      <div>
        <p className="text-sm font-medium text-zinc-200">{label}</p>
        <p className="text-xs text-zinc-500">Comparacion entre hoy y el mes</p>
      </div>
      <span className={`whitespace-nowrap text-sm font-semibold tabular-nums ${tone === "accent" ? "text-[#b9ff96]" : "text-white"}`}>
        {formatARS(hoy)}
      </span>
      <span className={`whitespace-nowrap text-sm font-semibold tabular-nums ${tone === "accent" ? "text-[#b9ff96]" : "text-white"}`}>
        {formatARS(mes)}
      </span>
    </div>
  );
}

export default function IngresosSummary(props: IngresosSummaryProps) {
  return (
    <section className="panel-card overflow-hidden rounded-[28px] border border-zinc-800/90 bg-zinc-900/95">
      <div className="flex items-start justify-between gap-4 border-b border-white/5 px-5 py-5">
        <div>
          <p className="eyebrow text-xs font-semibold">Ingresos del mes</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-white">Lo que entra a tu bolsillo</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            La lectura separa hoy y mes para ver ritmo, volumen y de donde viene cada peso.
          </p>
        </div>

        <div className="rounded-[22px] border border-[#8cff59]/20 bg-[#8cff59]/10 px-4 py-3 text-right">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#b9ff96]/80">Total hoy</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-[#b9ff96]">{formatARS(props.totalHoy)}</p>
          <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-zinc-500">Total mes {formatARS(props.totalMes)}</p>
        </div>
      </div>

      <div className="grid gap-3 px-5 pt-5 sm:grid-cols-2">
        <div className="rounded-[20px] border border-zinc-800 bg-zinc-950/70 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Hoy</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-[#b9ff96]">{formatARS(props.totalHoy)}</p>
          <p className="mt-2 text-sm leading-6 text-zinc-400">Ingresos generados hoy, sin mezclar con acumulado.</p>
        </div>

        <div className="rounded-[20px] border border-zinc-800 bg-zinc-950/70 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Mes</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-white">{formatARS(props.totalMes)}</p>
          <p className="mt-2 text-sm leading-6 text-zinc-400">Acumulado del mes con toda la actividad cargada.</p>
        </div>
      </div>

      <div className="mt-5 border-t border-white/5 px-5 pb-3 pt-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-4 px-4 pb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
          <span>Origen</span>
          <span>Hoy</span>
          <span>Mes</span>
        </div>
        <div className="rounded-[24px] border border-zinc-800 bg-zinc-950/55">
          <DetailRow label="Tus cortes" hoy={props.tusCortesHoy} mes={props.tusCortesMes} tone="accent" />
          <DetailRow label="Aporte casa" hoy={props.aporteCasaHoy} mes={props.aporteCasaMes} />
          <DetailRow label="Productos" hoy={props.productosHoy} mes={props.productosMes} />
        </div>
      </div>
    </section>
  );
}
