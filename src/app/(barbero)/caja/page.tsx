import Link from "next/link";
import { and, eq, gte, lte } from "drizzle-orm";
import AnularButton from "@/components/caja/AnularButton";
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
import { armarCajaDelDia, type FilaCaja } from "@/lib/caja-dia";
import { getCajaActorContext } from "@/lib/dal/caja";
import {
  formatARS,
  formatFechaLarga,
  formatHora,
  getFechaHoy,
  getPaymentAccent,
} from "./_lib/page-helpers";
import { anularAtencion, anularVentaProducto } from "./actions";

// 24 hs: "12:30 p. m." ocupa dos renglones en el celular
function horaDe(momento: Date | null): string {
  if (!momento) return "--:--";
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(momento);
}

function plural(n: number, uno: string, varios: string): string {
  return `${n} ${n === 1 ? uno : varios}`;
}

export default async function CajaPage() {
  const actor = await getCajaActorContext();
  const isAdmin = actor?.isAdmin ?? false;
  const fechaHoy = getFechaHoy();
  const inicioDia = new Date(`${fechaHoy}T00:00:00-03:00`);
  const finDia = new Date(`${fechaHoy}T23:59:59-03:00`);

  const [cierres, atencionesDelDia, ventasDelDia, barberosAll, serviciosAll, mediosAll, productosAll] =
    await Promise.all([
      db
        .select({
          id: cierresCaja.id,
          cerradoEn: cierresCaja.cerradoEn,
          cerradoPorNombre: barberos.nombre,
        })
        .from(cierresCaja)
        .leftJoin(barberos, eq(barberos.id, cierresCaja.cerradoPor))
        .where(eq(cierresCaja.fecha, fechaHoy))
        .limit(1),
      db
        .select()
        .from(atenciones)
        .where(
          isAdmin
            ? eq(atenciones.fecha, fechaHoy)
            : and(eq(atenciones.fecha, fechaHoy), eq(atenciones.barberoId, actor?.barberoId ?? ""))
        ),
      // Las ventas de producto no tienen barbero: el número del barbero son solo sus servicios.
      isAdmin
        ? db
            .select()
            .from(stockMovimientos)
            .where(
              and(
                eq(stockMovimientos.tipo, "venta"),
                gte(stockMovimientos.fecha, inicioDia),
                lte(stockMovimientos.fecha, finDia)
              )
            )
        : Promise.resolve([]),
      db.select({ id: barberos.id, nombre: barberos.nombre }).from(barberos),
      db.select({ id: servicios.id, nombre: servicios.nombre }).from(servicios),
      db.select({ id: mediosPago.id, nombre: mediosPago.nombre }).from(mediosPago),
      db.select({ id: productos.id, nombre: productos.nombre }).from(productos),
    ]);

  const cierreHoy = cierres[0] ?? null;
  const barberosMap = new Map(barberosAll.map((barbero) => [barbero.id, barbero.nombre]));
  const serviciosMap = new Map(serviciosAll.map((servicio) => [servicio.id, servicio.nombre]));
  const mediosMap = new Map(mediosAll.map((medio) => [medio.id, medio.nombre]));
  const productosMap = new Map(productosAll.map((producto) => [producto.id, producto.nombre]));

  const caja = armarCajaDelDia(
    atencionesDelDia.map((atencion) => ({
      id: atencion.id,
      hora: atencion.hora,
      creadoEn: atencion.creadoEn,
      anulado: Boolean(atencion.anulado),
      precioCobrado: Number(atencion.precioCobrado ?? 0),
      servicioNombre: serviciosMap.get(atencion.servicioId ?? "") ?? "Servicio",
      barberoId: atencion.barberoId,
      barberoNombre: barberosMap.get(atencion.barberoId ?? "") ?? "Sin barbero",
      medioPago: getPaymentAccent(mediosMap.get(atencion.medioPagoId ?? "")).label,
      motivoAnulacion: atencion.motivoAnulacion,
      notas: atencion.notas,
    })),
    ventasDelDia.map((venta) => ({
      id: venta.id,
      productoNombre: productosMap.get(venta.productoId ?? "") ?? "Producto",
      cantidad: Number(venta.cantidad ?? 0),
      precioUnitario: Number(venta.precioUnitario ?? 0),
      fecha: venta.fecha,
      // fallback: movimientos previos a la migración 0035 guardaban el medio de pago en notas
      medioPago: getPaymentAccent(mediosMap.get(venta.medioPagoId ?? venta.notas ?? "")).label,
      referenciaId: venta.referenciaId,
      referenciaType: venta.referenciaType,
    }))
  );

  const detalle = [
    plural(caja.cantidadServicios, "servicio", "servicios"),
    caja.cantidadProductos > 0 ? plural(caja.cantidadProductos, "producto", "productos") : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const variosBarberos = isAdmin && caja.porBarbero.length > 1;
  // Lo que no es de ningún barbero (ventas de mostrador), para que el desglose sume el total
  const fueraDeBarberos =
    Math.round((caja.total - caja.porBarbero.reduce((sum, barbero) => sum + barbero.monto, 0)) * 100) / 100;

  return (
    <main className="app-shell min-h-screen px-4 py-6 pb-28">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <section className="panel-card rounded-[28px] p-6">
          <p className="eyebrow text-xs font-semibold">Caja · {formatFechaLarga(fechaHoy)}</p>
          <p className="mt-4 text-sm text-zinc-300">{isAdmin ? "Hoy entraron" : "Hoy cobraste"}</p>
          <p className="font-display mt-1 text-5xl font-bold tabular-nums tracking-tight text-white">
            {formatARS(caja.total)}
          </p>
          <p className="mt-2 text-sm text-zinc-300">{detalle}</p>

          {variosBarberos ? (
            <ul className="mt-3 space-y-1 text-sm tabular-nums text-zinc-300">
              {caja.porBarbero.map((barbero) => (
                <li key={barbero.barberoId} className="flex justify-between gap-4">
                  <span>
                    {barbero.nombre} · {plural(barbero.servicios, "servicio", "servicios")}
                  </span>
                  <span>{formatARS(barbero.monto)}</span>
                </li>
              ))}
              {fueraDeBarberos > 0 ? (
                <li className="flex justify-between gap-4">
                  <span>Productos</span>
                  <span>{formatARS(fueraDeBarberos)}</span>
                </li>
              ) : null}
            </ul>
          ) : null}

          {cierreHoy ? (
            <p className="mt-5 text-sm text-zinc-300">
              ✓ Caja cerrada a las {horaDe(cierreHoy.cerradoEn)}
              {cierreHoy.cerradoPorNombre ? ` por ${cierreHoy.cerradoPorNombre}` : ""}.{" "}
              <Link
                href={`/caja/cierre/${fechaHoy}`}
                className="font-semibold text-white underline underline-offset-4 hover:text-[#8cff59]"
              >
                Ver el cierre
              </Link>
            </p>
          ) : (
            <div className="mt-5">
              <Link
                href="/caja/nueva"
                className="neon-button inline-flex min-h-[56px] w-full items-center justify-center rounded-[20px] px-6 text-lg font-semibold"
              >
                Cobrar
              </Link>
              <Link
                href="/caja/vender"
                className="mt-3 inline-flex min-h-[44px] items-center text-sm font-medium text-zinc-300 underline underline-offset-4 hover:text-[#8cff59]"
              >
                Vender producto
              </Link>
            </div>
          )}
        </section>

        <section className="panel-card rounded-[28px] p-5">
          <h2 className="font-display text-xl font-semibold text-white">Lo de hoy</h2>
          {caja.filas.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-400">Todavía no se cobró nada hoy.</p>
          ) : (
            <>
              <ul className="mt-3 divide-y divide-zinc-800/70">
                {caja.filas.map((fila) => (
                  <FilaDelDia
                    key={fila.key}
                    fila={fila}
                    mostrarBarbero={variosBarberos}
                    puedeEditar={!cierreHoy && fila.tipo === "servicio" && !fila.anulada}
                    puedeAnular={
                      isAdmin && !cierreHoy && !fila.anulada && (fila.tipo === "servicio" || fila.ventaSuelta)
                    }
                  />
                ))}
              </ul>
              <div className="flex items-baseline justify-between gap-4 border-t border-zinc-700 pt-3 tabular-nums">
                <span className="text-sm font-semibold text-zinc-200">Total</span>
                <span className="text-base font-semibold text-white">{formatARS(caja.total)}</span>
              </div>
            </>
          )}
        </section>

        {isAdmin && !cierreHoy ? (
          <Link
            href="/caja/cierre"
            className="inline-flex min-h-[48px] items-center justify-center rounded-[20px] border border-zinc-700 bg-zinc-900 px-5 text-sm font-semibold text-zinc-200 hover:border-zinc-500 hover:text-white"
          >
            Cerrar caja
          </Link>
        ) : null}
      </div>
    </main>
  );
}

function FilaDelDia({
  fila,
  mostrarBarbero,
  puedeEditar,
  puedeAnular,
}: {
  fila: FilaCaja;
  mostrarBarbero: boolean;
  puedeEditar: boolean;
  puedeAnular: boolean;
}) {
  const hora = fila.hora ? formatHora(fila.hora) : horaDe(fila.momento);
  const secundario = [
    fila.anulada ? "Anulada" : null,
    fila.medioPago,
    mostrarBarbero ? fila.barberoNombre : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const nota = fila.anulada ? fila.motivoAnulacion : fila.notas;
  const tieneAcciones = puedeEditar || puedeAnular;

  const resumen = (
    <div className="flex items-baseline gap-3 py-3 tabular-nums">
      <span className="w-12 shrink-0 text-sm text-zinc-400">{hora}</span>
      <span className="min-w-0 flex-1">
        <span className={`block font-medium ${fila.anulada ? "text-zinc-400 line-through" : "text-white"}`}>
          {fila.titulo}
        </span>
        <span className="block text-sm text-zinc-400">{secundario}</span>
        {nota ? <span className="block text-sm text-zinc-400">{nota}</span> : null}
      </span>
      <span
        className={`shrink-0 font-semibold ${fila.anulada ? "text-zinc-400 line-through" : "text-white"}`}
      >
        {formatARS(fila.monto)}
      </span>
      {tieneAcciones ? (
        <span aria-hidden="true" className="shrink-0 text-zinc-500 transition group-open:rotate-90">
          ›
        </span>
      ) : null}
    </div>
  );

  if (!tieneAcciones) return <li>{resumen}</li>;

  return (
    <li>
      <details className="group">
        <summary className="cursor-pointer list-none rounded-xl outline-none hover:bg-white/4 focus-visible:ring-2 focus-visible:ring-[#8cff59]/40 [&::-webkit-details-marker]:hidden">
          {resumen}
        </summary>
        <div className="flex flex-wrap justify-end gap-2 pb-3">
          {puedeEditar ? (
            <Link
              href={`/caja/${fila.id}/editar`}
              className="ghost-button inline-flex min-h-[44px] items-center justify-center rounded-2xl px-4 text-sm font-medium"
            >
              Editar
            </Link>
          ) : null}
          {puedeAnular ? (
            <AnularButton
              atencionId={fila.id}
              anularAction={fila.tipo === "servicio" ? anularAtencion : anularVentaProducto}
            />
          ) : null}
        </div>
      </details>
    </li>
  );
}
