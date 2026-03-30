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
  }).format(value);
}

function DetailRow({
  label,
  hoy,
  mes,
}: {
  label: string;
  hoy: number;
  mes: number;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 py-2">
      <span className="text-sm text-gray-600">{label}</span>
      <span className="text-sm font-semibold text-gray-900">{formatARS(hoy)}</span>
      <span className="text-sm font-semibold text-gray-900">{formatARS(mes)}</span>
    </div>
  );
}

export default function IngresosSummary(props: IngresosSummaryProps) {
  return (
    <section className="rounded-[28px] border border-emerald-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-600">
        Ingresos
      </p>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="rounded-2xl bg-emerald-50 p-4">
          <p className="text-xs uppercase tracking-wide text-emerald-700">Hoy</p>
          <p className="mt-2 text-3xl font-bold text-emerald-900">{formatARS(props.totalHoy)}</p>
        </div>
        <div className="rounded-2xl bg-emerald-50 p-4">
          <p className="text-xs uppercase tracking-wide text-emerald-700">Este mes</p>
          <p className="mt-2 text-3xl font-bold text-emerald-900">{formatARS(props.totalMes)}</p>
        </div>
      </div>

      <div className="mt-5">
        <div className="grid grid-cols-[1fr_auto_auto] gap-4 border-b border-gray-100 pb-2 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
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
