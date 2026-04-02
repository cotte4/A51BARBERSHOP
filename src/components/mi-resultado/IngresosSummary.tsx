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

function formatARS(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function DetailRow({ label, hoy, mes }: { label: string; hoy: number; mes: number }) {
  return (
    <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 py-2">
      <span className="text-sm text-zinc-500">{label}</span>
      <span className="text-sm font-semibold text-[#8cff59]">{formatARS(hoy)}</span>
      <span className="text-sm font-semibold text-[#8cff59]">{formatARS(mes)}</span>
    </div>
  );
}

export default function IngresosSummary(props: IngresosSummaryProps) {
  return (
    <section className="rounded-[28px] border border-zinc-800 bg-zinc-900 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">Ingresos</p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-[20px] border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-600">Hoy</p>
          <p className="mt-2 text-3xl font-bold text-[#8cff59]">{formatARS(props.totalHoy)}</p>
        </div>
        <div className="rounded-[20px] border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-xs uppercase tracking-wide text-zinc-600">Este mes</p>
          <p className="mt-2 text-3xl font-bold text-[#8cff59]">{formatARS(props.totalMes)}</p>
        </div>
      </div>

      <div className="mt-4">
        <div className="grid grid-cols-[1fr_auto_auto] gap-4 border-b border-zinc-800 pb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-600">
          <span>Detalle</span>
          <span>Hoy</span>
          <span>Mes</span>
        </div>
        <DetailRow label="Tus cortes" hoy={props.tusCortesHoy} mes={props.tusCortesMes} />
        <DetailRow label="Aporte casa" hoy={props.aporteCasaHoy} mes={props.aporteCasaMes} />
        <DetailRow label="Productos" hoy={props.productosHoy} mes={props.productosMes} />
      </div>
    </section>
  );
}
