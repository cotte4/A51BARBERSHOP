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

  const productosDisponibles = productosList.filter((producto) => Number(producto.stockActual ?? 0) > 0);
  const stockAlerts = productosList.filter(
    (producto) => Number(producto.stockActual ?? 0) <= Number(producto.stockMinimo ?? 0)
  );

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
  const cajaLabel = totalCobrado > 0 ? formatARS(totalCobrado) : "--";

  return (
    <div className="space-y-5 pb-6 sm:space-y-6">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.9fr)_minmax(320px,1fr)]">
        <div className="space-y-6">
          <section className="rounded-[32px] border border-zinc-800/80 bg-[radial-gradient(circle_at_top_left,_rgba(140,255,89,0.11),_transparent_28%),linear-gradient(180deg,_rgba(24,24,27,0.96),_rgba(9,9,11,0.98))] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.28)] sm:p-7">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl space-y-3">
                <div className="space-y-2.5">
                  <p className="eyebrow text-[11px] font-semibold">Centro del dia</p>
                  <h1 className="font-display text-[1.9rem] font-bold tracking-tight text-white sm:text-[2.3rem]">
                    {barberoActual?.nombre ?? "A51"}
                  </h1>
                  <p className="text-sm leading-5 text-zinc-400 sm:text-base sm:leading-6">
                    {fechaLabel}. Caja, agenda y movimiento en una mirada rapida.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <OverviewPill label="Atenciones" value={String(atencionesCount)} highlight />
                  <OverviewPill label="Turnos" value={String(turnosOperativos.length)} />
                  <OverviewPill label="Alertas stock" value={String(stockAlerts.length)} />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href="/turnos"
                  className="inline-flex min-h-[44px] items-center rounded-full border border-zinc-700 bg-zinc-950/90 px-4 text-sm font-medium text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-900"
                >
                  Ver turnos
                </Link>
                <Link
                  href="/caja"
                  className="inline-flex min-h-[44px] items-center rounded-full border border-zinc-700 bg-zinc-950/90 px-4 text-sm font-medium text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-900"
                >
                  Ver caja
                </Link>
              </div>
            </div>
          </section>

          <HoyActionStrip
            turnosCount={turnosOperativos.length}
            productosCount={productosDisponibles.length}
            stockAlertsCount={stockAlerts.length}
            atencionesCount={atencionesCount}
            totalCobrado={totalCobrado}
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
        </div>

        <aside className="grid gap-3 self-start xl:sticky xl:top-6">
          <StatusRailCard
            eyebrow="Proximo turno"
            value={proximoTurno ? proximoTurno.horaInicio : "Hoy libre"}
            detail={
              proximoTurno
                ? `${proximoTurno.clienteNombre} / ${proximoTurno.servicioNombre ?? "Servicio sin detalle"}`
                : "No hay reservas cargadas por ahora."
            }
            badge={proximoTurno ? getTurnoEstadoLabel(proximoTurno.estado) : "Agenda libre"}
            badgeTone={proximoTurno ? getTurnoEstadoTone(proximoTurno.estado) : undefined}
            href="/turnos"
            actionLabel="Abrir agenda"
          />
          <StatusRailCard
            eyebrow="Caja de hoy"
            value={cajaLabel}
            detail={
              atencionesCount > 0
                ? `${atencionesCount} atenciones activas / ${formatARS(ingresosServicios)} servicios`
                : "Todavia no hay movimiento registrado en caja."
            }
            badge={atencionesCount > 0 ? "Con movimiento" : "Sin caja"}
            href="/caja"
            actionLabel="Ir a caja"
          />
          <StatusRailCard
            eyebrow="Turnos hoy"
            value={String(turnosOperativos.length)}
            detail={
              turnosOperativos.length > 0
                ? `${turnosOperativos.length} reservas entre pendientes y confirmadas.`
                : "La agenda esta libre para el resto del dia."
            }
            badge={turnosOperativos.length > 0 ? "Agenda activa" : "Sin reservas"}
            href="/turnos"
            actionLabel="Ver turnos"
          />
          <StatusRailCard
            eyebrow="Productos"
            value={String(productosDisponibles.length)}
            detail={
              stockAlerts.length > 0
                ? `${stockAlerts.length} items quedaron en zona critica.`
                : "Stock disponible para vender sin alertas urgentes."
            }
            badge={stockAlerts.length > 0 ? `${stockAlerts.length} alertas` : "Stock al dia"}
            href="/caja/vender"
            actionLabel="Abrir venta"
          />
        </aside>
      </section>

      <section
        className={
          monthCard
            ? "grid gap-5 xl:grid-cols-[minmax(0,1.9fr)_minmax(320px,1fr)] xl:gap-6"
            : undefined
        }
      >
        <section className="panel-card rounded-[32px] p-4 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow text-[11px] font-semibold">Pulso de caja</p>
              <h2 className="font-display mt-2 text-2xl font-semibold text-white">
                Ultimos movimientos
              </h2>
              <p className="mt-2 text-sm leading-5 text-zinc-400 sm:leading-6">
                Lo ultimo que entro en servicio o producto, ordenado para escanear rapido.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
                {recentMovement.length} recientes
              </span>
              <Link
                href="/caja"
                className="inline-flex min-h-[40px] items-center rounded-full border border-zinc-700 bg-zinc-950 px-3.5 text-sm font-medium text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-900"
              >
                Ver caja
              </Link>
            </div>
          </div>

          {recentMovement.length === 0 ? (
            <div className="mt-5 rounded-[24px] border border-dashed border-zinc-700 bg-zinc-950/25 p-7 text-center sm:p-8">
              <p className="font-display text-xl font-semibold text-white">Todavia no hubo movimiento</p>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Cuando entren cobros o ventas, van a aparecer aca en orden cronologico.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {recentMovement.map((item) => (
                <article
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-[24px] border border-zinc-800 bg-zinc-950/30 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{item.title}</p>
                    <p className="mt-1 text-sm leading-5 text-zinc-400">{item.detail}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${item.tone}`}
                    >
                      {item.badge}
                    </span>
                    <p className="mt-1.5 text-[11px] text-zinc-500">{formatHora(item.time)}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {monthCard ? (
          <section className="panel-card rounded-[32px] p-4 sm:p-6">
            <div className="space-y-3">
              <p className="eyebrow text-[11px] font-semibold">Mi mes</p>
              <h2 className="font-display text-2xl font-semibold text-white">Rendimiento acumulado</h2>
              <p className="text-sm leading-5 text-zinc-400 sm:leading-6">
                Cortes, bruto, comision y posicion acumulada hasta hoy.
              </p>
            </div>

            <div className="mt-5 rounded-[24px] border border-[#8cff59]/14 bg-[rgba(140,255,89,0.06)] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#b9ff96]">
                Comision acumulada
              </p>
              <p className="font-display mt-2 text-4xl font-bold text-white">
                {formatARS(monthCard.comision)}
              </p>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <MetricCard label="Cortes" value={String(monthCard.cortes)} />
              <MetricCard label="Bruto" value={formatARS(monthCard.bruto)} />
              <MetricCard label="Comision" value={formatARS(monthCard.comision)} />
              <MetricCard
                label="Ranking"
                value={`#${monthCard.ranking} de ${monthCard.totalBarberos}`}
              />
            </div>
          </section>
        ) : null}
      </section>
    </div>
  );
}

function OverviewPill({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
        highlight
          ? "border-[#8cff59]/20 bg-[rgba(140,255,89,0.07)] text-[#b9ff96]"
          : "border-white/10 bg-white/[0.04] text-zinc-300"
      }`}
    >
      <span className="text-zinc-500">{label}</span>
      <span className={highlight ? "text-[#d9ffbf]" : "text-white"}>{value}</span>
    </span>
  );
}

function StatusRailCard({
  eyebrow,
  value,
  detail,
  badge,
  badgeTone,
  href,
  actionLabel,
}: {
  eyebrow: string;
  value: string;
  detail: string;
  badge: string;
  badgeTone?: string;
  href: string;
  actionLabel: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-[28px] border border-zinc-800 bg-[linear-gradient(180deg,rgba(23,23,27,0.96),rgba(12,12,15,0.98))] p-4 shadow-[0_16px_30px_rgba(0,0,0,0.22)] transition hover:-translate-y-0.5 hover:border-[#8cff59]/20 sm:p-5"
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">{eyebrow}</p>
      <p className="font-display mt-3 text-[1.8rem] font-semibold leading-none text-white sm:text-[2rem]">{value}</p>
      <p className="mt-2.5 max-w-[28ch] text-sm leading-5 text-zinc-400 sm:leading-6">{detail}</p>
      <div className="mt-4 flex items-end justify-between gap-3">
        <span
          className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold ${
            badgeTone ?? "border-white/10 bg-white/[0.04] text-zinc-300"
          }`}
        >
          {badge}
        </span>
        <span className="text-sm font-semibold text-[#8cff59]">{actionLabel}</span>
      </div>
    </Link>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-zinc-800 bg-zinc-950/45 px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-white">{value}</p>
    </div>
  );
}
