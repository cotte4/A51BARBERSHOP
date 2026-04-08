import Link from "next/link";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import HoyActionStrip from "@/components/hoy/HoyActionStrip";
import { db } from "@/db";
import {
  atenciones,
  barberos,
  mediosPago,
  productos,
  servicios,
  stockMovimientos,
} from "@/db/schema";
import { registrarAtencionExpressAction } from "@/app/(barbero)/caja/actions";
import { getTurnosActorContext } from "@/lib/turnos-access";
import { getTurnosVisibleList } from "@/lib/turnos";

function getFechaHoyArgentina(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

function formatARS(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(value);
}

function formatHora(date: Date | null | undefined): string {
  if (!date) return "--:--";
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(date);
}

function getHoraActualArgentina(): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date());
}

function getMonthBounds() {
  const fechaHoy = getFechaHoyArgentina();
  const [year, month] = fechaHoy.split("-").map(Number);
  return {
    fechaHoy,
    inicioMes: `${year}-${String(month).padStart(2, "0")}-01`,
    finMes: fechaHoy,
  };
}

function getPaymentLabel(nombre: string | null): string {
  const normalized = (nombre ?? "").toLowerCase();
  if (normalized.includes("efectivo")) return "Efectivo";
  if (normalized.includes("transf")) return nombre ?? "Transferencia";
  if (
    normalized.includes("tarjeta") ||
    normalized.includes("posnet") ||
    normalized.includes("mercado") ||
    normalized === "mp"
  ) {
    return nombre ?? "Tarjeta";
  }
  return nombre ?? "Otro";
}

function formatFechaHoyLabel(fechaHoy: string): string {
  const [year, month, day] = fechaHoy.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function getTurnoEstadoLabel(estado: string) {
  if (estado === "confirmado") return "Confirmado";
  if (estado === "pendiente") return "Pendiente";
  if (estado === "completado") return "Completado";
  return estado;
}

function getTurnoEstadoTone(estado: string) {
  if (estado === "confirmado") {
    return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
  }

  if (estado === "pendiente") {
    return "border-amber-400/20 bg-amber-400/10 text-amber-300";
  }

  return "border-zinc-800 bg-zinc-950 text-zinc-300";
}

export default async function HoyPage() {
  const actor = await getTurnosActorContext();
  if (!actor) {
    return null;
  }

  const { fechaHoy, inicioMes, finMes } = getMonthBounds();
  const inicioDia = new Date(`${fechaHoy}T00:00:00-03:00`);
  const finDia = new Date(`${fechaHoy}T23:59:59-03:00`);

  const [
    barberoActual,
    atencionesHoyRows,
    ventasHoyRows,
    mediosPagoList,
    serviciosList,
    productosList,
    turnosHoy,
    atencionesMesRows,
  ] = await Promise.all([
    actor.barberoId
      ? db
          .select()
          .from(barberos)
          .where(eq(barberos.id, actor.barberoId))
          .limit(1)
          .then((rows) => rows[0] ?? null)
      : Promise.resolve(null),
    db
      .select({
        id: atenciones.id,
        precioCobrado: atenciones.precioCobrado,
        anulado: atenciones.anulado,
        creadoEn: atenciones.creadoEn,
        servicioId: atenciones.servicioId,
        medioPagoId: atenciones.medioPagoId,
      })
      .from(atenciones)
      .where(
        and(
          eq(atenciones.fecha, fechaHoy),
          actor.barberoId ? eq(atenciones.barberoId, actor.barberoId) : undefined
        )
      )
      .orderBy(desc(atenciones.creadoEn)),
    db
      .select({
        id: stockMovimientos.id,
        productoId: stockMovimientos.productoId,
        cantidad: stockMovimientos.cantidad,
        precioUnitario: stockMovimientos.precioUnitario,
        fecha: stockMovimientos.fecha,
      })
      .from(stockMovimientos)
      .where(
        and(
          eq(stockMovimientos.tipo, "venta"),
          gte(stockMovimientos.fecha, inicioDia),
          lte(stockMovimientos.fecha, finDia)
        )
      )
      .orderBy(desc(stockMovimientos.fecha)),
    db.select().from(mediosPago),
    db.select().from(servicios),
    db.select().from(productos).where(eq(productos.activo, true)),
    getTurnosVisibleList(fechaHoy, undefined, actor.barberoId ?? undefined),
    actor.barberoId
      ? db
          .select({
            precioCobrado: atenciones.precioCobrado,
            comisionBarberoMonto: atenciones.comisionBarberoMonto,
          })
          .from(atenciones)
          .where(
            and(
              eq(atenciones.barberoId, actor.barberoId),
              eq(atenciones.anulado, false),
              gte(atenciones.fecha, inicioMes),
              lte(atenciones.fecha, finMes)
            )
          )
      : Promise.resolve([]),
  ]);

  const mediosPagoMap = new Map(mediosPagoList.map((medio) => [medio.id, medio]));
  const serviciosMap = new Map(serviciosList.map((servicio) => [servicio.id, servicio]));
  const productosMap = new Map(productosList.map((producto) => [producto.id, producto]));

  const serviciosActivos = serviciosList.filter((servicio) => servicio.activo);
  const mediosPagoActivos = mediosPagoList.filter((medio) => medio.activo);

  const activeAtenciones = atencionesHoyRows.filter((row) => !row.anulado);
  const atencionesCount = activeAtenciones.length;
  const ingresosServicios = activeAtenciones.reduce(
    (sum, row) => sum + Number(row.precioCobrado ?? 0),
    0
  );
  const ingresosProductos = ventasHoyRows.reduce(
    (sum, row) => sum + Math.abs(Number(row.cantidad ?? 0)) * Number(row.precioUnitario ?? 0),
    0
  );

  const recentAtenciones = atencionesHoyRows.slice(0, 4).map((row) => ({
    id: row.id,
    time: row.creadoEn,
    title: serviciosMap.get(row.servicioId ?? "")?.nombre ?? "Servicio",
    badge: row.anulado ? "Anulada" : "Servicio",
    detail: `${row.anulado ? "Fuera de caja" : formatARS(Number(row.precioCobrado ?? 0))} / ${getPaymentLabel(mediosPagoMap.get(row.medioPagoId ?? "")?.nombre ?? null)}`,
    tone: row.anulado
      ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
      : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  }));
  const recentVentas = ventasHoyRows.slice(0, 4).map((row) => ({
    id: row.id,
    time: row.fecha,
    title: productosMap.get(row.productoId ?? "")?.nombre ?? "Producto",
    badge: "Producto",
    detail: `${Math.abs(Number(row.cantidad ?? 0))} x ${formatARS(Number(row.precioUnitario ?? 0))}`,
    tone: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
  }));
  const recentMovement = [...recentAtenciones, ...recentVentas]
    .sort((left, right) => new Date(right.time ?? 0).getTime() - new Date(left.time ?? 0).getTime())
    .slice(0, 4);

  const horaActual = getHoraActualArgentina();
  const turnosOperativos = turnosHoy.filter(
    (turno) => turno.estado === "pendiente" || turno.estado === "confirmado"
  );
  const proximoTurno =
    turnosOperativos.find((turno) => turno.horaInicio >= horaActual) ?? turnosOperativos[0] ?? null;

  let monthCard: {
    cortes: number;
    bruto: number;
    comision: number;
    ranking: number;
    totalBarberos: number;
  } | null = null;

  if (actor.barberoId) {
    const rankingBase = await db
      .select({ barberoId: atenciones.barberoId })
      .from(atenciones)
      .where(
        and(
          eq(atenciones.anulado, false),
          gte(atenciones.fecha, inicioMes),
          lte(atenciones.fecha, finMes)
        )
      );

    const rankingMap = rankingBase.reduce<Map<string, number>>((map, row) => {
      const key = row.barberoId ?? "";
      map.set(key, (map.get(key) ?? 0) + 1);
      return map;
    }, new Map());
    const ranking = [...rankingMap.entries()].sort((a, b) => b[1] - a[1]);

    monthCard = {
      cortes: atencionesMesRows.length,
      bruto: atencionesMesRows.reduce((sum, row) => sum + Number(row.precioCobrado ?? 0), 0),
      comision: atencionesMesRows.reduce(
        (sum, row) => sum + Number(row.comisionBarberoMonto ?? 0),
        0
      ),
      ranking: Math.max(1, ranking.findIndex(([barberoId]) => barberoId === actor.barberoId) + 1),
      totalBarberos: Math.max(1, ranking.length),
    };
  }

  const fechaLabel = formatFechaHoyLabel(fechaHoy);
  const totalCobrado = ingresosServicios + ingresosProductos;

  return (
    <main className="app-shell min-h-screen px-4 py-6 pb-28">
      <div className="mx-auto max-w-2xl space-y-4">
        <section className="rounded-[32px] border border-zinc-800/80 bg-[radial-gradient(circle_at_top_left,_rgba(140,255,89,0.12),_transparent_30%),linear-gradient(180deg,_rgba(24,24,27,0.96),_rgba(9,9,11,0.98))] p-5 shadow-[0_24px_60px_rgba(0,0,0,0.32)] sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-xl space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">
                Centro del dia
              </p>
              <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
                {barberoActual?.nombre ?? "A51"}
              </h1>
              <p className="text-sm text-zinc-400">{fechaLabel}</p>
              <p className="text-sm text-zinc-400">
                Caja, agenda y movimiento del dia en una sola pasada.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/turnos"
                className="inline-flex min-h-[40px] items-center rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 text-sm font-medium text-zinc-200 transition hover:bg-zinc-800"
              >
                Ver turnos
              </Link>
              <Link
                href="/caja"
                className="inline-flex min-h-[40px] items-center rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 text-sm font-medium text-zinc-200 transition hover:bg-zinc-800"
              >
                Ver caja
              </Link>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <HeroMetric
              label="Cortes hoy"
              value={String(atencionesCount)}
              helper={atencionesCount === 1 ? "1 atencion activa" : `${atencionesCount} atenciones activas`}
            />
            <HeroMetric
              label="Cobrado hoy"
              value={totalCobrado > 0 ? formatARS(totalCobrado) : "--"}
              helper={`${formatARS(ingresosServicios)} servicios | ${formatARS(ingresosProductos)} productos`}
            />
            <div className="rounded-[24px] border border-zinc-800 bg-zinc-950/70 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                Proximo turno
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {proximoTurno ? proximoTurno.horaInicio : "--:--"}
              </p>
              <p className="mt-1 text-sm text-zinc-400">
                {proximoTurno ? proximoTurno.clienteNombre : "Agenda libre por ahora"}
              </p>
              {proximoTurno ? (
                <span
                  className={`mt-3 inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${getTurnoEstadoTone(proximoTurno.estado)}`}
                >
                  {getTurnoEstadoLabel(proximoTurno.estado)}
                </span>
              ) : null}
            </div>
          </div>
        </section>

        <HoyActionStrip
          proximoTurno={
            proximoTurno
              ? {
                  id: proximoTurno.id,
                  clienteNombre: proximoTurno.clienteNombre,
                  horaInicio: proximoTurno.horaInicio,
                  servicioNombre: proximoTurno.servicioNombre,
                  estado: proximoTurno.estado,
                }
              : null
          }
          servicios={serviciosActivos.map((servicio) => ({
            id: servicio.id,
            nombre: servicio.nombre,
            precioBase: servicio.precioBase,
          }))}
          mediosPago={mediosPagoActivos.map((medio) => ({
            id: medio.id,
            nombre: medio.nombre,
            comisionPorcentaje: medio.comisionPorcentaje,
          }))}
          action={registrarAtencionExpressAction}
        />

        <section className="panel-card rounded-[28px] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="eyebrow text-xs font-semibold">Pulso de caja</p>
              <h2 className="font-display mt-1 text-base font-semibold text-white">Ultimos movimientos</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs text-zinc-400">
                {recentMovement.length} recientes
              </span>
              <Link href="/caja" className="text-sm text-zinc-400 hover:text-[#8cff59]">
                Ver caja
              </Link>
            </div>
          </div>

          {recentMovement.length === 0 ? (
            <div className="mt-4 rounded-[22px] border border-dashed border-zinc-700 bg-zinc-950/25 p-8 text-center text-sm text-zinc-500">
              Sin movimientos hoy todavia.
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {recentMovement.map((item) => (
                <article
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-[22px] border border-zinc-800 bg-zinc-950/25 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{item.title}</p>
                    <p className="mt-0.5 text-xs text-zinc-400">{item.detail}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.tone}`}
                    >
                      {item.badge}
                    </span>
                    <p className="mt-1 text-[10px] text-zinc-500">{formatHora(item.time)}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {monthCard ? (
          <details className="panel-card rounded-[28px] p-5">
            <summary className="cursor-pointer list-none">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="eyebrow text-xs font-semibold">Mi mes</p>
                  <p className="mt-1 text-sm text-zinc-400">
                    Rendimiento y comision acumulada hasta hoy.
                  </p>
                </div>
                <p className="font-display text-2xl font-bold text-[#8cff59]">
                  {formatARS(monthCard.comision)}
                </p>
              </div>
            </summary>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <MetricCard label="Cortes" value={String(monthCard.cortes)} />
              <MetricCard label="Bruto" value={formatARS(monthCard.bruto)} />
              <MetricCard label="Comision" value={formatARS(monthCard.comision)} />
              <MetricCard
                label="Ranking"
                value={`#${monthCard.ranking} de ${monthCard.totalBarberos}`}
              />
            </div>
          </details>
        ) : null}
      </div>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel-soft rounded-[22px] px-4 py-4">
      <p className="text-sm text-zinc-400">{label}</p>
      <p className="mt-2 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}

function HeroMetric({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-[24px] border border-zinc-800 bg-zinc-950/70 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{helper}</p>
    </div>
  );
}
