import { and, count, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db";
import { atenciones, barberos } from "@/db/schema";
import { formatARS } from "@/lib/format";

type Props = {
  barberoId: string;
  inicioDeMes: string;
  finDeMes: string;
};

function MetricRow({
  label,
  value,
  strong,
  valueClassName,
}: {
  label: string;
  value: string;
  strong?: boolean;
  valueClassName?: string;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-[22px] px-4 py-3 ${
        strong ? "bg-[#8cff59] text-[#07130a]" : "bg-zinc-950/35"
      }`}
    >
      <span className={strong ? "text-[#07130a]/80" : "text-zinc-400"}>{label}</span>
      <span
        className={`font-semibold ${
          strong ? "text-[#07130a]" : valueClassName ?? "text-white"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export async function BarberMonthlyStats({ barberoId, inicioDeMes, finDeMes }: Props) {
  const [barberoDelUsuario] = await db
    .select()
    .from(barberos)
    .where(eq(barberos.id, barberoId))
    .limit(1);

  if (!barberoDelUsuario) return null;

  const [atencionesDelMes, cortesPorBarberoRaw] = await Promise.all([
    db
      .select()
      .from(atenciones)
      .where(
        and(
          eq(atenciones.barberoId, barberoId),
          eq(atenciones.anulado, false),
          gte(atenciones.fecha, inicioDeMes),
          lte(atenciones.fecha, finDeMes)
        )
      ),
    db
      .select({
        barberoId: atenciones.barberoId,
        cortes: count(atenciones.id),
      })
      .from(atenciones)
      .where(
        and(
          eq(atenciones.anulado, false),
          gte(atenciones.fecha, inicioDeMes),
          lte(atenciones.fecha, finDeMes)
        )
      )
      .groupBy(atenciones.barberoId),
  ]);

  const cortesDelMes = atencionesDelMes.length;
  const brutoDelMes = atencionesDelMes.reduce(
    (sum, atencion) => sum + Number(atencion.precioCobrado ?? 0),
    0
  );
  const comisionDelMes = atencionesDelMes.reduce(
    (sum, atencion) => sum + Number(atencion.comisionBarberoMonto ?? 0),
    0
  );
  const netoProyectado = comisionDelMes;

  const sorted = [...cortesPorBarberoRaw].sort((a, b) => b.cortes - a.cortes);
  const posicionRanking = sorted.findIndex((item) => item.barberoId === barberoId) + 1;
  const totalBarberosRanking = sorted.length;

  return (
    <section className="panel-card rounded-[30px] p-5">
      <p className="eyebrow text-xs font-semibold">Mi mes</p>
      <h2 className="font-display mt-2 text-xl font-semibold text-white">
        Performance acumulada
      </h2>
      <p className="mt-1 text-sm text-zinc-400">
        {new Date(`${inicioDeMes}T12:00:00`).toLocaleDateString("es-AR", {
          month: "long",
          year: "numeric",
          timeZone: "America/Argentina/Buenos_Aires",
        })}
      </p>

      <div className="mt-4 space-y-3">
        <MetricRow label="Cortes este mes" value={String(cortesDelMes)} />
        {posicionRanking > 0 ? (
          <MetricRow
            label="Ranking"
            value={`#${posicionRanking} de ${totalBarberosRanking}`}
          />
        ) : null}
        <MetricRow label="Bruto acumulado" value={formatARS(brutoDelMes)} />
        <MetricRow
          label={`Mi comision (${barberoDelUsuario.porcentajeComision ?? 0}%)`}
          value={formatARS(comisionDelMes)}
        />
        <MetricRow
          label="Neto proyectado"
          value={formatARS(Math.max(0, netoProyectado))}
          strong
        />
      </div>
    </section>
  );
}
