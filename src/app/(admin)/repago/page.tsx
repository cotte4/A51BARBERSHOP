import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { diasEntre, formatUSD } from "@/lib/amortizacion";
import { formatFecha } from "@/lib/fecha";
import { db } from "@/db";
import { configuracionNegocio } from "@/db/schema";
import { fechaHoyArgentina, getEstadoRepago, montoUsdDeFila } from "@/lib/repago-service";
import { registrarCuota } from "./actions";
import { formatARS } from "@/lib/format";
import BrandMark from "@/components/BrandMark";
import { nombreMes, SITUACION_LABEL, SITUACION_PILL } from "@/components/repago/situacion";
import CuotasPlan from "./_CuotasPlan";
import RegistrarPagoForm from "./_RegistrarPagoForm";

function plural(n: number, uno: string, varios: string): string {
  return `${n} ${n === 1 ? uno : varios}`;
}

type TcOnline = { oficial: number | null; blue: number | null };

async function getTcOnline(): Promise<TcOnline> {
  try {
    const res = await fetch("https://dolarapi.com/v1/dolares", {
      next: { revalidate: 900 },
    });
    if (!res.ok) return { oficial: null, blue: null };
    const data = (await res.json()) as Array<{ casa?: string; compra?: number; venta?: number }>;
    const venta = (casa: string) => {
      const value = data.find((item) => item.casa === casa)?.venta;
      return typeof value === "number" && value > 0 ? Math.round(value) : null;
    };
    const blueItem = data.find((item) => item.casa === "blue");
    const blueCompra = blueItem?.compra;
    const blueVenta = blueItem?.venta;
    const blueMidpoint =
      typeof blueCompra === "number" &&
      blueCompra > 0 &&
      typeof blueVenta === "number" &&
      blueVenta > 0
        ? Math.round((blueCompra + blueVenta) / 2)
        : null;
    return { oficial: venta("oficial"), blue: blueMidpoint };
  } catch {
    return { oficial: null, blue: null };
  }
}

export default async function RepagoPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userRole = (session?.user as { role?: string })?.role;

  if (userRole !== "admin" && userRole !== "asesor") {
    redirect("/caja");
  }

  const hoy = fechaHoyArgentina();
  const [completo, [config], tcOnline] = await Promise.all([
    getEstadoRepago(hoy),
    db
      .select({ tcReferencia: configuracionNegocio.tcReferencia })
      .from(configuracionNegocio)
      .limit(1),
    getTcOnline(),
  ]);
  const tcReferencia = Number(config?.tcReferencia ?? 1400);

  if (!completo) {
    return (
      <div className="app-shell min-h-screen">
        <header className="border-b border-zinc-800/80 bg-zinc-950/90 px-4 py-4 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
            <BrandMark href="/dashboard" subtitle="Repago Memas" />
          </div>
        </header>
        <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 pb-24">
          <section className="panel-card rounded-[28px] p-6">
            <p className="eyebrow text-xs font-semibold">Repago Memas</p>
            <h1 className="font-display mt-2 text-3xl font-semibold text-white">
              No hay préstamo cargado
            </h1>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Cuando se configure el préstamo, acá vas a ver cuánto falta devolver y el historial de
              pagos.
            </p>
          </section>
        </main>
      </div>
    );
  }

  const { plan, filas, estado, calendario } = completo;
  const devuelto = estado.capitalDevuelto;
  const cantidadPagos = estado.aplicaciones.length;

  // Lo que entregaron, en la moneda en que lo entregaron
  const totalArsEntregado = filas
    .filter((fila) => fila.monedaIngresada !== "USD")
    .reduce((sum, fila) => sum + Number(fila.montoIngresado ?? fila.montoPagado ?? 0), 0);
  const totalUsdEntregado = filas
    .filter((fila) => fila.monedaIngresada === "USD")
    .reduce((sum, fila) => sum + montoUsdDeFila(fila), 0);
  const entregadoDetalle = [
    totalArsEntregado > 0 ? `${formatARS(totalArsEntregado)} en pesos` : null,
    totalUsdEntregado > 0 ? `${formatUSD(totalUsdEntregado)} en dólares` : null,
  ]
    .filter(Boolean)
    .join(" + ");

  const porcentajeDevuelto = Math.min(100, (estado.totalPagadoUsd / plan.deudaUsd) * 100);

  // Qué conviene pagar ahora, según el calendario de cuotas
  const { sugerencia, proxima } = calendario;
  const sugerenciaForm = sugerencia
    ? {
        montoUsd: sugerencia.montoUsd,
        label:
          sugerencia.tipo === "ponerse_al_dia"
            ? "Ponerse al día"
            : proxima && proxima.cubierto > 0
              ? `Completar cuota de ${nombreMes(proxima.mes, "mes")}`
              : `Cuota de ${proxima ? nombreMes(proxima.mes, "mes") : "este mes"}`,
      }
    : null;

  const tasaPct = (plan.tasaAnual * 100).toFixed(0);
  const interesPorDia = (estado.saldoCapital * plan.tasaAnual) / 365;
  const topeAlcanzado = estado.interesAcumulado >= estado.topeInteres - 0.005;

  // Cómo se fue acumulando el interés: un tramo entre cada pago, y el último hasta hoy
  const tramosInteres = estado.aplicaciones.slice(1).map((aplicacion, index) => ({
    desde: estado.aplicaciones[index].fecha,
    hasta: aplicacion.fecha,
    dias: aplicacion.dias,
    sobre: estado.aplicaciones[index].saldoDespues,
    interes: aplicacion.interesPeriodo,
  }));
  const ultimo = estado.aplicaciones.at(-1);
  if (ultimo && !devuelto && hoy > ultimo.fecha) {
    const yaAcumulado = tramosInteres.reduce((sum, tramo) => sum + tramo.interes, 0);
    tramosInteres.push({
      desde: ultimo.fecha,
      hasta: hoy,
      dias: diasEntre(ultimo.fecha, hoy),
      sobre: estado.saldoCapital,
      interes: Math.max(0, Math.round((estado.interesAcumulado - yaAcumulado) * 100) / 100),
    });
  }

  // Una parte con la cuenta a la vista, para que se pueda verificar a mano
  const ejemploTramo = tramosInteres.find((tramo) => tramo.dias > 0 && tramo.interes > 0) ?? null;

  return (
    <div className="app-shell min-h-screen">
      <header className="border-b border-zinc-800/80 bg-zinc-950/90 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <BrandMark href="/dashboard" subtitle="Repago Memas" />
        </div>
      </header>
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 pb-24">
        {/* Veredicto: cuánto falta, con la resta a la vista */}
        <section className="panel-card rounded-[28px] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="eyebrow text-xs font-semibold">Repago Memas · préstamo en dólares</p>
            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${SITUACION_PILL[calendario.situacion]}`}
            >
              {SITUACION_LABEL[calendario.situacion]}
            </span>
          </div>

          <p className="mt-5 text-sm text-zinc-400">
            {devuelto ? "Devolvieron todo el préstamo" : "Falta devolver"}
          </p>
          <p className="font-display mt-1 text-5xl font-bold tabular-nums text-white">
            {formatUSD(estado.saldoCapital)}
          </p>

          <p className="mt-4 text-base tabular-nums text-zinc-300">
            <span className="whitespace-nowrap">{formatUSD(plan.deudaUsd)} prestados</span>{" "}
            <span className="whitespace-nowrap">− {formatUSD(estado.totalPagadoUsd)} devueltos</span>{" "}
            <span className="whitespace-nowrap">
              = <strong className="font-semibold text-white">{formatUSD(estado.saldoCapital)}</strong>
            </span>
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            {cantidadPagos > 0
              ? `${plural(cantidadPagos, "pago", "pagos")}: ${entregadoDetalle}.`
              : "Todavía no hubo pagos."}
          </p>

          <div className="mt-6 border-t border-zinc-800 pt-5">
            <CuotasPlan calendario={calendario} porcentajeDevuelto={porcentajeDevuelto} />
          </div>
        </section>

        {/* Acción principal */}
        {!devuelto ? (
          <section className="panel-card rounded-[28px] p-5">
            <h2 className="font-display text-xl font-semibold text-white">Registrar pago</h2>
            <p className="mt-1 text-sm leading-6 text-zinc-400">
              Cargá lo que te dieron y el día en que te lo dieron. Cualquier monto sirve.
            </p>
            <div className="mt-5">
              <RegistrarPagoForm
                action={registrarCuota}
                plan={plan}
                pagos={estado.aplicaciones.map(({ fecha, montoUsd }) => ({ fecha, montoUsd }))}
                hoy={hoy}
                sugerencia={sugerenciaForm}
                tcReferencia={tcReferencia}
                tcSistema={tcOnline.blue}
              />
            </div>
          </section>
        ) : null}

        {/* Interés: aparte, no se descuenta de los pagos */}
        <section className="panel-card rounded-[28px] p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="font-display text-xl font-semibold text-white">Interés</h2>
            <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs font-semibold text-zinc-300">
              Todavía no se cobra
            </span>
          </div>
          <p className="font-display mt-3 text-3xl font-bold tabular-nums text-white">
            {formatUSD(estado.interesAcumulado)}
            <span className="ml-2 text-sm font-normal text-zinc-500">de interés hasta hoy</span>
          </p>

          <dl className="mt-4 grid gap-3 text-sm leading-6 sm:grid-cols-2">
            <div className="rounded-[18px] border border-zinc-800 bg-zinc-950/40 p-3">
              <dt className="font-semibold text-zinc-200">¿Qué es?</dt>
              <dd className="text-zinc-400">
                Lo que cuesta tener la plata prestada: {tasaPct}% por año sobre lo que falta devolver.
              </dd>
            </div>
            <div className="rounded-[18px] border border-zinc-800 bg-zinc-950/40 p-3">
              <dt className="font-semibold text-zinc-200">¿Ya lo pagaron?</dt>
              <dd className="text-zinc-400">
                No. Cada pago va entero a devolver los {formatUSD(plan.deudaUsd)}. El interés se arregla
                cuando terminen.
              </dd>
            </div>
            <div className="rounded-[18px] border border-zinc-800 bg-zinc-950/40 p-3">
              <dt className="font-semibold text-zinc-200">¿Cuánto suma por día?</dt>
              <dd className="text-zinc-400">
                {estado.capitalDevuelto
                  ? "Nada: ya devolvieron todo, así que dejó de sumar."
                  : topeAlcanzado
                    ? "Nada: ya llegó al máximo."
                    : `Hoy deben ${formatUSD(estado.saldoCapital)}, eso suma ${formatUSD(interesPorDia)} por día (unos ${formatUSD(interesPorDia * 30)} por mes). Cada pago lo achica.`}
              </dd>
            </div>
            <div className="rounded-[18px] border border-zinc-800 bg-zinc-950/40 p-3">
              <dt className="font-semibold text-zinc-200">¿Hasta cuánto puede llegar?</dt>
              <dd className="text-zinc-400">
                Como máximo {formatUSD(estado.topeInteres)}, lo que costaba el plan de{" "}
                {plan.cantidadCuotas} cuotas. Si devuelven antes, es menos: si hoy devolvieran todo, quedaría
                en {formatUSD(estado.interesAcumulado)}.
              </dd>
            </div>
          </dl>

          {tramosInteres.length > 0 ? (
            <details className="mt-4 rounded-[22px] border border-zinc-800 bg-zinc-950/60 p-4">
              <summary className="cursor-pointer text-sm font-semibold text-zinc-300 [&::-webkit-details-marker]:hidden">
                Ver la cuenta
              </summary>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                Entre un pago y el siguiente la deuda no cambia, así que se calcula por partes:
              </p>
              <ul className="mt-2 divide-y divide-zinc-800/60 text-sm tabular-nums">
                {tramosInteres.map((tramo) => (
                  <li
                    key={`${tramo.desde}-${tramo.hasta}`}
                    className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5"
                  >
                    <span className="text-zinc-400">
                      Del {formatFecha(tramo.desde)}{" "}
                      {tramo.hasta === hoy ? "hasta hoy" : `al ${formatFecha(tramo.hasta)}`} (
                      {plural(tramo.dias, "día", "días")})
                      debían <span className="whitespace-nowrap text-zinc-200">{formatUSD(tramo.sobre)}</span>
                    </span>
                    <span className="font-semibold text-white">{formatUSD(tramo.interes)}</span>
                  </li>
                ))}
                <li className="flex items-baseline justify-between gap-4 py-2.5">
                  <span className="font-semibold text-zinc-200">Total</span>
                  <span className="font-semibold text-white">{formatUSD(estado.interesAcumulado)}</span>
                </li>
              </ul>
              {ejemploTramo ? (
                <p className="mt-2 text-xs leading-5 text-zinc-500">
                  Cada parte = deuda × {tasaPct}% × días ÷ 365. Por ejemplo:{" "}
                  {formatUSD(ejemploTramo.sobre)} × {tasaPct}% × {ejemploTramo.dias} ÷ 365 ={" "}
                  {formatUSD(ejemploTramo.interes)}.
                </p>
              ) : null}
            </details>
          ) : null}
        </section>

        {/* Historial: consulta */}
        <section className="panel-card rounded-[28px] p-5">
          <h2 className="font-display text-xl font-semibold text-white">Pagos</h2>
          {cantidadPagos === 0 ? (
            <p className="mt-3 text-sm text-zinc-400">Aún no hay pagos registrados.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm tabular-nums">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs uppercase tracking-[0.14em] text-zinc-500">
                    <th className="w-8 pb-3 pr-3 text-left font-medium">#</th>
                    <th className="pb-3 text-left font-medium">Fecha</th>
                    <th className="pb-3 text-right font-medium">Entregaron</th>
                    <th className="pb-3 text-right font-medium">Dólar</th>
                    <th className="pb-3 text-right font-medium">Baja la deuda</th>
                    <th className="pb-3 text-right font-medium">Falta después</th>
                  </tr>
                </thead>
                <tbody>
                  {estado.aplicaciones.map((aplicacion, index) => {
                    const fila = filas[index];
                    const ingresado = Number(fila.montoIngresado ?? fila.montoPagado ?? 0);
                    return (
                      <tr key={fila.id} className="border-b border-zinc-800/60">
                        <td className="py-3 pr-3 text-zinc-500">{index + 1}</td>
                        <td className="py-3 text-zinc-300">
                          {formatFecha(aplicacion.fecha)}
                          {fila.notas ? (
                            <span className="block text-xs text-zinc-500">{fila.notas}</span>
                          ) : null}
                        </td>
                        <td className="py-3 text-right text-white">
                          {fila.monedaIngresada === "USD" ? formatUSD(ingresado) : formatARS(ingresado)}
                        </td>
                        <td className="py-3 text-right text-zinc-400">
                          {fila.tcDia ? formatARS(fila.tcDia) : "-"}
                        </td>
                        <td className="py-3 text-right font-medium text-[#8cff59]">
                          − {formatUSD(aplicacion.capital)}
                        </td>
                        <td className="py-3 text-right text-zinc-300">
                          {formatUSD(aplicacion.saldoDespues)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="font-semibold">
                    <td className="pt-3 text-zinc-400" colSpan={2}>
                      Total
                    </td>
                    <td className="pt-3 text-right text-xs font-normal text-zinc-400" colSpan={2}>
                      {entregadoDetalle}
                    </td>
                    <td className="pt-3 text-right text-[#8cff59]">− {formatUSD(estado.totalPagadoUsd)}</td>
                    <td className="pt-3 text-right text-white">{formatUSD(estado.saldoCapital)}</td>
                  </tr>
                </tfoot>
              </table>
              <p className="mt-3 text-xs text-zinc-500">
                Los pagos en pesos se pasan a dólares con el dólar del día del pago. La deuda
                siempre está en dólares.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
