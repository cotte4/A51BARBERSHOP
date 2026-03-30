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
  if (value === null || value === undefined) return "—";
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
  if (!hora) return "—";
  return hora.slice(0, 5);
}

function normalizeLabel(text: string): string {
  return text
    .replaceAll("â€”", "-")
    .replaceAll("â†’", "→")
    .replaceAll("Â·", "·")
    .replaceAll("Ã—", "x")
    .replaceAll("âˆ’", "-")
    .replaceAll("âœ“", "✓")
    .replaceAll("Mi mes â€”", "Mi mes -");
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

  return (
    <main className="mx-auto min-h-screen max-w-2xl p-4 pb-16">
      {cierreHoy ? (
        <div className="mb-4 flex items-center justify-between rounded-xl bg-gray-900 p-4 text-white">
          <span className="text-sm font-medium">✓ Caja cerrada</span>
          <Link
            href={`/caja/cierre/${fechaHoy}`}
            className="text-sm text-gray-300 underline hover:text-white"
          >
            Ver resumen →
          </Link>
        </div>
      ) : null}

      <div className="mb-5">
        <h1 className="text-2xl font-bold capitalize text-gray-900">
          {formatFechaLarga(fechaHoy)}
        </h1>
      </div>

      {!cierreHoy ? (
        <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_auto]">
          <Link
            href="/caja/nueva"
            className="flex min-h-[56px] items-center justify-center rounded-xl bg-gray-900 text-sm font-semibold text-white transition-colors hover:bg-gray-700"
          >
            + Nueva atención
          </Link>
          <Link
            href="/caja/vender"
            className="flex min-h-[56px] items-center justify-center rounded-xl border border-gray-300 bg-white px-5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Vender producto
          </Link>
        </div>
      ) : null}

      <QuickActionButton
        defaults={quickDefaults}
        options={quickActionOptions}
        action={registrarAtencionRapidaSeleccionadaAction}
        editHref={quickEditHref}
      />

      <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Resumen del día
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-5">
          <div className="rounded-xl bg-gray-50 px-3 py-2">
            <p className="text-xs text-gray-500">Atenciones</p>
            <p className="text-xl font-bold text-gray-900">{totalAtenciones}</p>
          </div>
          <div className="rounded-xl bg-gray-50 px-3 py-2">
            <p className="text-xs text-gray-500">Bruto</p>
            <p className="text-xl font-bold text-gray-900">{formatARS(totalBruto)}</p>
          </div>
          <div className="rounded-xl bg-gray-50 px-3 py-2">
            <p className="text-xs text-gray-500">Neto</p>
            <p className="text-lg font-semibold text-gray-700">{formatARS(totalNeto)}</p>
          </div>
          <div className="rounded-xl bg-gray-50 px-3 py-2">
            <p className="text-xs text-gray-500">Comis. cobradas</p>
            <p className="text-lg font-semibold text-gray-700">{formatARS(totalComisionesMp)}</p>
          </div>
          {totalProductos > 0 ? (
            <div className="rounded-xl bg-gray-50 px-3 py-2">
              <p className="text-xs text-gray-500">Productos</p>
              <p className="text-lg font-semibold text-gray-700">{formatARS(totalProductos)}</p>
            </div>
          ) : null}
        </div>

        {isAdmin && desglosePorBarbero.length > 0 ? (
          <div className="mt-4 border-t border-gray-100 pt-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Por barbero
            </p>
            <div className="flex flex-col gap-1">
              {desglosePorBarbero.map(([barberoId, datos]) => {
                const barbero = barberosMap.get(barberoId);
                return (
                  <div key={barberoId} className="flex justify-between text-sm">
                    <span className="text-gray-700">{barbero?.nombre ?? "—"}</span>
                    <span className="text-gray-500">
                      {datos.cortes} corte{datos.cortes !== 1 ? "s" : ""} →{" "}
                      <span className="font-medium text-gray-900">{formatARS(datos.bruto)}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Atenciones de hoy
        </h2>

        {atencionesOrdenadas.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-400">
            No hay atenciones registradas hoy.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {atencionesOrdenadas.map((atencion) => {
              const barbero = barberosMap.get(atencion.barberoId ?? "");
              const servicio = serviciosMap.get(atencion.servicioId ?? "");
              const mp = mediosPagoMap.get(atencion.medioPagoId ?? "");

              return (
                <div
                  key={atencion.id}
                  className={`rounded-xl border border-gray-200 bg-white p-4 ${
                    atencion.anulado ? "opacity-50" : ""
                  }`}
                >
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1 text-sm font-medium text-gray-900">
                      <span className="text-gray-400">{formatHora(atencion.hora)}</span>
                      <span className="text-gray-300">—</span>
                      <span>{barbero?.nombre ?? "—"}</span>
                      <span className="text-gray-300">—</span>
                      <span>{servicio?.nombre ?? "—"}</span>
                    </div>
                    {atencion.anulado ? (
                      <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">
                        Anulada
                      </span>
                    ) : null}
                  </div>

                  <div className="mb-1 text-sm text-gray-500">
                    {formatARS(atencion.precioCobrado)}
                    {mp ? (
                      <>
                        {" · "}
                        {mp.nombre ?? "—"}
                        {Number(mp.comisionPorcentaje ?? 0) > 0
                          ? ` (${mp.comisionPorcentaje}%)`
                          : ""}
                      </>
                    ) : null}
                    {" · Neto: "}
                    <span className="font-medium text-gray-700">{formatARS(atencion.montoNeto)}</span>
                  </div>

                  {atencion.anulado && atencion.motivoAnulacion ? (
                    <p className="mb-2 text-xs text-gray-400">Motivo: {atencion.motivoAnulacion}</p>
                  ) : null}

                  {atencion.notas && !atencion.anulado ? (
                    <p className="mb-2 text-xs text-gray-400">{atencion.notas}</p>
                  ) : null}

                  {!atencion.anulado ? (
                    <div className="mt-2 flex gap-2">
                      <Link
                        href={`/caja/${atencion.id}/editar`}
                        className="flex min-h-[44px] items-center justify-center rounded-lg bg-gray-100 px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
                      >
                        Editar
                      </Link>
                      {isAdmin ? (
                        <AnularButton atencionId={atencion.id} anularAction={anularAtencion} />
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {ventasProductosDia.length > 0 ? (
        <div className="mt-6">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Productos vendidos hoy
          </h2>
          <div className="flex flex-col gap-3">
            {ventasProductosDia.map((venta) => {
              const producto = productosMap.get(venta.productoId ?? "");
              const cantidadAbs = Math.abs(venta.cantidad ?? 0);
              const total = cantidadAbs * Number(venta.precioUnitario ?? 0);

              return (
                <div key={venta.id} className="rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {producto?.nombre ?? "Producto"}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">{formatARS(total)}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {cantidadAbs} × {formatARS(Number(venta.precioUnitario ?? 0))}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {!isAdmin && barberoDelUsuario ? (
        <div className="mt-6">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">
            Mi mes —{" "}
            {new Date(`${inicioDeMes}T12:00:00`).toLocaleDateString("es-AR", {
              month: "long",
              year: "numeric",
              timeZone: "America/Argentina/Buenos_Aires",
            })}
          </h3>
          <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Cortes este mes</span>
              <span className="font-medium text-gray-900">{cortesDelMes}</span>
            </div>
            {posicionRanking > 0 ? (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Ranking del mes</span>
                <span className="font-medium text-gray-900">
                  #{posicionRanking} de {totalBarberosRanking}
                  {posicionRanking === 1 ? " 🥇" : ""}
                </span>
              </div>
            ) : null}
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Bruto acumulado</span>
              <span className="font-medium text-gray-900">{formatARS(brutoDelMes)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">
                Mi comisión ({barberoDelUsuario.porcentajeComision ?? 0}%)
              </span>
              <span className="font-medium text-gray-900">{formatARS(comisionDelMes)}</span>
            </div>
            {alquilerMensual > 0 ? (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Alquiler banco (mes)</span>
                <span className="text-red-600">−{formatARS(alquilerMensual)}</span>
              </div>
            ) : null}
            <div className="flex justify-between border-t border-gray-100 pt-2 text-sm">
              <span className="font-medium text-gray-700">Mi neto proyectado</span>
              <span className="font-bold text-gray-900">{formatARS(Math.max(0, netoProyectado))}</span>
            </div>
          </div>
        </div>
      ) : null}

      {!cierreHoy && isAdmin ? (
        <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
            Cierre de caja
          </p>
          <p className="mt-2 text-sm text-amber-900">
            Usá este botón solo cuando realmente terminó la jornada y ya no se van a cargar más ventas.
          </p>
          <Link
            href="/caja/cierre"
            className="mt-4 inline-flex min-h-[52px] items-center justify-center rounded-xl bg-amber-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-amber-700"
          >
            Cerrar caja y finalizar día
          </Link>
        </div>
      ) : null}

      {isAdmin ? (
        <GastoRapidoFAB
          action={registrarGastoRapidoAction}
          returnTo="/caja"
          historyHref="/gastos-rapidos"
        />
      ) : null}
    </main>
  );
}
