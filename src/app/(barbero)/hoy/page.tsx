import Link from "next/link";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import HoyActionStrip from "@/components/hoy/HoyActionStrip";
import { db } from "@/db";
import {
  atenciones,
  barberos,
  cierresCaja,
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
  if (normalized.includes("tarjeta") || normalized.includes("posnet") || normalized.includes("mercado") || normalized === "mp") {
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

export default async function HoyPage() {
  const actor = await getTurnosActorContext();
  if (!actor) {
    return null;
  }

  const { fechaHoy, inicioMes, finMes } = getMonthBounds();
  const inicioDia = new Date(`${fechaHoy}T00:00:00-03:00`);
  const finDia = new Date(`${fechaHoy}T23:59:59-03:00`);

  const [barberoActual, cierreHoy, atencionesHoyRows, ventasHoyRows, mediosPagoList, serviciosList, productosList, turnosHoy, atencionesMesRows] = await Promise.all([
    actor.barberoId
      ? db.select().from(barberos).where(eq(barberos.id, actor.barberoId)).limit(1).then((rows) => rows[0] ?? null)
      : Promise.resolve(null),
    db
      .select({
        id: cierresCaja.id,
        fecha: cierresCaja.fecha,
        cerradoEn: cierresCaja.cerradoEn,
        cerradoPor: cierresCaja.cerradoPor,
        totalNeto: cierresCaja.totalNeto,
        totalBruto: cierresCaja.totalBruto,
        cerradoPorNombre: barberos.nombre,
      })
      .from(cierresCaja)
      .leftJoin(barberos, eq(barberos.id, cierresCaja.cerradoPor))
      .where(eq(cierresCaja.fecha, fechaHoy))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    db
      .select({
        id: atenciones.id,
        precioCobrado: atenciones.precioCobrado,
        anulado: atenciones.anulado,
        creadoEn: atenciones.creadoEn,
        servicioId: atenciones.servicioId,
        medioPagoId: atenciones.medioPagoId,
        notas: atenciones.notas,
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
        notas: stockMovimientos.notas,
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
          .select({ precioCobrado: atenciones.precioCobrado, comisionBarberoMonto: atenciones.comisionBarberoMonto })
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

  const serviciosActivos = serviciosList.filter((s) => s.activo);
  const mediosPagoActivos = mediosPagoList.filter((m) => m.activo);

  const activeAtenciones = atencionesHoyRows.filter((row) => !row.anulado);
  const atencionesCount = activeAtenciones.length;
  const ingresosServicios = activeAtenciones.reduce((sum, row) => sum + Number(row.precioCobrado ?? 0), 0);
  const ingresosProductos = ventasHoyRows.reduce(
    (sum, row) => sum + Math.abs(Number(row.cantidad ?? 0)) * Number(row.precioUnitario ?? 0),
    0
  );

  const recentAtenciones = atencionesHoyRows.slice(0, 4).map((row) => ({
    id: row.id,
    time: row.creadoEn,
    title: serviciosMap.get(row.servicioId ?? "")?.nombre ?? "Servicio",
    badge: row.anulado ? "Anulada" : "Servicio",
    detail: `${row.anulado ? "Fuera de caja" : formatARS(Number(row.precioCobrado ?? 0))} · ${getPaymentLabel(mediosPagoMap.get(row.medioPagoId ?? "")?.nombre ?? null)}`,
    tone: row.anulado ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200" : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
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

  const turnosMini = turnosHoy.slice(0, 4).map((turno) => ({
    id: turno.id,
    clienteNombre: turno.clienteNombre,
    horaInicio: turno.horaInicio,
    estado: turno.estado,
  }));

  const lowStockCount = productosList.filter((producto) => (producto.stockActual ?? 0) <= (producto.stockMinimo ?? 5)).length;
  const pendingTurnos = turnosHoy.filter((turno) => turno.estado === "pendiente").length;

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
      .where(and(eq(atenciones.anulado, false), gte(atenciones.fecha, inicioMes), lte(atenciones.fecha, finMes)));

    const rankingMap = rankingBase.reduce<Map<string, number>>((map, row) => {
      const key = row.barberoId ?? "";
      map.set(key, (map.get(key) ?? 0) + 1);
      return map;
    }, new Map());
    const ranking = [...rankingMap.entries()].sort((a, b) => b[1] - a[1]);

    monthCard = {
      cortes: atencionesMesRows.length,
      bruto: atencionesMesRows.reduce((sum, row) => sum + Number(row.precioCobrado ?? 0), 0),
      comision: atencionesMesRows.reduce((sum, row) => sum + Number(row.comisionBarberoMonto ?? 0), 0),
      ranking: Math.max(1, ranking.findIndex(([barberoId]) => barberoId === actor.barberoId) + 1),
      totalBarberos: Math.max(1, ranking.length),
    };
  }

  const nowFocus = pendingTurnos > 0
    ? {
        eyebrow: "Ahora",
        title: "Revisar turnos pendientes",
        cta: "Ver pendientes",
        href: "/turnos?estado=pendiente",
        tone: "amber" as const,
      }
    : actor.isAdmin && lowStockCount > 0
      ? {
          eyebrow: "Ahora",
          title: "Mirar inventario",
          cta: "Ver inventario",
          href: "/inventario",
          tone: "amber" as const,
        }
      : !cierreHoy
        ? {
            eyebrow: "Ahora",
            title: "Cobrar o registrar",
            cta: "Ir a caja",
            href: "/caja",
            tone: "brand" as const,
          }
        : {
            eyebrow: "Ahora",
            title: "Caja cerrada",
            cta: "Ver cierre",
            href: `/caja/cierre/${fechaHoy}`,
            tone: "neutral" as const,
          };

  const fechaLabel = formatFechaHoyLabel(fechaHoy);
  const totalCobrado = ingresosServicios + ingresosProductos;

  return (
    <main className="app-shell min-h-screen px-4 py-6 pb-28">
      <div className="mx-auto max-w-2xl space-y-4">

        {/* 1. Action strip */}
        <HoyActionStrip
          turnos={turnosMini}
          servicios={serviciosActivos.map((s) => ({ id: s.id, nombre: s.nombre, precioBase: s.precioBase }))}
          mediosPago={mediosPagoActivos.map((m) => ({ id: m.id, nombre: m.nombre, comisionPorcentaje: m.comisionPorcentaje }))}
          action={registrarAtencionExpressAction}
        />

        {/* 2. Header */}
        <section className="panel-card rounded-[28px] p-5">
          <p className="eyebrow text-xs font-semibold">{fechaLabel}</p>
          <h1 className="font-display mt-2 text-3xl font-bold tracking-tight text-white">
            {barberoActual?.nombre ?? "A51"}
          </h1>
          <div className="mt-4 flex gap-6">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Cortes hoy</p>
              <p className="mt-1 text-2xl font-bold text-white">{atencionesCount}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">Cobrado hoy</p>
              <p className="mt-1 text-2xl font-bold text-white">
                {totalCobrado > 0 ? formatARS(totalCobrado) : "—"}
              </p>
            </div>
          </div>
        </section>

        {/* 3. Acción urgente */}
        <Link
          href={nowFocus.href}
          className={`block rounded-[28px] border p-5 transition hover:-translate-y-0.5 ${
            nowFocus.tone === "brand"
              ? "border-[#8cff59]/20 bg-[rgba(140,255,89,0.08)]"
              : nowFocus.tone === "amber"
                ? "border-amber-500/30 bg-[rgba(245,158,11,0.08)]"
                : "border-white/10 bg-white/5"
          }`}
        >
          <p className="eyebrow text-xs font-semibold">{nowFocus.eyebrow}</p>
          <p className="font-display mt-2 text-xl font-semibold text-white">{nowFocus.title}</p>
          <p className="mt-3 text-sm font-semibold text-[#8cff59]">{nowFocus.cta} →</p>
        </Link>

        {/* 4. Últimos movimientos */}
        <section className="panel-card rounded-[28px] p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-base font-semibold text-white">Últimos movimientos</h2>
            <Link href="/caja" className="text-sm text-zinc-400 hover:text-[#8cff59]">
              Ver caja
            </Link>
          </div>

          {recentMovement.length === 0 ? (
            <div className="mt-4 rounded-[22px] border border-dashed border-zinc-700 bg-zinc-950/25 p-8 text-center text-sm text-zinc-500">
              Sin movimientos hoy todavia.
            </div>
          ) : (
            <div className="mt-4 space-y-2">
              {recentMovement.map((item) => (
                <article key={item.id} className="flex items-center justify-between gap-3 rounded-[22px] border border-zinc-800 bg-zinc-950/25 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{item.title}</p>
                    <p className="mt-0.5 text-xs text-zinc-400">{item.detail}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${item.tone}`}>{item.badge}</span>
                    <p className="mt-1 text-[10px] text-zinc-500">{formatHora(item.time)}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* 5. Mi mes */}
        {monthCard ? (
          <details className="panel-card rounded-[28px] p-5">
            <summary className="cursor-pointer list-none">
              <div className="flex items-center justify-between gap-3">
                <p className="eyebrow text-xs font-semibold">Mi mes</p>
                <p className="font-display text-2xl font-bold text-[#8cff59]">
                  {formatARS(monthCard.comision)}
                </p>
              </div>
            </summary>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <MetricCard label="Cortes" value={String(monthCard.cortes)} />
              <MetricCard label="Bruto" value={formatARS(monthCard.bruto)} />
              <MetricCard label="Comision" value={formatARS(monthCard.comision)} />
              <MetricCard label="Ranking" value={`#${monthCard.ranking} de ${monthCard.totalBarberos}`} />
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
