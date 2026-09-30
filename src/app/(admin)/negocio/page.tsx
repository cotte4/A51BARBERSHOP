import Link from "next/link";
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
  stockMovimientos,
} from "@/db/schema";
import { auth } from "@/lib/auth";
import { formatUSD } from "@/lib/amortizacion";
import { getEstadoRepago } from "@/lib/repago-service";
import { SITUACION_LABEL } from "@/components/repago/situacion";
import { getKpisDia } from "@/lib/dashboard-queries";
import {
  formatARS,
  formatHeaderDate,
  getFechaHoyArgentina,
  toNumber,
} from "./_lib/page-utils";

const utilityLinks = [
  { href: "/mi-resultado", label: "Mi resultado" },
  { href: "/dashboard/pl", label: "El mes completo" },
  { href: "/finanzas", label: "Costos fijos y capital" },
  { href: "/negocio/activos", label: "Hangar (compras y activos)" },
  { href: "/negocio/estilo", label: "Cortes Marciano" },
  { href: "/ovnis", label: "OVNIS" },
  { href: "/negocio/soporte", label: "Soporte" },
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
    repago,
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
    getEstadoRepago(fechaHoy),
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
    return sum + -toNumber(row.cantidad) * toNumber(row.precioUnitario);
  }, 0);
  const ingresoBrutoHoy = totalServiciosHoy + totalRetailHoy;
  const gastosHoy = gastosHoyRows.reduce((sum, row) => sum + toNumber(row.monto), 0);

  const pendientesEquipo = listaBarberos
    .filter((barbero) => barbero.activo && barbero.rol !== "admin")
    .map((barbero) => ({
      id: barbero.id,
      nombre: barbero.nombre,
      pendiente: listaLiquidaciones
        .filter((liquidacion) => liquidacion.barberoId === barbero.id)
        .reduce((sum, liquidacion) => sum + toNumber(liquidacion.montoAPagar), 0),
    }))
    .filter((row) => row.pendiente > 0)
    .sort((a, b) => b.pendiente - a.pendiente);
  const totalPendienteBarberos = pendientesEquipo.reduce((sum, row) => sum + row.pendiente, 0);

  const stockAlerts = listaProductos
    .filter((producto) => (producto.stockActual ?? 0) <= (producto.stockMinimo ?? 5))
    .sort((a, b) => (a.stockActual ?? 0) - (b.stockActual ?? 0));

  // Sin préstamo cargado se muestra igual que uno devuelto
  const situacionRepago = repago?.calendario.situacion ?? "devuelto";
  const saldoPendienteUsd =
    repago && !repago.estado.capitalDevuelto ? repago.estado.saldoCapital : 0;

  // Cada fila es un número y lleva a la pantalla donde se trabaja
  const filas: { href: string; label: string; valor: string; detalle: string }[] = [
    {
      href: "/caja",
      label: "Hoy entraron",
      valor: formatARS(ingresoBrutoHoy),
      detalle: `${kpisDia.atencionesHoy === 1 ? "1 servicio" : `${kpisDia.atencionesHoy} servicios`} · ${
        kpisDia.cierreRealizado ? "✓ caja cerrada" : "caja abierta"
      }`,
    },
    {
      href: "/gastos-rapidos",
      label: "Gastos de hoy",
      valor: formatARS(gastosHoy),
      detalle: "",
    },
    {
      href: "/liquidaciones",
      label: "Falta pagarle al equipo",
      valor: formatARS(totalPendienteBarberos),
      detalle: pendientesEquipo.map((row) => `${row.nombre} ${formatARS(row.pendiente)}`).join(" · "),
    },
    {
      href: "/repago",
      label: "Falta devolver del préstamo",
      valor: formatUSD(saldoPendienteUsd),
      detalle: SITUACION_LABEL[situacionRepago],
    },
    {
      href: "/inventario",
      label: "Productos por reponer",
      valor: String(stockAlerts.length),
      detalle: stockAlerts
        .slice(0, 3)
        .map((producto) =>
          (producto.stockActual ?? 0) <= 0
            ? `${producto.nombre} (agotado)`
            : `${producto.nombre} (quedan ${producto.stockActual})`
        )
        .join(" · "),
    },
  ];

  return (
    <main className="app-shell min-h-screen px-4 py-6 pb-28">
      <div className="mx-auto flex max-w-xl flex-col gap-6">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-white">Negocio</h1>
          <p className="mt-1 text-sm text-zinc-300">{headerDate}</p>
        </div>

        <section className="panel-card rounded-[28px] p-5">
          <ul className="divide-y divide-zinc-800/70">
            {filas.map((fila) => (
              <li key={fila.href}>
                <Link
                  href={fila.href}
                  className="flex items-baseline justify-between gap-4 rounded-xl py-3.5 hover:bg-white/4"
                >
                  <span className="min-w-0">
                    <span className="block text-zinc-200">{fila.label}</span>
                    {fila.detalle ? (
                      <span className="block text-sm text-zinc-400">{fila.detalle}</span>
                    ) : null}
                  </span>
                  <span className="shrink-0 font-display text-xl font-bold tabular-nums text-white">
                    {fila.valor} <span aria-hidden="true" className="text-base font-normal text-zinc-500">›</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel-card rounded-[28px] p-5">
          <h2 className="font-display text-xl font-semibold text-white">Más</h2>
          <ul className="mt-2 divide-y divide-zinc-800/70">
            {utilityLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="flex items-center justify-between gap-4 rounded-xl py-3 text-zinc-200 hover:bg-white/4 hover:text-white"
                >
                  {link.label}
                  <span aria-hidden="true" className="text-zinc-500">›</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
