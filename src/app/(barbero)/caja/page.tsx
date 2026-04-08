import Link from "next/link";
import { and, count, desc, eq, gte, inArray, lte } from "drizzle-orm";
import AnularButton from "@/components/caja/AnularButton";
import QuickCheckoutPanel from "@/components/caja/QuickCheckoutPanel";
import GastoRapidoFAB from "@/components/gastos-rapidos/GastoRapidoFAB";
import { registrarGastoRapidoAction } from "@/app/(admin)/gastos-rapidos/actions";
import { db } from "@/db";
import {
  atenciones,
  atencionesProductos,
  barberos,
  cierresCaja,
  mediosPago,
  productos,
  servicios,
  stockMovimientos,
} from "@/db/schema";
import { auth } from "@/lib/auth";
import { resolveCajaActorBarberoId } from "@/lib/caja-atencion";
import { headers } from "next/headers";
import {
  formatARS,
  formatFechaLarga,
  formatHora,
  formatHoraDate,
  getAtencionTone,
  getFechaHoy,
  getPaymentAccent,
  getProductoEmoji,
} from "./_lib/page-helpers";
import {
  AtencionDisclosureCard,
  MovementDisclosureCard,
} from "./_components/DisclosureCards";
import {
  anularAtencion,
  registrarAtencionExpressAction,
} from "./actions";

type CajaPageProps = {
  searchParams: Promise<{ vista?: string }>;
};

type MovementItem = {
  id: string;
  timestamp: Date | null;
  timeLabel: string;
  title: string;
  subtitle: string;
  amount: number;
  tone: string;
  badge: string;
  detail: string;
};

export default async function CajaPage({ searchParams }: CajaPageProps) {
  const session = await auth.api.getSession({ headers: await headers() });
  const userRole = (session?.user as { role?: string })?.role;
  const isAdmin = userRole === "admin";
  const userId = session?.user?.id;
  const params = await searchParams;
  const vista = params.vista === "detalle" ? "detalle" : "simple";

  const fechaHoy = getFechaHoy();
  const quickActionBarberoId = userId
    ? await resolveCajaActorBarberoId(userId, isAdmin)
    : null;

  const [cierreHoy] = await db
    .select({
      id: cierresCaja.id,
      totalNeto: cierresCaja.totalNeto,
      totalBruto: cierresCaja.totalBruto,
      cerradoEn: cierresCaja.cerradoEn,
      cerradoPorNombre: barberos.nombre,
    })
    .from(cierresCaja)
    .leftJoin(barberos, eq(barberos.id, cierresCaja.cerradoPor))
    .where(eq(cierresCaja.fecha, fechaHoy))
    .limit(1);

  const [barberoDelUsuario] = isAdmin
    ? [null]
    : await db
        .select()
        .from(barberos)
        .where(eq(barberos.userId, userId!))
        .limit(1);

  const atencionesDelDia = isAdmin
    ? await db.select().from(atenciones).where(eq(atenciones.fecha, fechaHoy))
    : await db
        .select()
        .from(atenciones)
        .where(
          and(
            eq(atenciones.fecha, fechaHoy),
            eq(atenciones.barberoId, barberoDelUsuario?.id ?? "")
          )
        );

  const barberosMap = new Map((await db.select().from(barberos)).map((barbero) => [barbero.id, barbero]));
  const serviciosActivos = await db.select().from(servicios).where(eq(servicios.activo, true));
  const serviciosMap = new Map(serviciosActivos.map((servicio) => [servicio.id, servicio]));
  const mediosPagoActivos = await db.select().from(mediosPago).where(eq(mediosPago.activo, true));
  const mediosPagoMap = new Map(mediosPagoActivos.map((medio) => [medio.id, medio]));

  const atencionesActivas = atencionesDelDia.filter((atencion) => !atencion.anulado);
  const atencionesAnuladas = atencionesDelDia.length - atencionesActivas.length;
  const totalBruto = atencionesActivas.reduce(
    (sum, atencion) => sum + Number(atencion.precioCobrado ?? 0),
    0
  );
  const totalComisionesMp = atencionesActivas.reduce(
    (sum, atencion) => sum + Number(atencion.comisionMedioPagoMonto ?? 0),
    0
  );
  const totalNeto = atencionesActivas.reduce(
    (sum, atencion) => sum + Number(atencion.montoNeto ?? 0),
    0
  );
  const totalAtenciones = atencionesActivas.length;

  const desglosePorBarbero = isAdmin
    ? Array.from(
        atencionesActivas.reduce((map, atencion) => {
          if (!atencion.barberoId) return map;
          const prev = map.get(atencion.barberoId) ?? { cortes: 0, bruto: 0 };
          map.set(atencion.barberoId, {
            cortes: prev.cortes + 1,
            bruto: prev.bruto + Number(atencion.precioCobrado ?? 0),
          });
          return map;
        }, new Map<string, { cortes: number; bruto: number }>())
      )
    : [];

  const inicioDia = new Date(`${fechaHoy}T00:00:00-03:00`);
  const finDia = new Date(`${fechaHoy}T23:59:59-03:00`);
  const ventasProductosDia = await db
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
    .orderBy(desc(stockMovimientos.fecha));

  const productosMap = new Map(
    (await db.select().from(productos)).map((producto) => [producto.id, producto])
  );

  const totalProductos = ventasProductosDia.reduce(
    (sum, venta) => sum + Math.abs(Number(venta.cantidad ?? 0)) * Number(venta.precioUnitario ?? 0),
    0
  );

  const atencionesOrdenadas = [...atencionesDelDia].sort((a, b) => {
    if (!a.creadoEn || !b.creadoEn) return 0;
    return new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime();
  });

  const productosPorAtencion =
    atencionesDelDia.length > 0
      ? await db
          .select()
          .from(atencionesProductos)
          .where(inArray(atencionesProductos.atencionId, atencionesDelDia.map((item) => item.id)))
      : [];
  const productosPorAtencionMap = productosPorAtencion.reduce(
    (map, item) => {
      const atencionId = item.atencionId ?? "";
      const producto = productosMap.get(item.productoId ?? "");
      const current = map.get(atencionId) ?? [];
      current.push(producto?.nombre ?? "Producto");
      map.set(atencionId, current);
      return map;
    },
    new Map<string, string[]>()
  );

  const paymentTotals = new Map<
    string,
    { label: string; amount: number; className: string }
  >();

  for (const atencion of atencionesActivas) {
    const medio = mediosPagoMap.get(atencion.medioPagoId ?? "");
    const accent = getPaymentAccent(medio?.nombre);
    const current = paymentTotals.get(accent.label) ?? {
      label: accent.label,
      amount: 0,
      className: accent.className,
    };
    current.amount += Number(atencion.montoNeto ?? 0);
    paymentTotals.set(accent.label, current);
  }

  for (const venta of ventasProductosDia) {
    const medio = mediosPagoMap.get(venta.notas ?? "");
    const accent = getPaymentAccent(medio?.nombre);
    const current = paymentTotals.get(accent.label) ?? {
      label: accent.label,
      amount: 0,
      className: accent.className,
    };
    current.amount +=
      Math.abs(Number(venta.cantidad ?? 0)) * Number(venta.precioUnitario ?? 0);
    paymentTotals.set(accent.label, current);
  }

  const paymentBreakdown = [...paymentTotals.values()].sort((a, b) => b.amount - a.amount);

  const mixedMovement: MovementItem[] = [
    ...atencionesOrdenadas.map((atencion) => {
      const servicio = serviciosMap.get(atencion.servicioId ?? "");
      const barbero = barberosMap.get(atencion.barberoId ?? "");
      const medio = mediosPagoMap.get(atencion.medioPagoId ?? "");
      const accent = getPaymentAccent(medio?.nombre);

      return {
        id: `atencion-${atencion.id}`,
        timestamp: atencion.creadoEn,
        timeLabel: formatHora(atencion.hora),
        title: servicio?.nombre ?? "Servicio",
        subtitle: barbero?.nombre ?? "Sin barbero",
        amount: Number(atencion.anulado ? atencion.precioCobrado : atencion.montoNeto ?? 0),
        tone: atencion.anulado
          ? "border-red-500/30 bg-red-500/10 text-red-300"
          : "border-zinc-700 bg-zinc-900 text-white",
        badge: atencion.anulado ? "Anulada" : "Servicio",
        detail: `${accent.label} - ${atencion.anulado ? "fuera de caja" : "entra al neto"}`,
      };
    }),
    ...ventasProductosDia.map((venta) => {
      const producto = productosMap.get(venta.productoId ?? "");
      const medio = mediosPagoMap.get(venta.notas ?? "");
      const accent = getPaymentAccent(medio?.nombre);
      const cantidadAbs = Math.abs(Number(venta.cantidad ?? 0));

      return {
        id: `producto-${venta.id}`,
        timestamp: venta.fecha,
        timeLabel: formatHoraDate(venta.fecha),
        title: producto?.nombre ?? "Producto",
        subtitle: `${cantidadAbs} x ${formatARS(Number(venta.precioUnitario ?? 0))}`,
        amount: cantidadAbs * Number(venta.precioUnitario ?? 0),
        tone: "border-sky-500/30 bg-sky-500/10 text-sky-300",
        badge: "Producto",
        detail: accent.label,
      };
    }),
  ].sort((a, b) => (b.timestamp?.getTime() ?? 0) - (a.timestamp?.getTime() ?? 0));

  const hoyStr = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
  const [anio, mes] = hoyStr.split("-");
  const inicioDeMes = `${anio}-${mes}-01`;
  const finDeMes = hoyStr;

  let cortesDelMes = 0;
  let brutoDelMes = 0;
  let comisionDelMes = 0;
  let alquilerMensual = 0;
  let netoProyectado = 0;
  let posicionRanking = 0;
  let totalBarberosRanking = 0;

  if (!isAdmin && barberoDelUsuario) {
    const atencionesDelMes = await db
      .select()
      .from(atenciones)
      .where(
        and(
          eq(atenciones.barberoId, barberoDelUsuario.id),
          eq(atenciones.anulado, false),
          gte(atenciones.fecha, inicioDeMes),
          lte(atenciones.fecha, finDeMes)
        )
      );

    cortesDelMes = atencionesDelMes.length;
    brutoDelMes = atencionesDelMes.reduce(
      (sum, atencion) => sum + Number(atencion.precioCobrado ?? 0),
      0
    );
    comisionDelMes = atencionesDelMes.reduce(
      (sum, atencion) => sum + Number(atencion.comisionBarberoMonto ?? 0),
      0
    );
    alquilerMensual = 0;
    netoProyectado = comisionDelMes;

    const cortesPorBarberoRaw = await db
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
      .groupBy(atenciones.barberoId);

    cortesPorBarberoRaw.sort((a, b) => b.cortes - a.cortes);
    posicionRanking =
      cortesPorBarberoRaw.findIndex((item) => item.barberoId === barberoDelUsuario.id) + 1;
    totalBarberosRanking = cortesPorBarberoRaw.length;
  }


  const cardsResumen = [
    {
      eyebrow: "Caja viva",
      label: "Ingresos del dia",
      value: formatARS(totalBruto + totalProductos),
      helper: `${totalAtenciones} atenciones activas`,
    },
    {
      eyebrow: "Operacion",
      label: "Neto en caja",
      value: formatARS(totalNeto + totalProductos),
      helper:
        totalComisionesMp > 0
          ? `${formatARS(totalComisionesMp)} en comisiones de medios`
          : "Sin descuentos de medios por ahora",
    },
    {
      eyebrow: "Ritmo",
      label: "Productos",
      value: totalProductos > 0 ? formatARS(totalProductos) : "Sin ventas",
      helper:
        ventasProductosDia.length > 0
          ? `${ventasProductosDia.length} movimientos de productos hoy`
          : "Todavia no hubo ventas de productos",
    },
    {
      eyebrow: "Control",
      label: cierreHoy ? "Dia cerrado" : "Caja abierta",
      value: cierreHoy ? "Cerrada" : "Operando",
      helper:
        atencionesAnuladas > 0
          ? `${atencionesAnuladas} anuladas para revisar`
          : "Sin anulaciones registradas",
    },
  ];

  return (
    <main className="app-shell min-h-screen px-4 py-6 pb-28">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="overflow-hidden rounded-[32px] border border-zinc-800 bg-[radial-gradient(circle_at_top_right,_rgba(140,255,89,0.14),_transparent_34%),radial-gradient(circle_at_bottom_left,_rgba(245,158,11,0.14),_transparent_30%),linear-gradient(180deg,_rgba(15,15,16,0.98),_rgba(9,9,10,0.98))] text-stone-50 shadow-[0_24px_80px_rgba(28,25,23,0.22)]">
          <div className="p-6 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="max-w-3xl space-y-4">
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-stone-300">
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                    Caja
                  </span>
                  <span>{formatFechaLarga(fechaHoy)}</span>
                </div>

                <div className="space-y-3">
                  <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                    Resumen del dia
                  </h1>
                  <p className="max-w-2xl text-sm leading-6 text-stone-300 sm:text-base">
                    Caja, ritmo y control del dia en la misma cabina.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span
                    className={`inline-flex min-h-[36px] items-center rounded-full border px-3 text-sm font-medium ${
                      cierreHoy
                        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'
                        : 'border-[#8cff59]/20 bg-[#8cff59]/10 text-[#b9ff96]'
                    }`}
                  >
                    {cierreHoy ? 'Caja cerrada' : 'Caja operando'}
                  </span>
                  <span className="inline-flex min-h-[36px] items-center rounded-full bg-white/10 px-3 text-sm text-stone-200 ring-1 ring-white/10">
                    {totalAtenciones} servicios
                  </span>
                  <span className="inline-flex min-h-[36px] items-center rounded-full bg-white/10 px-3 text-sm text-stone-200 ring-1 ring-white/10">
                    Neto {formatARS(cierreHoy ? cierreHoy.totalNeto : totalNeto + totalProductos)}
                  </span>
                </div>

                <p className="max-w-2xl text-sm leading-6 text-stone-300">
                  {cierreHoy
                    ? `La cerro ${cierreHoy.cerradoPorNombre ?? 'el responsable'} a las ${formatHoraDate(cierreHoy.cerradoEn)}.`
                    : atencionesAnuladas > 0
                      ? `${atencionesAnuladas} anuladas para revisar antes de seguir.`
                      : 'Sin anulaciones registradas hasta ahora.'}
                </p>

              </div>

              <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-black/20 p-4 backdrop-blur-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-400">
                  Estado de caja
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[22px] bg-white/5 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-stone-400">Bruto</p>
                    <p className="mt-2 text-xl font-semibold text-white">
                      {formatARS(cierreHoy ? cierreHoy.totalBruto : totalBruto + totalProductos)}
                    </p>
                  </div>
                  <div className="rounded-[22px] bg-white/5 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-stone-400">Neto</p>
                    <p className="mt-2 text-xl font-semibold text-white">
                      {formatARS(cierreHoy ? cierreHoy.totalNeto : totalNeto + totalProductos)}
                    </p>
                  </div>
                  <div className="rounded-[22px] bg-white/5 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-stone-400">Productos</p>
                    <p className="mt-2 text-xl font-semibold text-white">
                      {totalProductos > 0 ? formatARS(totalProductos) : 'Sin ventas'}
                    </p>
                  </div>
                  <div className="rounded-[22px] bg-white/5 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-stone-400">Control</p>
                    <p className="mt-2 text-xl font-semibold text-white">
                      {cierreHoy ? 'Cerrada' : 'Activa'}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-stone-300">
                  {cierreHoy
                    ? 'El resumen final queda listo para imprimir o revisar despues.'
                    : 'Usa el cobro rapido para no salirte del flujo del dia.'}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
              {!cierreHoy ? (
                <>
                  <Link
                    href="/caja/vender"
                    className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-white/10 px-4 text-sm font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/18"
                  >
                    Vender producto
                  </Link>
                  {isAdmin ? (
                    <Link
                      href="/caja/cierre"
                      className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-amber-300/15 px-4 text-sm font-semibold text-amber-200 ring-1 ring-amber-300/20 transition hover:bg-amber-300/22"
                    >
                      Cerrar caja
                    </Link>
                  ) : (
                    <span className="inline-flex min-h-[44px] items-center rounded-full border border-white/10 px-4 text-sm text-zinc-300">
                      El cierre lo hace el owner
                    </span>
                  )}
                </>
              ) : (
                <Link
                  href={`/caja/cierre/${fechaHoy}`}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-white/10 px-4 text-sm font-semibold text-white ring-1 ring-white/15 transition hover:bg-white/18"
                >
                  Ver resumen del cierre
                </Link>
              )}
              <Link
                href="/caja"
                className={`inline-flex min-h-[44px] items-center justify-center rounded-full px-4 text-sm font-semibold ${
                  vista === 'simple'
                    ? 'bg-[#8cff59] text-[#07130a]'
                    : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                Vista simple
              </Link>
              <Link
                href="/caja?vista=detalle"
                className={`inline-flex min-h-[44px] items-center justify-center rounded-full px-4 text-sm font-semibold ${
                  vista === 'detalle'
                    ? 'bg-[#8cff59] text-[#07130a]'
                    : 'bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                Vista separada
              </Link>
            </div>
          </div>
        </section>

        {!cierreHoy && serviciosActivos.length > 0 ? (
          <section className="rounded-[30px] border border-[#8cff59]/15 bg-zinc-950/55 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="eyebrow text-xs font-semibold">Cobro rapido</p>
                <h2 className="font-display mt-2 text-2xl font-semibold text-white">
                  Registrar una atencion express
                </h2>
                <p className="mt-1 text-sm leading-6 text-zinc-400">
                  Con servicio, medio de pago y neto listos para guardar.
                </p>
              </div>
              <div className="panel-soft rounded-2xl px-4 py-3 text-sm text-zinc-300">
                {serviciosActivos.length} servicios activos
              </div>
            </div>
            <div className="mt-5">
              <QuickCheckoutPanel
                servicios={serviciosActivos.map((s) => ({
                  id: s.id,
                  nombre: s.nombre,
                  precioBase: s.precioBase,
                }))}
                mediosPago={mediosPagoActivos.map((m) => ({
                  id: m.id,
                  nombre: m.nombre,
                  comisionPorcentaje: m.comisionPorcentaje,
                }))}
                action={registrarAtencionExpressAction}
                variant="embedded"
              />
            </div>
          </section>
        ) : null}

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {cardsResumen.map((card) => (
            <div key={card.label} className="panel-card rounded-[26px] p-5">
              <p className="eyebrow text-xs font-semibold">{card.eyebrow}</p>
              <p className="mt-3 text-sm text-zinc-400">{card.label}</p>
              <p className="font-display mt-2 text-2xl font-semibold tracking-tight text-white">
                {card.value}
              </p>
              <p className="mt-2 text-sm text-zinc-400">{card.helper}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.18fr_0.82fr]">
          <div className="space-y-4">
            {vista === 'simple' ? (
              <section className="panel-card rounded-[30px] p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="eyebrow text-xs font-semibold">Movimiento mezclado</p>
                    <h2 className="font-display mt-2 text-2xl font-semibold text-white">
                      Servicios y productos, en una sola linea
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-zinc-400">
                      La lectura mas rapida para ver el dia sin cambiar de contexto.
                    </p>
                  </div>
                  <div className="panel-soft rounded-2xl px-4 py-3 text-sm text-zinc-300">
                    {mixedMovement.length > 0 ? `${mixedMovement.length} movimientos hoy` : 'Sin movimientos'}
                  </div>
                </div>

                {mixedMovement.length === 0 ? (
                  <div className="mt-5 rounded-[24px] border border-dashed border-zinc-700 bg-zinc-950/25 p-10 text-center text-sm text-zinc-400">
                    No hay movimiento registrado hoy.
                  </div>
                ) : (
                  <div className="mt-5 space-y-3">
                    {mixedMovement.map((item) => (
                      <MovementDisclosureCard
                        key={item.id}
                        timeLabel={item.timeLabel}
                        badge={item.badge}
                        title={item.title}
                        subtitle={item.subtitle}
                        detail={item.detail}
                        amountLabel={formatARS(item.amount)}
                        toneClassName={item.tone}
                      />
                    ))}
                  </div>
                )}
              </section>
            ) : (
              <section className="panel-card rounded-[30px] p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="eyebrow text-xs font-semibold">Flujo del dia</p>
                    <h2 className="font-display mt-2 text-2xl font-semibold text-white">
                      Atenciones listas para escanear
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-zinc-400">
                      Hora, servicio, monto y acciones resueltas en una sola mirada.
                    </p>
                  </div>
                  <div className="panel-soft rounded-2xl px-4 py-3 text-sm text-zinc-300">
                    {atencionesOrdenadas.length > 0 ? `${atencionesOrdenadas.length} registros totales hoy` : 'Todavia no hay movimiento'}
                  </div>
                </div>

                {atencionesOrdenadas.length === 0 ? (
                  <div className="mt-5 rounded-[24px] border border-dashed border-zinc-700 bg-zinc-950/25 p-10 text-center text-sm text-zinc-400">
                    No hay atenciones registradas hoy.
                  </div>
                ) : (
                  <div className="mt-5 space-y-4">
                    {atencionesOrdenadas.map((atencion) => {
                      const barbero = barberosMap.get(atencion.barberoId ?? '');
                      const servicio = serviciosMap.get(atencion.servicioId ?? '');
                      const mp = mediosPagoMap.get(atencion.medioPagoId ?? '');
                      const tone = getAtencionTone(Boolean(atencion.anulado));
                      const paymentAccent = getPaymentAccent(mp?.nombre);

                      return (
                        <article
                          key={atencion.id}
                          className={`relative overflow-hidden rounded-[26px] border p-5 transition ${tone.wrapper}`}
                        >
                          <span className={`absolute inset-y-0 left-0 w-1.5 ${tone.rail}`} aria-hidden="true" />

                          <div className="ml-2 flex flex-wrap items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-stone-900 px-3 py-1 text-sm font-semibold text-white">
                                  {formatHora(atencion.hora)}
                                </span>
                                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tone.badge}`}>
                                  {atencion.anulado ? 'Anulada' : 'Activa'}
                                </span>
                                <span className={`rounded-full px-3 py-1 text-xs font-medium ${paymentAccent.className}`}>
                                  {paymentAccent.label}
                                </span>
                              </div>

                              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
                                <h3 className={`text-xl font-semibold tracking-tight ${tone.meta}`}>
                                  {servicio?.nombre ?? 'Servicio'}
                                </h3>
                                <span className="text-sm text-zinc-500">|</span>
                                <p className="text-sm text-zinc-400">
                                  {barbero?.nombre ?? 'Sin barbero'}
                                </p>
                              </div>

                              <div className="mt-3 flex flex-wrap gap-2 text-sm text-zinc-300">
                                <span className="rounded-full bg-zinc-900/70 px-3 py-1">
                                  Bruto {formatARS(atencion.precioCobrado)}
                                </span>
                                {!atencion.anulado ? (
                                  <span className="rounded-full bg-zinc-900/70 px-3 py-1">
                                    Neto {formatARS(atencion.montoNeto)}
                                  </span>
                                ) : null}
                                {Number(mp?.comisionPorcentaje ?? 0) > 0 ? (
                                  <span className="rounded-full bg-zinc-900/70 px-3 py-1">
                                    Comision {mp?.comisionPorcentaje}%
                                  </span>
                                ) : null}
                              </div>

                              {(() => {
                                const productosAtencion = productosPorAtencionMap.get(atencion.id) ?? [];
                                if (productosAtencion.length === 0) return null;

                                return (
                                  <p className="mt-3 text-sm text-zinc-400">
                                    + {productosAtencion.join(', ')}
                                  </p>
                                );
                              })()}

                              {atencion.anulado && atencion.motivoAnulacion ? (
                                <p className={`mt-4 text-sm ${tone.note}`}>
                                  Motivo: {atencion.motivoAnulacion}
                                </p>
                              ) : null}

                              {atencion.notas && !atencion.anulado ? (
                                <p className={`mt-4 text-sm ${tone.note}`}>{atencion.notas}</p>
                              ) : null}
                            </div>

                            <div className="flex min-w-[170px] flex-col items-start gap-3 sm:items-end">
                              <div className="rounded-[22px] bg-zinc-950/45 px-4 py-3 text-left sm:text-right">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                                  Impacto
                                </p>
                                <p className={`mt-2 text-2xl font-semibold tracking-tight ${tone.amount}`}>
                                  {formatARS(atencion.anulado ? atencion.precioCobrado : atencion.montoNeto)}
                                </p>
                                <p className="mt-1 text-sm text-zinc-400">
                                  {atencion.anulado ? 'fuera de caja' : 'entra en el neto del dia'}
                                </p>
                              </div>

                              {!atencion.anulado ? (
                                <div className="flex flex-wrap gap-2 sm:justify-end">
                                  <Link
                                    href={`/caja/${atencion.id}/editar`}
                                    className="neon-button inline-flex min-h-[44px] items-center justify-center rounded-2xl px-4 text-sm font-medium"
                                  >
                                    Editar
                                  </Link>
                                  {isAdmin ? (
                                    <AnularButton atencionId={atencion.id} anularAction={anularAtencion} />
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            )}
          </div>

          <div className="space-y-4">
            {isAdmin && desglosePorBarbero.length > 0 ? (
              <section className="panel-card rounded-[30px] p-5">
                <p className="eyebrow text-xs font-semibold">Agentes</p>
                <h2 className="font-display mt-2 text-xl font-semibold text-white">
                  Pulso por barbero
                </h2>
                <p className="mt-1 text-sm leading-6 text-zinc-400">
                  Te da una foto rapida de quien movio mas volumen en el dia.
                </p>
                <div className="mt-4 space-y-3">
                  {desglosePorBarbero.map(([barberoId, datos]) => {
                    const barbero = barberosMap.get(barberoId);
                    return (
                      <div key={barberoId} className="panel-soft rounded-[22px] px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-white">{barbero?.nombre ?? '-'}</p>
                            <p className="mt-1 text-sm text-zinc-400">
                              {datos.cortes} corte{datos.cortes !== 1 ? 's' : ''}
                            </p>
                          </div>
                          <p className="text-lg font-semibold text-white">{formatARS(datos.bruto)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null}

            <section className="panel-card rounded-[30px] p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="eyebrow text-xs font-semibold">Caja neta</p>
                  <h2 className="font-display mt-2 text-xl font-semibold text-white">
                    Resumen economico
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-zinc-400">
                    Servicios, productos y comisiones separados para no mezclar lectura.
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {paymentBreakdown.length === 0 ? (
                  <div className="rounded-[24px] border border-dashed border-zinc-700 bg-zinc-950/25 p-6 text-center text-sm text-zinc-400">
                    Todavia no hay cobros registrados hoy.
                  </div>
                ) : (
                  paymentBreakdown.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between gap-3 rounded-[22px] border border-zinc-800 bg-zinc-950/25 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${item.className}`}
                        >
                          {item.label}
                        </span>
                        <p className="mt-2 text-sm text-zinc-400">Neto del dia por este medio</p>
                      </div>
                      <p className="text-lg font-semibold text-white">{formatARS(item.amount)}</p>
                    </div>
                  ))
                )}
              </div>
            </section>

            {!isAdmin && barberoDelUsuario ? (
              <section className="panel-card rounded-[30px] p-5">
                <p className="eyebrow text-xs font-semibold">Mi mes</p>
                <h2 className="font-display mt-2 text-xl font-semibold text-white">
                  Performance acumulada
                </h2>
                <p className="mt-1 text-sm text-zinc-400">
                  {new Date(`${inicioDeMes}T12:00:00`).toLocaleDateString('es-AR', {
                    month: 'long',
                    year: 'numeric',
                    timeZone: 'America/Argentina/Buenos_Aires',
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
                  {alquilerMensual > 0 ? (
                    <MetricRow
                      label="Alquiler mensual"
                      value={`-${formatARS(alquilerMensual)}`}
                      valueClassName="text-red-300"
                    />
                  ) : null}
                  <MetricRow
                    label="Neto proyectado"
                    value={formatARS(Math.max(0, netoProyectado))}
                    strong
                  />
                </div>
              </section>
            ) : null}

            <section
              className={`rounded-[30px] border p-5 shadow-sm ${
                cierreHoy
                  ? 'border-emerald-500/30 bg-emerald-500/10'
                  : 'border-amber-500/35 bg-amber-500/10'
              }`}
            >
              <p
                className={`text-xs font-semibold uppercase tracking-[0.22em] ${
                  cierreHoy ? 'text-emerald-200' : 'text-amber-300'
                }`}
              >
                Cierre
              </p>
              <h2 className="font-display mt-2 text-xl font-semibold text-white">
                {cierreHoy ? 'Caja cerrada y logueada' : 'Ultimo paso de la jornada'}
              </h2>
              <p className="mt-2 text-sm text-zinc-300">
                {cierreHoy
                  ? `La cerro ${cierreHoy.cerradoPorNombre ?? 'el responsable'} a las ${formatHoraDate(cierreHoy.cerradoEn)}.`
                  : 'Cerrala solo cuando el dia este realmente terminado y ya no vayan a entrar mas servicios ni ventas.'}
              </p>

              <div className="mt-4 space-y-3">
                <MetricRow
                  label={cierreHoy ? 'Neto cerrado' : 'Neto actual'}
                  value={formatARS(cierreHoy ? cierreHoy.totalNeto : totalNeto + totalProductos)}
                  strong={Boolean(cierreHoy)}
                />
                <MetricRow
                  label={cierreHoy ? 'Bruto cerrado' : 'Estado'}
                  value={cierreHoy ? formatARS(cierreHoy.totalBruto) : 'Esperando cierre'}
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {cierreHoy ? (
                  <Link
                    href={`/caja/cierre/${fechaHoy}`}
                    className="inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-white px-4 text-sm font-semibold text-stone-950 hover:bg-stone-100"
                  >
                    Ver resumen final
                  </Link>
                ) : isAdmin ? (
                  <Link
                    href="/caja/cierre"
                    className="inline-flex min-h-[48px] items-center justify-center rounded-2xl bg-amber-400 px-4 text-sm font-semibold text-amber-950 transition hover:bg-amber-300"
                  >
                    Ir al cierre
                  </Link>
                ) : (
                  <div className="inline-flex min-h-[48px] items-center rounded-2xl border border-white/10 px-4 text-sm text-zinc-300">
                    El cierre lo hace el owner
                  </div>
                )}
              </div>
            </section>
          </div>
        </section>

        {isAdmin ? (
          <div className="flex justify-end">
            <GastoRapidoFAB
              action={registrarGastoRapidoAction}
              returnTo="/caja"
              historyHref="/gastos-rapidos"
            />
          </div>
        ) : null}
      </div>
    </main>
  );
}

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
