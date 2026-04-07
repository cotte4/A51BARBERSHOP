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

function getPaymentMeta(nombre: string | null) {
  const normalized = (nombre ?? "").toLowerCase();
  if (normalized.includes("efectivo")) return { label: "Efectivo" };
  if (normalized.includes("transf")) return { label: nombre ?? "Transferencia" };
  if (normalized.includes("tarjeta") || normalized.includes("posnet") || normalized.includes("mercado") || normalized === "mp") {
    return { label: nombre ?? "Tarjeta" };
  }
  return { label: nombre ?? "Otro" };
}

function userLabelFromSession(barberoId: string | null | undefined) {
  return barberoId ? "Barbero activo" : "Sesion operativa";
}

export default async function HoyPage() {
  const actor = await getTurnosActorContext();
  if (!actor) {
    return null;
  }

  const { fechaHoy, inicioMes, finMes } = getMonthBounds();
  const inicioDia = new Date(`${fechaHoy}T00:00:00-03:00`);
  const finDia = new Date(`${fechaHoy}T23:59:59-03:00`);

  const [barberoActual, cierreHoy, atencionesHoyRows, ventasHoyRows, mediosPagoList, serviciosList, barberosList, productosList, turnosHoy, atencionesMesRows] = await Promise.all([
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
    db.select().from(barberos),
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
  const turnosCount = turnosHoy.filter((turno) => turno.estado !== "cancelado").length;
  const ventasCount = ventasHoyRows.length;
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
    detail: `${row.anulado ? "Fuera de caja" : formatARS(Number(row.precioCobrado ?? 0))} · ${getPaymentMeta(mediosPagoMap.get(row.medioPagoId ?? "")?.nombre ?? null).label}`,
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
    .slice(0, 6);

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

  const latestMovement = recentMovement[0] ?? null;
  const nowFocus = pendingTurnos > 0
    ? {
        eyebrow: "Ahora",
        title: "Revisar turnos pendientes",
        body: `Tenes ${pendingTurnos} turno${pendingTurnos === 1 ? "" : "s"} esperando revision antes de seguir.`,
        cta: "Ver pendientes",
        href: "/turnos?estado=pendiente",
        tone: "amber" as const,
      }
    : actor.isAdmin && lowStockCount > 0
      ? {
          eyebrow: "Ahora",
          title: "Mirar inventario",
          body: `${lowStockCount} producto${lowStockCount === 1 ? "" : "s"} estan por debajo del minimo.`,
          cta: "Abrir inventario",
          href: "/inventario",
          tone: "amber" as const,
        }
      : !cierreHoy
        ? {
            eyebrow: "Ahora",
            title: "Registrar atencion express",
            body: "La caja sigue abierta y el comando rapido esta listo para cobrar o registrar.",
            cta: "Abrir comandos",
            href: "#comandos",
            tone: "brand" as const,
          }
        : {
            eyebrow: "Ahora",
            title: "Caja cerrada",
            body: "No hay urgencias activas. Podés revisar el cierre o el resumen de la jornada.",
            cta: "Ver cierre",
            href: `/caja/cierre/${fechaHoy}`,
            tone: "neutral" as const,
          };

  const recentFocus = latestMovement
    ? {
        eyebrow: "Recien",
        title: latestMovement.title,
        body: latestMovement.detail,
        cta: "Abrir caja",
        href: "/caja",
        meta: `${latestMovement.badge} · ${formatHora(latestMovement.time)}`,
        tone: "neutral" as const,
      }
    : {
        eyebrow: "Recien",
        title: "Sin movimientos todavia",
        body: "Cuando entre el primer servicio o venta, aparecera aca para leer el pulso del dia.",
        cta: "Ir a caja",
        href: "/caja",
        meta: "Esperando actividad",
        tone: "neutral" as const,
      };

  const attentionItems = [
    pendingTurnos > 0 ? `${pendingTurnos} turno${pendingTurnos === 1 ? "" : "s"} pendientes` : null,
    actor.isAdmin && lowStockCount > 0 ? `${lowStockCount} producto${lowStockCount === 1 ? "" : "s"} con stock bajo` : null,
    cierreHoy ? `Caja cerrada a las ${formatHora(cierreHoy.cerradoEn)}` : "Caja abierta y lista para operar",
  ].filter((item): item is string => Boolean(item));

  const attentionFocus =
    pendingTurnos > 0
      ? {
          cta: "Ver agenda",
          href: "/turnos?estado=pendiente",
          tone: "amber" as const,
        }
      : actor.isAdmin && lowStockCount > 0
        ? {
            cta: "Ver inventario",
            href: "/inventario",
            tone: "amber" as const,
          }
        : cierreHoy
          ? {
              cta: "Ver cierre",
              href: `/caja/cierre/${fechaHoy}`,
              tone: "neutral" as const,
            }
          : {
              cta: "Ver caja",
              href: "/caja",
              tone: "brand" as const,
            };

  return (
    <main className="app-shell min-h-screen px-4 py-6 pb-28">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="panel-card overflow-hidden rounded-[34px]">
          <div className="bg-[radial-gradient(circle_at_top_right,rgba(140,255,89,0.12),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(140,255,89,0.06),transparent_30%)] p-6 sm:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="eyebrow text-xs font-semibold">Hoy</p>
                <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  Jornada activa
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
                  Ves que hacer ahora, lo que paso recien y lo que merece atencion para no perder
                  ritmo.
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[320px]">
                <div className="rounded-[24px] border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                    Operador
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {barberoActual?.nombre ?? userLabelFromSession(actor.barberoId)}
                  </p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                    Estado
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {cierreHoy ? "Caja cerrada" : "Caja abierta"}
                  </p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                    Cortes
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {atencionesCount} {atencionesCount === 1 ? "corte" : "cortes"}
                  </p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-white/5 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                    Cobrado
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">
                    {ingresosServicios + ingresosProductos > 0
                      ? formatARS(ingresosServicios + ingresosProductos)
                      : "Sin movimiento"}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-3 lg:grid-cols-[1.1fr_0.95fr_0.95fr]">
              <FocusCard
                eyebrow={nowFocus.eyebrow}
                title={nowFocus.title}
                body={nowFocus.body}
                cta={nowFocus.cta}
                href={nowFocus.href}
                tone={nowFocus.tone}
                meta={cierreHoy ? `Fecha ${fechaHoy}` : "Vista operativa"}
              />
              <FocusCard
                eyebrow={recentFocus.eyebrow}
                title={recentFocus.title}
                body={recentFocus.body}
                cta={recentFocus.cta}
                href={recentFocus.href}
                tone={recentFocus.tone}
                meta={recentFocus.meta}
              />
              <div className="rounded-[28px] border border-white/10 bg-white/5 p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="eyebrow text-xs font-semibold">Atencion</p>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                    {attentionItems.length} aviso{attentionItems.length === 1 ? "" : "s"}
                  </span>
                </div>
                <p className="font-display mt-3 text-2xl font-semibold tracking-tight text-white">
                  {actor.isAdmin && lowStockCount > 0
                    ? "Revisar stock"
                    : pendingTurnos > 0
                      ? "Turnos por ordenar"
                      : cierreHoy
                        ? "Cierre resuelto"
                        : "Sin urgencias"}
                </p>
                <ul className="mt-4 space-y-2 text-sm leading-6 text-zinc-300">
                  {attentionItems.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#8cff59] shadow-[0_0_10px_rgba(140,255,89,0.65)]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={attentionFocus.href}
                  className={`mt-5 inline-flex min-h-11 items-center rounded-2xl px-4 text-sm font-semibold ${
                    attentionFocus.tone === "brand"
                      ? "neon-button"
                      : attentionFocus.tone === "amber"
                        ? "border border-amber-500/30 bg-[rgba(245,158,11,0.12)] text-amber-100 hover:bg-[rgba(245,158,11,0.18)]"
                        : "ghost-button"
                  }`}
                >
                  {attentionFocus.cta}
                </Link>
              </div>
            </div>
          </div>
        </section>

        <HoyActionStrip
          turnos={turnosMini}
          servicios={serviciosActivos.map((s) => ({ id: s.id, nombre: s.nombre, precioBase: s.precioBase }))}
          mediosPago={mediosPagoActivos.map((m) => ({ id: m.id, nombre: m.nombre, comisionPorcentaje: m.comisionPorcentaje }))}
          action={registrarAtencionExpressAction}
        />

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <StatCard eyebrow="Caja" label="Estado" value={cierreHoy ? "Cerrada" : "Operando"} helper={cierreHoy ? `Cerrada a las ${formatHora(cierreHoy.cerradoEn)}` : "Todavia admite movimientos"} />
          <StatCard eyebrow="Atenciones" label="Mis atenciones" value={String(atencionesCount)} helper={atencionesCount > 0 ? `${formatARS(ingresosServicios)} en servicios` : "Todavia no cobraste"} />
          <StatCard eyebrow="Turnos" label="Agenda de hoy" value={String(turnosCount)} helper={pendingTurnos > 0 ? `${pendingTurnos} pendientes de confirmar` : "Agenda al dia"} />
          <StatCard eyebrow="Productos" label="Ventas de hoy" value={String(ventasCount)} helper={ventasCount > 0 ? `${formatARS(ingresosProductos)} en retail` : "Sin retail por ahora"} />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
          <section className="panel-card rounded-[30px] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="eyebrow text-xs font-semibold">Recien paso</p>
                <h2 className="font-display mt-2 text-2xl font-semibold text-white">Pulso reciente</h2>
                <p className="mt-1 text-sm text-zinc-400">
                  Servicios, ventas y anulaciones mezcladas para leer el dia de un vistazo.
                </p>
              </div>
              <Link href="/caja" className="panel-soft rounded-2xl px-4 py-3 text-sm text-zinc-300">
                Ver caja completa
              </Link>
            </div>

            {recentMovement.length === 0 ? (
              <div className="mt-5 rounded-[24px] border border-dashed border-zinc-700 bg-zinc-950/25 p-10 text-center text-sm text-zinc-400">
                Todavia no hay movimiento registrado hoy.
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                {recentMovement.map((item) => (
                  <article key={item.id} className="flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-zinc-800 bg-zinc-950/25 px-4 py-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.tone}`}>{item.badge}</span>
                        <span className="text-xs text-zinc-500">{formatHora(item.time)}</span>
                      </div>
                      <p className="mt-3 text-lg font-semibold text-white">{item.title}</p>
                      <p className="mt-1 text-sm text-zinc-400">{item.detail}</p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <div className="space-y-6">
            <section className="panel-card rounded-[30px] p-5">
              <p className="eyebrow text-xs font-semibold">Alertas</p>
              <h2 className="font-display mt-2 text-xl font-semibold text-white">Lo que merece atencion</h2>

              <div className="mt-4 space-y-3">
                {pendingTurnos > 0 ? (
                  <AlertCard
                    title="Turnos pendientes"
                    body={`Tenes ${pendingTurnos} turno${pendingTurnos === 1 ? "" : "s"} pendiente${pendingTurnos === 1 ? "" : "s"} para revisar.`}
                    href="/turnos?estado=pendiente"
                    cta="Ir a turnos"
                  />
                ) : null}
                {actor.isAdmin && lowStockCount > 0 ? (
                  <AlertCard
                    title="Stock bajo"
                    body={`${lowStockCount} producto${lowStockCount === 1 ? "" : "s"} quedaron por debajo del minimo.`}
                    href="/inventario"
                    cta="Ver inventario"
                  />
                ) : null}
                {cierreHoy ? (
                  <AlertCard
                    title="Caja cerrada"
                    body={`Cerrada por ${cierreHoy.cerradoPorNombre ?? "el responsable"} a las ${formatHora(cierreHoy.cerradoEn)}.`}
                    href={`/caja/cierre/${fechaHoy}`}
                    cta="Ver cierre"
                    tone="success"
                  />
                ) : (
                  <AlertCard
                    title="Caja abierta"
                    body="El dia sigue operando. Cierra cuando no entren mas servicios ni ventas."
                    href="/caja"
                    cta="Ver caja"
                    tone="neutral"
                  />
                )}
              </div>
            </section>

            {monthCard ? (
              <details className="panel-card rounded-[30px] p-5">
                <summary className="cursor-pointer list-none">
                  <p className="eyebrow text-xs font-semibold">Mi mes</p>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-display text-xl font-semibold text-white">Resumen personal</p>
                      <p className="mt-1 text-sm text-zinc-400">Abrilo si quieres ver mas detalle.</p>
                    </div>
                    <div className="rounded-2xl bg-[#8cff59] px-4 py-3 text-right text-[#07130a]">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#07130a]/65">Comision</p>
                      <p className="mt-1 text-lg font-bold">{formatARS(monthCard.comision)}</p>
                    </div>
                  </div>
                </summary>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <MetricCard label="Cortes" value={String(monthCard.cortes)} />
                  <MetricCard label="Bruto" value={formatARS(monthCard.bruto)} />
                  <MetricCard label="Comision" value={formatARS(monthCard.comision)} />
                  <MetricCard label="Ranking" value={`#${monthCard.ranking} de ${monthCard.totalBarberos}`} />
                </div>
              </details>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

function StatCard({ eyebrow, label, value, helper }: { eyebrow: string; label: string; value: string; helper: string }) {
  return (
    <div className="panel-card rounded-[26px] p-5">
      <p className="eyebrow text-xs font-semibold">{eyebrow}</p>
      <p className="mt-3 text-sm text-zinc-400">{label}</p>
      <p className="font-display mt-2 text-2xl font-semibold tracking-tight text-white">{value}</p>
      <p className="mt-2 text-sm text-zinc-400">{helper}</p>
    </div>
  );
}

function FocusCard({
  eyebrow,
  title,
  body,
  cta,
  href,
  meta,
  tone = "neutral",
}: {
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
  href: string;
  meta?: string;
  tone?: "brand" | "amber" | "neutral";
}) {
  const toneClass =
    tone === "brand"
      ? "border-[#8cff59]/20 bg-[rgba(140,255,89,0.08)]"
      : tone === "amber"
        ? "border-amber-500/30 bg-[rgba(245,158,11,0.08)]"
        : "border-white/10 bg-white/5";

  return (
    <Link
      href={href}
      className={`group rounded-[28px] border p-5 transition hover:-translate-y-0.5 ${toneClass}`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="eyebrow text-xs font-semibold">{eyebrow}</p>
        {meta ? <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-500">{meta}</span> : null}
      </div>
      <p className="font-display mt-3 text-2xl font-semibold tracking-tight text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-zinc-300">{body}</p>
      <p className="mt-4 text-sm font-semibold text-[#8cff59]">{cta}</p>
    </Link>
  );
}

function AlertCard({
  title,
  body,
  href,
  cta,
  tone = "warning",
}: {
  title: string;
  body: string;
  href: string;
  cta: string;
  tone?: "warning" | "success" | "neutral";
}) {
  const toneClass =
    tone === "success"
      ? "border-[#8cff59]/20 bg-[rgba(140,255,89,0.08)]"
      : tone === "neutral"
        ? "border-white/10 bg-white/5"
        : "border-amber-500/30 bg-[rgba(245,158,11,0.08)]";

  return (
    <Link
      href={href}
      className={`block rounded-[24px] border p-4 transition hover:-translate-y-0.5 ${toneClass}`}
    >
      <p className="font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm text-zinc-300">{body}</p>
      <p className="mt-3 text-sm font-medium text-[#8cff59]">{cta}</p>
    </Link>
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
