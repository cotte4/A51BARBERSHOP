import Link from "next/link";
import { and, eq, gte, lte } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  atenciones,
  barberos,
  cierresCaja,
  liquidaciones,
  mediosPago,
  productos,
  stockMovimientos,
} from "@/db/schema";
import { buildCierreResumen } from "@/lib/caja-finance";
import CerrarCajaButton from "@/components/caja/CerrarCajaButton";
import EfectivoChecker from "@/components/caja/EfectivoChecker";
import { formatARS } from "@/lib/format";
import { cerrarCaja } from "../actions";

type SummaryCard = {
  eyebrow: string;
  label: string;
  value: string;
  helper: string;
};

export default async function CierrePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userRole = (session?.user as { role?: string })?.role;
  if (userRole !== "admin") redirect("/caja");

  const fechaHoy = getFechaHoy();

  const [cierreExistente] = await db
    .select({ id: cierresCaja.id })
    .from(cierresCaja)
    .where(eq(cierresCaja.fecha, fechaHoy))
    .limit(1);

  if (cierreExistente) redirect(`/caja/cierre/${fechaHoy}`);

  const atencionesDelDia = await db
    .select()
    .from(atenciones)
    .where(and(eq(atenciones.fecha, fechaHoy), eq(atenciones.anulado, false)));

  const atencionesAnuladas = await db
    .select({ id: atenciones.id })
    .from(atenciones)
    .where(and(eq(atenciones.fecha, fechaHoy), eq(atenciones.anulado, true)));

  const mediosPagoList = await db.select().from(mediosPago);
  const mediosPagoMap = new Map(mediosPagoList.map((medio) => [medio.id, medio]));
  const barberosList = await db.select().from(barberos);

  const inicioDia = new Date(`${fechaHoy}T00:00:00-03:00`);
  const finDia = new Date(`${fechaHoy}T23:59:59-03:00`);
  const ventasProductosDelDia = await db
    .select()
    .from(stockMovimientos)
    .where(
      and(
        eq(stockMovimientos.tipo, "venta"),
        gte(stockMovimientos.fecha, inicioDia),
        lte(stockMovimientos.fecha, finDia)
      )
    );
  const productosList = ventasProductosDelDia.length > 0 ? await db.select().from(productos) : [];

  const cierreResumen = buildCierreResumen({
    fecha: fechaHoy,
    atenciones: atencionesDelDia,
    barberos: barberosList,
    ventasProductos: ventasProductosDelDia.map((venta) => ({
      productoId: venta.productoId,
      cantidad: venta.cantidad,
      precioUnitario: venta.precioUnitario,
      medioPagoId: venta.notas,
    })),
    productos: productosList,
    mediosPago: mediosPagoList,
  });

  const totalBruto = atencionesDelDia.reduce(
    (sum, atencion) => sum + Number(atencion.precioCobrado ?? 0),
    0
  );
  const totalComisionesMp = atencionesDelDia.reduce(
    (sum, atencion) => sum + Number(atencion.comisionMedioPagoMonto ?? 0),
    0
  );
  const totalNeto = atencionesDelDia.reduce(
    (sum, atencion) => sum + Number(atencion.montoNeto ?? 0),
    0
  );
  const totalProductos = ventasProductosDelDia.reduce(
    (sum, venta) => sum + Math.abs(Number(venta.cantidad ?? 0)) * Number(venta.precioUnitario ?? 0),
    0
  );
  const totalAtenciones = atencionesDelDia.length;

  const totalesPorMedio: Record<string, { nombre: string; bruto: number; comision: number }> = {};
  for (const atencion of atencionesDelDia) {
    if (!atencion.medioPagoId) continue;
    const medioPago = mediosPagoMap.get(atencion.medioPagoId);
    if (!medioPago) continue;
    const nombre = medioPago.nombre ?? "Otro";
    if (!totalesPorMedio[nombre]) {
      totalesPorMedio[nombre] = { nombre, bruto: 0, comision: 0 };
    }
    totalesPorMedio[nombre].bruto += Number(atencion.precioCobrado ?? 0);
    totalesPorMedio[nombre].comision += Number(atencion.comisionMedioPagoMonto ?? 0);
  }

  for (const venta of ventasProductosDelDia) {
    if (!venta.notas) continue;
    const medioPago = mediosPagoMap.get(venta.notas);
    if (!medioPago) continue;
    const nombre = medioPago.nombre ?? "Otro";
    const bruto = Math.abs(Number(venta.cantidad ?? 0)) * Number(venta.precioUnitario ?? 0);
    const comision = bruto * (Number(medioPago.comisionPorcentaje ?? 0) / 100);
    if (!totalesPorMedio[nombre]) {
      totalesPorMedio[nombre] = { nombre, bruto: 0, comision: 0 };
    }
    totalesPorMedio[nombre].bruto += bruto;
    totalesPorMedio[nombre].comision += comision;
  }

  const paymentBreakdown = Object.values(totalesPorMedio).sort((a, b) => b.bruto - a.bruto);
  const totalEfectivo = paymentBreakdown
    .filter((medio) => medio.nombre.toLowerCase().includes("efectivo"))
    .reduce((sum, medio) => sum + medio.bruto - medio.comision, 0);

  const resumenPorBarbero: Record<string, { nombre: string; cortes: number; bruto: number; comision: number }> = {};
  for (const atencion of atencionesDelDia) {
    if (!atencion.barberoId) continue;
    const barbero = barberosList.find((item) => item.id === atencion.barberoId);
    if (!barbero) continue;
    if (!resumenPorBarbero[atencion.barberoId]) {
      resumenPorBarbero[atencion.barberoId] = {
        nombre: barbero.nombre,
        cortes: 0,
        bruto: 0,
        comision: 0,
      };
    }
    resumenPorBarbero[atencion.barberoId].cortes += 1;
    resumenPorBarbero[atencion.barberoId].bruto += Number(atencion.precioCobrado ?? 0);
    resumenPorBarbero[atencion.barberoId].comision += Number(atencion.comisionBarberoMonto ?? 0);
  }

  const gaboteEntry = Object.entries(resumenPorBarbero).find(([, resumen]) =>
    resumen.nombre.toLowerCase().includes("gabo")
  );
  const gaboteLiquidacionExistente = gaboteEntry
    ? await db
        .select({ id: liquidaciones.id })
        .from(liquidaciones)
        .where(
          and(
            eq(liquidaciones.barberoId, gaboteEntry[0]),
            eq(liquidaciones.periodoInicio, fechaHoy),
            eq(liquidaciones.periodoFin, fechaHoy)
          )
        )
        .limit(1)
    : [];

  const summaryCards: SummaryCard[] = [
    {
      eyebrow: "Flujo",
      label: "Servicios activos",
      value: String(totalAtenciones),
      helper:
        atencionesAnuladas.length > 0
          ? `${atencionesAnuladas.length} anuladas para revisar`
          : "Sin anulaciones hoy",
    },
    {
      eyebrow: "Bruto",
      label: "Ingresos combinados",
      value: formatARS(totalBruto + totalProductos),
      helper: `${formatARS(totalBruto)} en servicios y ${formatARS(totalProductos)} en productos`,
    },
    {
      eyebrow: "Neto",
      label: "Caja neta estimada",
      value: formatARS(totalNeto + totalProductos),
      helper:
        totalComisionesMp > 0
          ? `${formatARS(totalComisionesMp)} en comisiones de medios`
          : "Sin descuentos de medios por ahora",
    },
    {
      eyebrow: "Estado",
      label: "Cierre",
      value: "Pendiente",
      helper: "Chequea efectivo y liquidaciones antes de cerrar",
    },
  ];

  return (
    <main className="app-shell min-h-screen px-4 py-6 pb-28">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="overflow-hidden rounded-[32px] border border-zinc-800/80 bg-[radial-gradient(circle_at_top_right,rgba(140,255,89,0.18),transparent_30%),linear-gradient(180deg,rgba(24,24,27,0.96),rgba(9,9,11,0.98))] shadow-[0_24px_80px_rgba(0,0,0,0.32)]">
          <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] lg:p-7">
            <div className="space-y-5">
              <Link
                href="/caja"
                className="inline-flex items-center text-sm font-medium text-zinc-500 transition hover:text-zinc-200"
              >
                {"<- Caja"}
              </Link>

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-zinc-500">
                  Cierre previo
                </p>
                <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Preparar cierre de {formatFechaLarga(fechaHoy)}
                </h2>
                <p className="max-w-2xl text-sm leading-6 text-zinc-400">
                  Esta vista resume lo que entra, lo que sale y lo que hay que revisar antes de
                  sellar la caja. La idea es que el cierre sea corto, pero sin perder control.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs font-semibold text-zinc-300">
                  {summaryCards[0].value} atenciones
                </span>
                <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs font-semibold text-zinc-300">
                  {ventasProductosDelDia.length} ventas de producto
                </span>
                <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs font-semibold text-zinc-300">
                  {atencionesAnuladas.length} anuladas
                </span>
                <span className="rounded-full border border-[#8cff59]/25 bg-[#8cff59]/10 px-3 py-1 text-xs font-semibold text-[#8cff59]">
                  Neto estimado {formatARS(totalNeto + totalProductos)}
                </span>
              </div>
            </div>

            <aside className="space-y-3">
              <div className="rounded-[24px] border border-zinc-800 bg-zinc-950/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
                  Caja viva
                </p>
                <p className="mt-2 text-3xl font-bold text-white">
                  {formatARS(totalNeto + totalProductos)}
                </p>
                <p className="mt-1 text-sm text-zinc-400">Neto estimado si cerras ahora.</p>
              </div>

              <div className="rounded-[24px] border border-zinc-800 bg-zinc-950/70 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
                  Ritmo del dia
                </p>
                <div className="mt-3 grid gap-2 text-sm text-zinc-300">
                  <p>Bruto combinado: {formatARS(totalBruto + totalProductos)}</p>
                  <p>Comisiones medios: {formatARS(totalComisionesMp)}</p>
                  <p>Anulaciones a revisar: {atencionesAnuladas.length}</p>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
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

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <div className="space-y-5">
            <section className="panel-card rounded-[30px] p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="eyebrow text-xs font-semibold">Medios</p>
                  <h3 className="font-display mt-2 text-2xl font-semibold text-white">
                    Por donde entro la plata
                  </h3>
                  <p className="mt-1 text-sm text-zinc-400">
                    Servicios y productos juntos, como realmente impactan en la caja.
                  </p>
                </div>
                <div className="panel-soft rounded-2xl px-4 py-3 text-sm text-zinc-300">
                  {paymentBreakdown.length} medios activos hoy
                </div>
              </div>

              {paymentBreakdown.length === 0 ? (
                <div className="mt-5 rounded-[24px] border border-dashed border-zinc-700 bg-zinc-950/25 p-8 text-center text-sm text-zinc-400">
                  Todavia no hay cobros registrados hoy.
                </div>
              ) : (
                <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {paymentBreakdown.map((item) => (
                    <div
                      key={item.nombre}
                      className="rounded-[24px] border border-zinc-800 bg-zinc-950/25 p-4"
                    >
                      <span className="inline-flex rounded-full px-3 py-1 text-xs font-semibold bg-zinc-800 text-zinc-200 ring-1 ring-zinc-700">
                        {item.nombre}
                      </span>
                      <p className="mt-4 text-2xl font-semibold text-white">{formatARS(item.bruto)}</p>
                      <p className="mt-2 text-sm text-zinc-400">Bruto del dia por este medio</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="panel-card rounded-[30px] p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="eyebrow text-xs font-semibold">Barberos</p>
                  <h3 className="font-display mt-2 text-2xl font-semibold text-white">
                    Que dejo cada puesto
                  </h3>
                  <p className="mt-1 text-sm text-zinc-400">
                    Cortes y bruto para entender rapido la distribucion del dia.
                  </p>
                </div>
              </div>

              {Object.values(resumenPorBarbero).length === 0 ? (
                <div className="mt-5 rounded-[24px] border border-dashed border-zinc-700 bg-zinc-950/25 p-10 text-center text-sm text-zinc-400">
                  Sin atenciones.
                </div>
              ) : (
                <div className="mt-5 grid gap-3 lg:grid-cols-2">
                  {Object.values(resumenPorBarbero).map((barbero) => (
                    <div
                      key={barbero.nombre}
                      className="rounded-[24px] border border-zinc-800 bg-zinc-950/25 p-4 text-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold text-white">{barbero.nombre}</p>
                          <p className="mt-1 text-zinc-400">
                            {barbero.cortes} {barbero.cortes === 1 ? "corte" : "cortes"} hoy
                          </p>
                        </div>
                        <span className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs font-semibold text-zinc-300">
                          {formatARS(barbero.bruto)}
                        </span>
                      </div>
                      <div className="mt-4 grid gap-2 text-xs text-zinc-400">
                        <p>Comision: {formatARS(barbero.comision)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="grid gap-3 md:grid-cols-2">
              <div className="bg-zinc-900 rounded-[28px] border border-zinc-800 p-4">
                <div className="mb-1 text-sm text-zinc-400">Caja neta del dia</div>
                <div className="text-2xl font-bold text-white">
                  {formatARS(cierreResumen.totales.cajaNetaDia)}
                </div>
                <div className="mt-1 text-xs text-zinc-400">
                  Servicios {formatARS(cierreResumen.totales.cajaNetaServicios)}
                  {" · "}
                  Productos {formatARS(cierreResumen.totales.cajaNetaProductos)}
                </div>
              </div>
              <div className="rounded-[28px] border border-zinc-800 bg-zinc-900 p-4 text-white">
                <div className="mb-1 text-sm text-zinc-400">Aporte economico casa hoy</div>
                <div className="text-2xl font-bold">
                  {formatARS(cierreResumen.totales.aporteEconomicoCasaDia)}
                </div>
                <div className="mt-1 text-xs text-gray-400">
                  Servicios {formatARS(cierreResumen.totales.aporteCasaServicios)}
                  {" · "}
                  Productos {formatARS(cierreResumen.totales.margenProductos)}
                </div>
              </div>
            </section>
          </div>

          <aside className="space-y-4">
            {totalEfectivo > 0 ? (
              <EfectivoChecker totalEfectivoSistema={totalEfectivo} />
            ) : (
              <section className="rounded-[28px] border border-zinc-800 bg-zinc-900 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">
                  Control de efectivo
                </p>
                <h3 className="mt-2 text-lg font-semibold text-white">Sin efectivo marcado</h3>
                <p className="mt-1 text-sm text-zinc-400">
                  Hoy no hay efectivo estimado por el sistema. Si aparece algun movimiento,
                  revisa esta tarjeta antes de cerrar.
                </p>
              </section>
            )}

            {gaboteEntry ? (
              <div className="rounded-[28px] border border-amber-500/30 bg-amber-500/10 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
                  Liquidacion pendiente
                </p>
                <h3 className="mt-2 text-base font-semibold text-white">
                  {gaboteEntry[1].nombre}
                </h3>
                <p className="mt-1 text-sm text-zinc-400">
                  {gaboteEntry[1].cortes} corte{gaboteEntry[1].cortes !== 1 ? "s" : ""} del dia
                  {" · "}Comision {formatARS(gaboteEntry[1].comision)}
                </p>
                {gaboteLiquidacionExistente.length > 0 ? (
                  <Link
                    href={`/liquidaciones/${gaboteLiquidacionExistente[0].id}`}
                    className="mt-4 inline-flex min-h-[44px] items-center rounded-lg border border-amber-500/30 bg-zinc-900 px-4 text-sm font-medium text-amber-300 transition hover:bg-zinc-800"
                  >
                    Liquidacion generada
                  </Link>
                ) : (
                  <Link
                    href={`/liquidaciones/nueva?barberoId=${gaboteEntry[0]}&fecha=${fechaHoy}`}
                    className="mt-4 inline-flex min-h-[44px] items-center rounded-lg bg-amber-400 px-4 text-sm font-semibold text-amber-950 transition hover:bg-amber-300"
                  >
                    Generar liquidacion
                  </Link>
                )}
              </div>
            ) : null}

            <section className="rounded-[28px] border border-zinc-800 bg-zinc-900 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">
                Accion final
              </p>
              <h3 className="mt-2 text-lg font-semibold text-white">Cuando todo cuadra, cerras</h3>
              <p className="mt-1 text-sm leading-6 text-zinc-400">
                Primero comparas efectivo, luego cerras. Si algo no cierra, corregilo antes de
                tocar el boton final.
              </p>

              <div className="mt-4">
                <CerrarCajaButton cerrarAction={cerrarCaja} />
              </div>

              <Link
                href="/caja"
                className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 px-4 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800"
              >
                Cancelar
              </Link>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}

function getFechaHoy(): string {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

function formatFechaLarga(fecha: string): string {
  return new Date(fecha + "T12:00:00").toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}
