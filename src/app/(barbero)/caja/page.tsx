import Link from "next/link";
import { and, count, eq, gte, lte } from "drizzle-orm";
import AnularButton from "@/components/caja/AnularButton";
import GastoRapidoFAB from "@/components/gastos-rapidos/GastoRapidoFAB";
import QuickActionButton from "@/components/turnos/QuickActionButton";
import { registrarGastoRapidoAction } from "@/app/(admin)/gastos-rapidos/actions";
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
import { auth } from "@/lib/auth";
import { getQuickActionDefaultsForBarbero, resolveCajaActorBarberoId } from "@/lib/caja-atencion";
import { headers } from "next/headers";
import type { QuickActionOption } from "@/lib/types";
import {
  anularAtencion,
  registrarAtencionRapidaSeleccionadaAction,
} from "./actions";

function formatARS(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(Number(value));
}

function getFechaHoy(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

function formatFechaLarga(fechaISO: string): string {
  const [year, month, day] = fechaISO.split("-").map(Number);
  const fecha = new Date(year, month - 1, day);
  return fecha.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

function formatHora(hora: string | null): string {
  if (!hora) return "--:--";
  return hora.slice(0, 5);
}

function getPaymentAccent(nombre: string | null | undefined) {
  const normalized = (nombre ?? "").toLowerCase();

  if (normalized.includes("efectivo")) {
    return {
      label: "Efectivo",
      className: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    };
  }

  if (normalized.includes("transfer")) {
    return {
      label: nombre ?? "Transferencia",
      className: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
    };
  }

  if (normalized.includes("tarjeta") || normalized.includes("posnet") || normalized.includes("mp")) {
    return {
      label: nombre ?? "Tarjeta",
      className: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
    };
  }

  return {
    label: nombre ?? "Medio de pago",
    className: "bg-stone-100 text-stone-700 ring-1 ring-stone-200",
  };
}

function getAtencionTone(anulada: boolean) {
  if (anulada) {
    return {
      wrapper: "border-red-200 bg-red-50/70",
      rail: "bg-red-400",
      badge: "bg-red-100 text-red-700 ring-1 ring-red-200",
      amount: "text-red-700",
      meta: "text-red-900",
      note: "text-red-700/80",
    };
  }

  return {
    wrapper: "border-stone-200 bg-white hover:-translate-y-0.5 hover:shadow-md",
    rail: "bg-stone-900",
    badge: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    amount: "text-stone-950",
    meta: "text-stone-900",
    note: "text-stone-500",
  };
}

function getProductoEmoji(nombre: string | undefined) {
  const normalized = (nombre ?? "").toLowerCase();
  if (normalized.includes("cafe")) return "CA";
  if (normalized.includes("pomada")) return "PO";
  if (normalized.includes("shampoo")) return "SH";
  if (normalized.includes("gel")) return "GE";
  if (normalized.includes("cera")) return "CE";
  if (normalized.includes("toalla")) return "TO";
  if (normalized.includes("agua")) return "AG";
  return "PR";
}

export default async function CajaPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userRole = (session?.user as { role?: string })?.role;
  const isAdmin = userRole === "admin";
  const userId = session?.user?.id;

  const fechaHoy = getFechaHoy();
  const quickActionBarberoId = userId
    ? await resolveCajaActorBarberoId(userId, isAdmin)
    : null;
  const quickDefaults = quickActionBarberoId
    ? await getQuickActionDefaultsForBarbero(quickActionBarberoId)
    : null;
  const quickEditHref =
    quickDefaults && quickActionBarberoId
      ? `/caja/nueva?barberoId=${encodeURIComponent(quickActionBarberoId)}&servicioId=${encodeURIComponent(
          quickDefaults.servicioId
        )}&medioPagoId=${encodeURIComponent(quickDefaults.medioPagoId)}&precioCobrado=${encodeURIComponent(
          String(quickDefaults.precioBase)
        )}&fromQuickAction=1`
      : "/caja/nueva?fromQuickAction=1";

  const [cierreHoy] = await db
    .select({ id: cierresCaja.id })
    .from(cierresCaja)
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
  const serviciosMap = new Map((await db.select().from(servicios)).map((servicio) => [servicio.id, servicio]));
  const mediosPagoMap = new Map((await db.select().from(mediosPago)).map((medio) => [medio.id, medio]));
  const quickActionOptions: QuickActionOption[] = quickDefaults
    ? [
        quickDefaults,
        ...Array.from(mediosPagoMap.values())
          .filter((medio) => {
            const nombre = (medio.nombre ?? "").toLowerCase();
            return (
              medio.id !== quickDefaults.medioPagoId &&
              (nombre.includes("efectivo") || nombre.includes("transfer"))
            );
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
    })
    .from(stockMovimientos)
    .where(
      and(
        eq(stockMovimientos.tipo, "venta"),
        gte(stockMovimientos.fecha, inicioDia),
        lte(stockMovimientos.fecha, finDia)
      )
    );

  const productosMap =
    ventasProductosDia.length > 0
      ? new Map((await db.select().from(productos)).map((producto) => [producto.id, producto]))
      : new Map();

  const totalProductos = ventasProductosDia.reduce(
    (sum, venta) => sum + Math.abs(Number(venta.cantidad ?? 0)) * Number(venta.precioUnitario ?? 0),
    0
  );

  const atencionesOrdenadas = [...atencionesDelDia].sort((a, b) => {
    if (!a.creadoEn || !b.creadoEn) return 0;
    return new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime();
  });

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
    alquilerMensual =
      barberoDelUsuario.tipoModelo === "hibrido"
        ? Number(barberoDelUsuario.alquilerBancoMensual ?? 0)
        : 0;
    netoProyectado = comisionDelMes - alquilerMensual;

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

  const ctaCards = cierreHoy
    ? [
        {
          href: `/caja/cierre/${fechaHoy}`,
          title: "Ver cierre",
          description: "Entrar al resumen final del dia y revisar los numeros cerrados.",
          tone: "bg-white/12 text-white ring-1 ring-white/15 hover:bg-white/18",
        },
      ]
    : [
        {
          href: "/caja/nueva",
          title: "Nueva atencion",
          description: "Registrar un servicio ahora mismo con prioridad total.",
          tone: "bg-emerald-400 text-emerald-950 hover:bg-emerald-300",
        },
        {
          href: "/caja/vender",
          title: "Vender producto",
          description: "Cobrar retail con el mismo lenguaje rapido de caja.",
          tone: "bg-white/12 text-white ring-1 ring-white/15 hover:bg-white/18",
        },
        ...(isAdmin
          ? [
              {
                href: "/caja/cierre",
                title: "Cerrar caja",
                description: "Finalizar la jornada solo cuando ya no entren mas ventas.",
                tone: "bg-amber-300 text-amber-950 hover:bg-amber-200",
              },
            ]
          : []),
      ];

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
          ? `${ventasProductosDia.length} movimientos retail hoy`
          : "Todavia no hubo retail",
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
    <main className="app-shell min-h-screen px-4 py-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="overflow-hidden rounded-[32px] bg-stone-950 text-stone-50 shadow-[0_24px_80px_rgba(28,25,23,0.22)]">
          <div className="bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.28),_transparent_32%),radial-gradient(circle_at_bottom_left,_rgba(245,158,11,0.18),_transparent_34%)] p-6 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-300">
                  Caja del dia
                </p>
                <h1 className="mt-3 text-3xl font-semibold capitalize tracking-tight">
                  {formatFechaLarga(fechaHoy)}
                </h1>
                <p className="mt-3 max-w-2xl text-sm text-stone-300">
                  Prioriza registrar rapido, ver el impacto de caja al instante y mantener la jornada
                  escaneable incluso cuando sube el volumen.
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span
                    className={`inline-flex min-h-[36px] items-center rounded-full px-3 text-sm font-medium ${
                      cierreHoy
                        ? "bg-white/12 text-white ring-1 ring-white/15"
                        : "bg-emerald-400 text-emerald-950"
                    }`}
                  >
                    {cierreHoy ? "Caja cerrada" : "Caja abierta"}
                  </span>
                  <span className="inline-flex min-h-[36px] items-center rounded-full bg-white/10 px-3 text-sm text-stone-200 ring-1 ring-white/10">
                    {totalAtenciones} atenciones
                  </span>
                  <span className="inline-flex min-h-[36px] items-center rounded-full bg-white/10 px-3 text-sm text-stone-200 ring-1 ring-white/10">
                    Neto actual {formatARS(totalNeto + totalProductos)}
                  </span>
                </div>
              </div>

              <div className="grid w-full gap-3 sm:grid-cols-2 xl:w-[440px] xl:grid-cols-1">
                {ctaCards.map((card) => (
                  <Link
                    key={card.href}
                    href={card.href}
                    className={`rounded-[24px] px-5 py-4 transition ${card.tone}`}
                  >
                    <span className="block text-base font-semibold">{card.title}</span>
                    <span className="mt-1 block text-sm/6 opacity-85">{card.description}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {cardsResumen.map((card) => (
            <div
              key={card.label}
              className="panel-card rounded-[26px] p-5"
            >
              <p className="eyebrow text-xs font-semibold">
                {card.eyebrow}
              </p>
              <p className="mt-3 text-sm text-zinc-400">{card.label}</p>
              <p className="font-display mt-2 text-2xl font-semibold tracking-tight text-white">
                {card.value}
              </p>
              <p className="mt-2 text-sm text-zinc-400">{card.helper}</p>
            </div>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
          <div className="space-y-6">
            <QuickActionButton
              defaults={quickDefaults}
              options={quickActionOptions}
              action={registrarAtencionRapidaSeleccionadaAction}
              editHref={quickEditHref}
            />

            <section className="panel-card rounded-[30px] p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="eyebrow text-xs font-semibold">
                    Flujo del dia
                  </p>
                  <h2 className="font-display mt-2 text-2xl font-semibold text-white">
                    Atenciones listas para escanear
                  </h2>
                  <p className="mt-1 text-sm text-zinc-400">
                    Hora, servicio, monto y acciones resueltas en una sola mirada.
                  </p>
                </div>
                <div className="panel-soft rounded-2xl px-4 py-3 text-sm text-zinc-300">
                  {atencionesOrdenadas.length > 0
                    ? `${atencionesOrdenadas.length} registros totales hoy`
                    : "Todavia no hay movimiento"}
                </div>
              </div>

              {atencionesOrdenadas.length === 0 ? (
                <div className="mt-5 rounded-[24px] border border-dashed border-zinc-700 bg-zinc-950/25 p-10 text-center text-sm text-zinc-400">
                  No hay atenciones registradas hoy.
                </div>
              ) : (
                <div className="mt-5 space-y-4">
                  {atencionesOrdenadas.map((atencion) => {
                    const barbero = barberosMap.get(atencion.barberoId ?? "");
                    const servicio = serviciosMap.get(atencion.servicioId ?? "");
                    const mp = mediosPagoMap.get(atencion.medioPagoId ?? "");
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
                                {atencion.anulado ? "Anulada" : "Activa"}
                              </span>
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-medium ${paymentAccent.className}`}
                              >
                                {paymentAccent.label}
                              </span>
                            </div>

                            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
                              <h3 className={`text-xl font-semibold tracking-tight ${tone.meta}`}>
                                {servicio?.nombre ?? "Servicio"}
                              </h3>
                              <span className="text-sm text-zinc-500">•</span>
                              <p className="text-sm text-zinc-400">
                                {barbero?.nombre ?? "Sin barbero"}
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
                                {atencion.anulado ? "fuera de caja" : "entra en el neto del dia"}
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
          </div>

          <div className="space-y-6">
            {isAdmin && desglosePorBarbero.length > 0 ? (
              <section className="panel-card rounded-[30px] p-5">
                <p className="eyebrow text-xs font-semibold">
                  Agentes
                </p>
                <h2 className="font-display mt-2 text-xl font-semibold text-white">Pulso por barbero</h2>
                <div className="mt-4 space-y-3">
                  {desglosePorBarbero.map(([barberoId, datos]) => {
                    const barbero = barberosMap.get(barberoId);
                    return (
                      <div
                        key={barberoId}
                        className="panel-soft rounded-[22px] px-4 py-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="font-medium text-white">{barbero?.nombre ?? "-"}</p>
                            <p className="mt-1 text-sm text-zinc-400">
                              {datos.cortes} corte{datos.cortes !== 1 ? "s" : ""}
                            </p>
                          </div>
                          <p className="text-lg font-semibold text-white">
                            {formatARS(datos.bruto)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {ventasProductosDia.length > 0 ? (
              <section className="panel-card rounded-[30px] p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="eyebrow text-xs font-semibold">
                      Retail
                    </p>
                    <h2 className="font-display mt-2 text-xl font-semibold text-white">
                      Productos vendidos
                    </h2>
                  </div>
                  <div className="panel-soft rounded-2xl px-3 py-2 text-sm font-medium text-zinc-200">
                    {formatARS(totalProductos)}
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {ventasProductosDia.map((venta) => {
                    const producto = productosMap.get(venta.productoId ?? "");
                    const cantidadAbs = Math.abs(venta.cantidad ?? 0);
                    const total = cantidadAbs * Number(venta.precioUnitario ?? 0);

                    return (
                      <div
                        key={venta.id}
                        className="flex items-center justify-between gap-3 rounded-[22px] border border-zinc-800 bg-zinc-950/25 px-4 py-3"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-zinc-900 text-sm font-semibold text-[#8cff59] ring-1 ring-zinc-700">
                            {getProductoEmoji(producto?.nombre)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-white">
                              {producto?.nombre ?? "Producto"}
                            </p>
                            <p className="text-sm text-zinc-400">
                              {cantidadAbs} x {formatARS(Number(venta.precioUnitario ?? 0))}
                            </p>
                          </div>
                        </div>
                        <p className="text-base font-semibold text-white">{formatARS(total)}</p>
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {!isAdmin && barberoDelUsuario ? (
              <section className="panel-card rounded-[30px] p-5">
                <p className="eyebrow text-xs font-semibold">
                  Mi mes
                </p>
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
                  {alquilerMensual > 0 ? (
                    <MetricRow
                      label="Alquiler mensual"
                      value={`-${formatARS(alquilerMensual)}`}
                      valueClassName="text-red-600"
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

            {!cierreHoy && isAdmin ? (
              <section className="rounded-[30px] border border-amber-500/35 bg-amber-500/10 p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-300">
                  Cierre de caja
                </p>
                <h2 className="font-display mt-2 text-xl font-semibold text-white">
                  Ultimo paso de la jornada
                </h2>
                <p className="mt-2 text-sm text-zinc-300">
                  Cerrala solo cuando el dia este realmente terminado y ya no vayan a entrar mas
                  servicios ni ventas.
                </p>
                <Link
                  href="/caja/cierre"
                  className="mt-4 inline-flex min-h-[52px] items-center justify-center rounded-2xl bg-amber-400 px-5 text-sm font-semibold text-amber-950 transition hover:bg-amber-300"
                >
                  Cerrar caja y finalizar dia
                </Link>
              </section>
            ) : null}
          </div>
        </section>

        {isAdmin ? (
          <GastoRapidoFAB
            action={registrarGastoRapidoAction}
            returnTo="/caja"
            historyHref="/gastos-rapidos"
          />
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
