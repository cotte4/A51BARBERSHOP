import { and, eq, gte, lte, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  atenciones,
  barberos,
  gastos,
  liquidaciones,
  productos,
  repagoMemas,
  stockMovimientos,
} from "@/db/schema";
import { auth } from "@/lib/auth";
import { calcularCuotaSiguiente, formatUSD, generarCronograma } from "@/lib/amortizacion";
import { getKpisDia } from "@/lib/dashboard-queries";
import {
  SmartCard as NegocioSmartCard,
  UtilityChip as NegocioUtilityChip,
} from "./_components/NegocioCards";
import {
  addMonthsToDate,
  formatARS,
  formatHeaderDate,
  formatShortDate,
  getDueLabel,
  getFechaHoyArgentina,
  getInitials,
  toNumber,
} from "./_lib/page-utils";

const utilityLinks = [
  { href: "/configuracion/servicios", label: "Servicios", detail: "Cambiar servicios y precios" },
  { href: "/configuracion/barberos", label: "Barberos", detail: "Editar el equipo" },
  { href: "/configuracion/temporadas", label: "Temporadas", detail: "Ver metas del mes" },
  { href: "/configuracion/musica", label: "Musica", detail: "Controlar el player" },
  { href: "/configuracion/medios-de-pago", label: "Cobros", detail: "Tarjeta, transferencia y comisiones" },
  { href: "/configuracion/gastos-fijos", label: "Gastos fijos", detail: "Alquiler, servicios y base del mes" },
  { href: "/negocio/estilo", label: "Cortes Marciano", detail: "Configurar cortes por forma de cara" },
  { href: "/mi-resultado", label: "Mi resultado", detail: "Ver tu numero personal" },
  { href: "/dashboard/pl", label: "Reporte mensual", detail: "Abrir el detalle largo" },
] as const;

export default async function NegocioPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userRole = (session?.user as { role?: string })?.role;

  if (userRole !== "admin" && userRole !== "asesor") {
    redirect("/caja");
  }

  const fechaHoy = getFechaHoyArgentina();

  const [
    kpisDia,
    listaBarberos,
    listaLiquidaciones,
    listaProductos,
    gastosHoyRows,
    repagoRows,
    atencionesHoyRows,
    ventasRetailHoyRows,
  ] = await Promise.all([
    getKpisDia(),
    db.select().from(barberos),
    db.select().from(liquidaciones).where(eq(liquidaciones.pagado, false)),
    db
      .select({
        id: productos.id,
        nombre: productos.nombre,
        stockActual: productos.stockActual,
        stockMinimo: productos.stockMinimo,
      })
      .from(productos)
      .where(eq(productos.activo, true)),
    db.select({ monto: gastos.monto }).from(gastos).where(eq(gastos.fecha, fechaHoy)),
    db.select().from(repagoMemas).limit(1),
    db
      .select({
        precioCobrado: atenciones.precioCobrado,
        barberoId: atenciones.barberoId,
      })
      .from(atenciones)
      .where(and(eq(atenciones.fecha, fechaHoy), eq(atenciones.anulado, false))),
    db
      .select({
        cantidad: stockMovimientos.cantidad,
        precioUnitario: stockMovimientos.precioUnitario,
      })
      .from(stockMovimientos)
      .where(
        and(
          eq(stockMovimientos.tipo, "venta"),
          gte(sql`DATE(${stockMovimientos.fecha})`, sql`${fechaHoy}::date`),
          lte(sql`DATE(${stockMovimientos.fecha})`, sql`${fechaHoy}::date`)
        )
      ),
  ]);

  const headerDate = formatHeaderDate(fechaHoy);
  const totalServiciosHoy = atencionesHoyRows.reduce(
    (sum, row) => sum + toNumber(row.precioCobrado),
    0
  );
  const totalRetailHoy = ventasRetailHoyRows.reduce((sum, row) => {
    return sum + Math.abs(toNumber(row.cantidad)) * toNumber(row.precioUnitario);
  }, 0);
  const ingresoBrutoHoy = totalServiciosHoy + totalRetailHoy;
  const gastosHoy = gastosHoyRows.reduce((sum, row) => sum + toNumber(row.monto), 0);

  const teamRows = listaBarberos
    .filter((barbero) => barbero.activo && barbero.rol !== "admin")
    .map((barbero) => {
      const pendiente = listaLiquidaciones
        .filter((liquidacion) => liquidacion.barberoId === barbero.id)
        .reduce((sum, liquidacion) => sum + toNumber(liquidacion.montoAPagar), 0);

      return {
        id: barbero.id,
        nombre: barbero.nombre,
        initials: getInitials(barbero.nombre),
        pendiente,
      };
    })
    .sort((a, b) => {
      if (b.pendiente !== a.pendiente) {
        return b.pendiente - a.pendiente;
      }

      return a.nombre.localeCompare(b.nombre, "es");
    });

  const teamVisible = teamRows.slice(0, 4);
  const totalPendienteBarberos = teamRows.reduce((sum, row) => sum + row.pendiente, 0);

  const stockAlerts = listaProductos
    .filter((producto) => (producto.stockActual ?? 0) <= (producto.stockMinimo ?? 5))
    .sort((a, b) => (a.stockActual ?? 0) - (b.stockActual ?? 0));

  const [repago] = repagoRows;
  let proximaCuotaUsd = 0;
  let proximaCuotaFecha = "";
  let proximaCuotaEstado = "Sin deuda activa";
  let saldoPendienteUsd = 0;

  if (repago && !repago.pagadoCompleto) {
    const deudaUsd = toNumber(repago.deudaUsd);
    const tasaAnual = toNumber(repago.tasaAnualUsd);
    const cantidadCuotas = repago.cantidadCuotasPactadas ?? 0;
    const cuotasPagadas = repago.cuotasPagadas ?? 0;
    const cronograma = generarCronograma(deudaUsd, tasaAnual, cantidadCuotas);
    const cuotaSiguiente = calcularCuotaSiguiente(cronograma, cuotasPagadas);

    saldoPendienteUsd = toNumber(repago.saldoPendiente);

    if (cuotaSiguiente) {
      const dueDate = addMonthsToDate(repago.fechaInicio ?? fechaHoy, cuotasPagadas);
      proximaCuotaUsd = cuotaSiguiente.cuotaTotal;
      proximaCuotaFecha = formatShortDate(dueDate);
      proximaCuotaEstado = getDueLabel(dueDate, fechaHoy);
    }
  }

  return (
    <main className="app-shell min-h-screen px-4 py-5 pb-28">
      <div className="mx-auto max-w-6xl space-y-5">
        <section className="relative overflow-hidden rounded-[30px] border border-zinc-800/80 bg-[linear-gradient(120deg,rgba(8,10,10,0.96),rgba(12,15,14,0.92)_45%,rgba(8,10,10,0.94))] px-5 py-5 shadow-[0_22px_60px_rgba(0,0,0,0.2)] backdrop-blur">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(140,255,89,0.12),_transparent_28%),radial-gradient(circle_at_bottom_left,_rgba(34,211,238,0.08),_transparent_24%)]" />
          <div className="absolute left-5 top-4 h-px w-16 bg-[#8cff59]/70" />
          <div className="absolute right-5 top-4 h-px w-12 bg-cyan-300/55" />
          <div className="relative z-10 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <p className="eyebrow text-xs font-semibold">Negocio</p>
              <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Resumen del negocio - {headerDate}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
                Caja, equipo, stock y deuda en una sola mirada. Lo importante arriba, lo demas abajo.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs font-semibold text-zinc-200">
                  Entraron {formatARS(kpisDia.cajaNeta)} limpios
                </span>
                <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs font-semibold text-zinc-200">
                  {kpisDia.atencionesHoy} trabajos hoy
                </span>
                <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs font-semibold text-zinc-200">
                  {gastosHoy > 0 ? `${formatARS(gastosHoy)} de gastos hoy` : "Sin gastos hoy"}
                </span>
                <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs font-semibold text-zinc-200">
                  {stockAlerts.length > 0 ? `${stockAlerts.length} cosas para reponer` : "Stock en orden"}
                </span>
              </div>

            </div>

            <div className="grid gap-3">
              <div className="panel-soft rounded-[24px] px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                      Caja de hoy
                    </p>
                    <p className="font-display mt-2 text-3xl font-semibold text-white">
                      {formatARS(kpisDia.cajaNeta)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] ${
                      kpisDia.cierreRealizado
                        ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                        : "border-amber-400/30 bg-amber-400/10 text-amber-200"
                    }`}
                  >
                    {kpisDia.cierreRealizado ? "Caja cerrada" : "Caja abierta"}
                  </span>
                </div>
                <p className="mt-2 text-sm text-zinc-400">
                  {ingresoBrutoHoy > 0
                    ? `Ingreso bruto estimado: ${formatARS(ingresoBrutoHoy)}`
                    : "Todavia no entraron movimientos hoy."}
                </p>
              </div>

              <div className="panel-soft rounded-[24px] px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                      Equipo
                    </p>
                    <p className="font-display mt-2 text-3xl font-semibold text-white">
                      {formatARS(totalPendienteBarberos)}
                    </p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-black/18 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-300">
                    {teamRows.length} perfiles
                  </span>
                </div>
                <p className="mt-2 text-sm text-zinc-400">
                  {totalPendienteBarberos > 0
                    ? "Esto es lo que falta pagar al equipo."
                    : "No hay pagos pendientes ahora."}
                </p>
              </div>

              <div className="panel-soft rounded-[24px] px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                      Cuota
                    </p>
                    <p className="font-display mt-2 text-3xl font-semibold text-white">
                      {proximaCuotaUsd > 0 ? formatUSD(proximaCuotaUsd) : "Sin cuota"}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] ${
                      saldoPendienteUsd > 0
                        ? "border-red-400/30 bg-red-500/14 text-red-300"
                        : "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                    }`}
                  >
                    {saldoPendienteUsd > 0 ? "Hay deuda" : "Sin deuda"}
                  </span>
                </div>
                <p className="mt-2 text-sm text-zinc-400">
                  {proximaCuotaUsd > 0
                    ? `${proximaCuotaEstado} - ${proximaCuotaFecha}`
                    : "No hay una cuota pendiente ahora."}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
          <NegocioSmartCard
            href="/liquidaciones"
            eyebrow="Equipo"
            kicker="Pagos"
            title="Pagos al equipo"
            detail="Pendientes, pagados y quien todavia espera cobro."
            footer="Ver liquidaciones"
            className="min-h-[380px]"
            accentClassName="border-[#8cff59]/18 bg-[radial-gradient(circle_at_top_right,_rgba(34,211,238,0.14),_transparent_38%),linear-gradient(180deg,rgba(39,39,42,0.98),rgba(24,24,27,0.98))]"
          >
            <div className="rounded-[26px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(0,0,0,0.18))] p-5">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-400">
                    Falta pagar
                  </p>
                  <p
                    className={`font-display mt-3 text-4xl font-semibold ${
                      totalPendienteBarberos > 0 ? "text-amber-300" : "text-white"
                    }`}
                  >
                    {formatARS(totalPendienteBarberos)}
                  </p>
                </div>
                <span className="rounded-full border border-white/10 bg-black/18 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-300">
                  {teamRows.length} perfiles
                </span>
              </div>
              <p className="mt-2 text-sm text-zinc-400">
                {totalPendienteBarberos > 0
                  ? "Este es el total pendiente del equipo."
                  : "No hay pagos pendientes ahora."}
              </p>
            </div>

            <div className="mt-4 space-y-3">
              {teamVisible.length > 0 ? (
                teamVisible.map((row) => (
                  <div
                    key={row.id}
                    className={`flex items-center gap-3 rounded-[22px] border px-4 py-3 ${
                      row.pendiente > 0
                        ? "border-amber-400/20 bg-amber-400/8"
                        : "border-emerald-400/18 bg-emerald-400/8"
                    }`}
                  >
                    <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-zinc-950 text-sm font-bold text-white">
                      {row.initials}
                      <span
                        className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border border-zinc-950 ${
                          row.pendiente > 0 ? "bg-amber-300" : "bg-emerald-300"
                        }`}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-white">{row.nombre}</p>
                      <p
                        className={`mt-1 text-sm ${
                          row.pendiente > 0 ? "text-amber-200" : "text-emerald-300"
                        }`}
                      >
                        {row.pendiente > 0
                          ? `Pendiente ${formatARS(row.pendiente)}`
                          : "Al dia"}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[22px] border border-dashed border-zinc-700 bg-zinc-950/50 p-5 text-sm text-zinc-400">
                  No hay barberos configurados para mostrar en esta portada.
                </div>
              )}
            </div>
          </NegocioSmartCard>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <NegocioSmartCard
            href="/inventario"
            eyebrow="Stock"
            kicker={stockAlerts.length > 0 ? "Revisar" : "Todo bien"}
            title="Productos por mirar"
            detail="Solo lo que esta por terminarse o ya quedo en cero."
            footer="Ver inventario"
            className="min-h-[340px]"
            accentClassName="border-[#8cff59]/16 bg-[radial-gradient(circle_at_top_right,_rgba(140,255,89,0.10),_transparent_34%),linear-gradient(180deg,rgba(39,39,42,0.98),rgba(24,24,27,0.98))]"
          >
            {stockAlerts.length > 0 ? (
              <div className="space-y-3">
                <div className="rounded-[24px] border border-amber-400/20 bg-amber-400/8 p-4">
                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-200">
                        Hay que mirar esto
                      </p>
                      <p className="font-display mt-2 text-3xl font-semibold text-white">
                        {stockAlerts.length}
                      </p>
                    </div>
                    <span className="rounded-full bg-black/18 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-100">
                      Prioridad
                    </span>
                  </div>
                </div>

                {stockAlerts.slice(0, 4).map((producto) => {
                  const stockActual = producto.stockActual ?? 0;
                  const stockMinimo = producto.stockMinimo ?? 5;

                  return (
                    <div
                      key={producto.id}
                      className="rounded-[22px] border border-zinc-700/80 bg-zinc-950/55 px-4 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">{producto.nombre}</p>
                          <p className="mt-1 text-sm text-zinc-400">
                            {stockActual <= 0
                              ? "Stock agotado"
                              : `Quedan ${stockActual} (minimo ${stockMinimo})`}
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            stockActual <= 0
                              ? "bg-red-500/16 text-red-300"
                              : "bg-amber-400/16 text-amber-200"
                          }`}
                        >
                          {stockActual <= 0 ? "Urgente" : "Bajo"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex h-full flex-col justify-center rounded-[24px] border border-emerald-400/20 bg-emerald-400/8 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">
                  Inventario sano
                </p>
                <p className="font-display mt-2 text-3xl font-semibold text-white">Todo en orden</p>
                <p className="mt-2 text-sm text-zinc-300">
                  No hay productos con stock bajo ni agotado.
                </p>
              </div>
            )}
          </NegocioSmartCard>

          <NegocioSmartCard
            href="/gastos-rapidos"
            eyebrow="Gastos"
            kicker={saldoPendienteUsd > 0 ? "Ojo" : "Tranquilo"}
            title="Gastos y cuotas"
            detail="Lo que ya salio hoy y lo proximo grande por pagar."
            footer="Ver gastos y deuda"
            className="min-h-[340px]"
            accentClassName="border-[#8cff59]/16 bg-[radial-gradient(circle_at_top_right,_rgba(56,189,248,0.10),_transparent_34%),linear-gradient(180deg,rgba(39,39,42,0.98),rgba(24,24,27,0.98))]"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="panel-soft rounded-[24px] p-4">
                <p className="text-xs font-medium text-zinc-400">Gastos de hoy</p>
                <p className="font-display mt-2 text-3xl font-bold text-white">
                  {formatARS(gastosHoy)}
                </p>
                <p className="mt-1 text-sm text-zinc-400">Movimientos cargados con fecha de hoy.</p>
              </div>

              <div
                className={`rounded-[24px] border p-4 ${
                  proximaCuotaUsd > 0
                    ? "border-sky-400/20 bg-sky-400/8"
                    : "border-emerald-400/20 bg-emerald-400/8"
                }`}
              >
                <p className="text-xs font-medium text-zinc-400">Proxima cuota</p>
                <p className="font-display mt-2 text-3xl font-bold text-white">
                  {proximaCuotaUsd > 0 ? formatUSD(proximaCuotaUsd) : "Sin cuota"}
                </p>
                <p className="mt-1 text-sm text-zinc-300">
                  {proximaCuotaUsd > 0
                    ? `${proximaCuotaEstado} - ${proximaCuotaFecha}`
                    : "No hay una cuota pendiente ahora."}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(0,0,0,0.18))] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-400">
                    Saldo pendiente
                  </p>
                  <p className="mt-2 text-sm text-zinc-300">
                    {saldoPendienteUsd > 0
                      ? `${formatUSD(saldoPendienteUsd)} siguen pendientes`
                      : "No queda saldo pendiente en repago."}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    saldoPendienteUsd > 0
                      ? "bg-red-500/14 text-red-300"
                      : "bg-emerald-400/14 text-emerald-300"
                  }`}
                >
                  {saldoPendienteUsd > 0 ? "Hay deuda" : "Sin deuda"}
                </span>
              </div>
            </div>
          </NegocioSmartCard>
        </section>

        <section className="relative overflow-hidden rounded-[30px] border border-zinc-800/90 bg-[linear-gradient(180deg,rgba(26,26,29,0.98),rgba(18,18,20,0.98))] p-5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,_rgba(140,255,89,0.05),_transparent_24%)]" />
          <div className="relative z-10">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="max-w-2xl">
                <p className="eyebrow text-xs font-semibold">Ajustes</p>
                <h2 className="font-display mt-2 text-2xl font-semibold text-white">
                  Accesos de soporte
                </h2>
                <p className="mt-2 text-sm text-zinc-400">
                  Configuracion, perfiles y reportes largos.
                </p>
              </div>
              <div className="rounded-full border border-zinc-700 bg-black/18 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-400">
                Poco uso diario
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {utilityLinks.map((link) => (
                <NegocioUtilityChip
                  key={link.href}
                  href={link.href}
                  label={link.label}
                  detail={link.detail}
                />
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
