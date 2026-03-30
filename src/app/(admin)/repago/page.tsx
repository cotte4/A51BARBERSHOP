import { db } from "@/db";
import { repagoMemas, repagoMemasCuotas } from "@/db/schema";
import { desc } from "drizzle-orm";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  generarCronograma,
  calcularCuotaSiguiente,
  calcularFechaCancelacion,
  calcularPorcentajeAvance,
  formatUSD,
} from "@/lib/amortizacion";
import { auth } from "@/lib/auth";
import { registrarCuota } from "./actions";
import RegistrarPagoForm from "./_RegistrarPagoForm";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatARS(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return "$ 0";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(Number(val));
}

function formatFecha(fecha: string | null): string {
  if (!fecha) return "—";
  return new Date(fecha + "T12:00:00").toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function RepagoPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const userRole = (session?.user as { role?: string })?.role;

  if (userRole !== "admin") {
    redirect("/caja");
  }

  const [repago] = await db.select().from(repagoMemas).limit(1);
  const cuotas = await db
    .select()
    .from(repagoMemasCuotas)
    .orderBy(desc(repagoMemasCuotas.fechaPago));

  // Parámetros del acuerdo
  const deudaUsd = Number(repago?.deudaUsd ?? 1500);
  const tasaAnual = Number(repago?.tasaAnualUsd ?? 0.1);
  const cantidadCuotas = repago?.cantidadCuotasPactadas ?? 12;
  const cuotasPagadas = repago?.cuotasPagadas ?? 0;
  const fechaInicio = repago?.fechaInicio ?? "2026-05-01";

  // Cronograma y cálculos derivados
  const cronograma = generarCronograma(deudaUsd, tasaAnual, cantidadCuotas);
  const cuotaSiguiente = calcularCuotaSiguiente(cronograma, cuotasPagadas);
  const fechaCancelacion = calcularFechaCancelacion(
    fechaInicio,
    cuotasPagadas,
    cantidadCuotas
  );

  // Capital pagado acumulado (real, desde las cuotas registradas)
  const capitalPagadoAcumulado = cuotas.reduce(
    (s, c) => s + Number(c.capitalPagado ?? 0),
    0
  );
  const porcentajeAvance = calcularPorcentajeAvance(
    capitalPagadoAcumulado,
    deudaUsd
  );

  // Ordenar cuotas por numero_cuota para el historial
  const cuotasOrdenadas = [...cuotas].sort(
    (a, b) => (a.numeroCuota ?? 0) - (b.numeroCuota ?? 0)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-gray-500 hover:text-gray-900 text-sm"
          >
            ← Dashboard
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Repago Memas</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-4">
        {!repago ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500 text-sm">
            No hay deuda configurada.
          </div>
        ) : (
          <>
            {/* ── Bloque 1: Estado de la deuda ── */}
            {repago.pagadoCompleto ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                <p className="text-green-800 font-semibold text-lg">
                  Deuda cancelada
                </p>
                {cuotas.length > 0 && (
                  <p className="text-green-600 text-sm mt-1">
                    Ultimo pago: {formatFecha(cuotas[0].fechaPago)}
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Estado de la deuda
                  </h2>
                  <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                    ACTIVO
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Deuda original</p>
                    <p className="text-xl font-bold text-gray-900">
                      {formatUSD(deudaUsd)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Saldo pendiente</p>
                    <p className="text-xl font-bold text-red-600">
                      {cuotaSiguiente
                        ? formatUSD(cuotaSiguiente.saldoInicial)
                        : formatUSD(0)}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-400">
                      Saldo en ARS: ingresá el TC del día al registrar un pago
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ── Bloque 2: Barra de progreso ── */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Progreso de cancelación
              </h2>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="font-semibold text-gray-900">
                  {porcentajeAvance.toFixed(1)}% cancelado
                </span>
                <span className="text-gray-500">
                  {formatUSD(capitalPagadoAcumulado)} pagados de{" "}
                  {formatUSD(deudaUsd)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="h-3 rounded-full bg-gray-900 transition-all"
                  style={{ width: `${porcentajeAvance}%` }}
                />
              </div>
            </div>

            {/* ── Bloque 3: Próxima cuota y proyección ── */}
            {!repago.pagadoCompleto && cuotaSiguiente && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Próxima cuota
                </h2>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">
                      Cuota #{cuotaSiguiente.numeroCuota} de {cantidadCuotas}
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatUSD(cuotaSiguiente.cuotaTotal)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Capital: {formatUSD(cuotaSiguiente.capital)} — Interés:{" "}
                      {formatUSD(cuotaSiguiente.interes)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      Cancelación proyectada
                    </p>
                    <p className="text-sm font-semibold text-gray-700">
                      {fechaCancelacion}
                    </p>
                    <p className="text-xs text-gray-400">
                      {cantidadCuotas - cuotasPagadas} cuotas restantes
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ── Bloque 4: Tabla del cronograma ── */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Cronograma de amortización
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 border-b border-gray-100">
                      <th className="text-left pb-2 font-medium">#</th>
                      <th className="text-right pb-2 font-medium">Capital</th>
                      <th className="text-right pb-2 font-medium">Interés</th>
                      <th className="text-right pb-2 font-medium">Total USD</th>
                      <th className="text-right pb-2 font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cronograma.map((cuota) => {
                      const cuotaPagada = cuotasOrdenadas.find(
                        (c) => c.numeroCuota === cuota.numeroCuota
                      );
                      const esPagada = !!cuotaPagada;
                      const esProxima =
                        !repago.pagadoCompleto &&
                        cuota.numeroCuota === cuotasPagadas + 1;

                      return (
                        <tr
                          key={cuota.numeroCuota}
                          className={`border-b border-gray-50 ${esProxima ? "bg-blue-50" : ""}`}
                        >
                          <td
                            className={`py-2 font-medium ${esPagada ? "text-green-700" : "text-gray-400"}`}
                          >
                            {cuota.numeroCuota}
                          </td>
                          <td
                            className={`py-2 text-right ${esPagada ? "text-green-700" : "text-gray-400"}`}
                          >
                            {esPagada
                              ? formatUSD(Number(cuotaPagada.capitalPagado ?? cuota.capital))
                              : formatUSD(cuota.capital)}
                          </td>
                          <td
                            className={`py-2 text-right ${esPagada ? "text-green-700" : "text-gray-400"}`}
                          >
                            {esPagada
                              ? formatUSD(Number(cuotaPagada.interesPagado ?? cuota.interes))
                              : formatUSD(cuota.interes)}
                          </td>
                          <td
                            className={`py-2 text-right font-medium ${esPagada ? "text-green-700" : "text-gray-400"}`}
                          >
                            {esPagada
                              ? formatUSD(
                                  Number(cuotaPagada.capitalPagado ?? 0) +
                                    Number(cuotaPagada.interesPagado ?? 0)
                                )
                              : formatUSD(cuota.cuotaTotal)}
                          </td>
                          <td className="py-2 text-right">
                            {esPagada ? (
                              <span className="text-green-600 font-semibold">
                                Pagada
                              </span>
                            ) : esProxima ? (
                              <span className="text-blue-600 font-semibold">
                                Proxima
                              </span>
                            ) : (
                              <span className="text-gray-300">Pendiente</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Bloque 5: Formulario de pago ── */}
            {!repago.pagadoCompleto && cuotaSiguiente && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                  Registrar pago
                </h2>
                <RegistrarPagoForm
                  action={registrarCuota}
                  cuotaTotalDefault={cuotaSiguiente.cuotaTotal}
                />
              </div>
            )}

            {/* ── Bloque 6: Historial de pagos ── */}
            {cuotas.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Historial de pagos
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-gray-400 border-b border-gray-100">
                        <th className="text-left pb-2 font-medium">Fecha</th>
                        <th className="text-left pb-2 font-medium">Cuota</th>
                        <th className="text-right pb-2 font-medium">Capital</th>
                        <th className="text-right pb-2 font-medium">Interés</th>
                        <th className="text-right pb-2 font-medium">Total USD</th>
                        <th className="text-right pb-2 font-medium">TC</th>
                        <th className="text-right pb-2 font-medium">Monto ARS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cuotasOrdenadas.map((c) => {
                        const capital = Number(c.capitalPagado ?? 0);
                        const interes = Number(c.interesPagado ?? 0);
                        const totalUsd = capital + interes;
                        return (
                          <tr
                            key={c.id}
                            className="border-b border-gray-50 last:border-0"
                          >
                            <td className="py-2 text-gray-600">
                              {formatFecha(c.fechaPago)}
                            </td>
                            <td className="py-2 text-gray-600">
                              #{c.numeroCuota}
                            </td>
                            <td className="py-2 text-right text-gray-700">
                              {formatUSD(capital)}
                            </td>
                            <td className="py-2 text-right text-gray-500">
                              {formatUSD(interes)}
                            </td>
                            <td className="py-2 text-right font-medium text-gray-900">
                              {formatUSD(totalUsd)}
                            </td>
                            <td className="py-2 text-right text-gray-500">
                              {c.tcDia ? `$${Number(c.tcDia).toLocaleString("es-AR")}` : "—"}
                            </td>
                            <td className="py-2 text-right text-gray-700">
                              {c.montoPagado ? formatARS(c.montoPagado) : "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
