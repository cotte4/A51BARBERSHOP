import Link from "next/link";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import HoyActionStrip from "@/components/hoy/HoyActionStrip";
import QuickActionButton from "@/components/turnos/QuickActionButton";
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
import { registrarAtencionRapidaSeleccionadaAction } from "@/app/(barbero)/caja/actions";
import { getQuickActionDefaultsForBarbero } from "@/lib/caja-atencion";
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

function formatFechaLarga(fecha: string): string {
  return new Date(`${fecha}T12:00:00`).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Argentina/Buenos_Aires",
  });
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

  const quickDefaults = actor.barberoId ? await getQuickActionDefaultsForBarbero(actor.barberoId) : null;
  const quickOptions = quickDefaults
    ? [
        quickDefaults,
        ...mediosPagoList
          .filter((medio) => {
            const nombre = (medio.nombre ?? "").toLowerCase();
            return medio.id !== quickDefaults.medioPagoId && (nombre.includes("efectivo") || nombre.includes("transf") || nombre.includes("tarjeta") || nombre.includes("posnet"));
          })
          .slice(0, 2)
          .map((medio) => ({
            medioPagoId: medio.id,
            medioPagoNombre: medio.nombre ?? "-",
            precioBase: quickDefaults.precioBase,
            comisionMedioPagoPct: Number(medio.comisionPorcentaje ?? 0),
          })),
      ].slice(0, 2)
    : [];

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
  const cierreHref = cierreHoy ? `/caja/cierre/${fechaHoy}` : actor.isAdmin ? "/caja/cierre" : undefined;
  const cierreLabel = cierreHoy ? "Ver cierre de hoy" : "Cerrar caja";
  const cierreDescription = cierreHoy
    ? `Cerrada por ${cierreHoy.cerradoPorNombre ?? "el responsable"} a las ${formatHora(cierreHoy.cerradoEn)}.`
    : "Confirma antes de cerrar. Queda logueado quien y a que hora.";

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

  return (
    <main className="app-shell min-h-screen px-4 py-6 pb-28">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="overflow-hidden rounded-[32px] bg-stone-950 text-stone-50 shadow-[0_24px_80px_rgba(28,25,23,0.22)]">
          <div className="bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.28),_transparent_32%),radial-gradient(circle_at_bottom_left,_rgba(245,158,11,0.18),_transparent_34%)] p-6 sm:p-7">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-300">Hoy</p>
            <h1 className="mt-3 text-3xl font-semibold capitalize tracking-tight">{formatFechaLarga(fechaHoy)}</h1>
            <p className="mt-3 max-w-2xl text-sm text-stone-300">
              Todo lo que necesitas para trabajar hoy vive aqui: cobrar rapido, ver tu agenda, registrar una atencion nueva y revisar el estado de la caja.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className={`inline-flex min-h-[36px] items-center rounded-full px-3 text-sm font-medium ${cierreHoy ? "bg-white/12 text-white ring-1 ring-white/15" : "bg-emerald-400 text-emerald-950"}`}>
                {cierreHoy ? "Caja cerrada" : "Caja abierta"}
              </span>
              {barberoActual ? (
                <span className="inline-flex min-h-[36px] items-center rounded-full bg-white/10 px-3 text-sm text-stone-200 ring-1 ring-white/10">
                  {barberoActual.nombre}
                </span>
              ) : null}
            </div>
          </div>
        </section>

        <HoyActionStrip
          turnos={turnosMini}
          nuevaAtencionHref="/caja/nueva"
          cierreHref={cierreHref}
          cierreLabel={cierreLabel}
          cierreDescription={cierreDescription}
          canClose={Boolean(cierreHref && (actor.isAdmin || cierreHoy))}
        />

        <section id="cobro-rapido">
          <QuickActionButton
            defaults={quickDefaults}
            options={quickOptions}
            action={registrarAtencionRapidaSeleccionadaAction}
            editHref="/caja/nueva?fromQuickAction=1"
          />
        </section>

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
                <p className="eyebrow text-xs font-semibold">Movimiento reciente</p>
                <h2 className="font-display mt-2 text-2xl font-semibold text-white">Lo ultimo que paso</h2>
                <p className="mt-1 text-sm text-zinc-400">Servicios, ventas y anulaciones mezcladas para leer el dia de un vistazo.</p>
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
                {!quickDefaults ? (
                  <AlertCard title="Cobro rapido sin configurar" body="Define el servicio y medio de pago por defecto para usar el boton principal sin entrar al formulario completo." href="/caja/nueva?fromQuickAction=1" cta="Configurar" />
                ) : null}
                {pendingTurnos > 0 ? (
                  <AlertCard title="Turnos pendientes" body={`Tienes ${pendingTurnos} turno${pendingTurnos === 1 ? "" : "s"} pendiente${pendingTurnos === 1 ? "" : "s"} para revisar.`} href="/turnos?estado=pendiente" cta="Ir a turnos" />
                ) : null}
                {actor.isAdmin && lowStockCount > 0 ? (
                  <AlertCard title="Stock bajo" body={`${lowStockCount} producto${lowStockCount === 1 ? "" : "s"} quedaron por debajo del minimo.`} href="/inventario" cta="Ver inventario" />
                ) : null}
                {cierreHoy ? (
                  <AlertCard title="Caja cerrada" body={`Cerrada por ${cierreHoy.cerradoPorNombre ?? "el responsable"} a las ${formatHora(cierreHoy.cerradoEn)}.`} href={`/caja/cierre/${fechaHoy}`} cta="Ver cierre" tone="success" />
                ) : (
                  <AlertCard title="Caja abierta" body="El dia sigue operando. Cierra cuando no entren mas servicios ni ventas." href="/caja" cta="Ver caja" tone="neutral" />
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

function AlertCard({ title, body, href, cta, tone = "warning" }: { title: string; body: string; href: string; cta: string; tone?: "warning" | "success" | "neutral" }) {
  const toneClass =
    tone === "success"
      ? "border-emerald-500/35 bg-emerald-500/10"
      : tone === "neutral"
        ? "border-zinc-800 bg-zinc-950/25"
        : "border-amber-500/35 bg-amber-500/10";

  return (
    <Link href={href} className={`block rounded-[24px] border p-4 transition hover:-translate-y-0.5 ${toneClass}`}>
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
