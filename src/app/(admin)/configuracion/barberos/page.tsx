import { db } from "@/db";
import { barberos } from "@/db/schema";
import Link from "next/link";

function formatPct(value: string | null) {
  if (!value) return "—";
  return `${Number(value).toFixed(0)}%`;
}

function formatARS(value: string | null) {
  if (!value) return "—";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(Number(value));
}

function modeloLabel(tipo: string | null) {
  if (tipo === "hibrido") return "Híbrido";
  if (tipo === "variable") return "Variable";
  if (tipo === "fijo") return "Fijo";
  return "—";
}

function initials(name: string | null) {
  const parts = (name ?? "Barbero")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "");
  return parts.join("") || "B";
}

export default async function BarberosPage() {
  const lista = await db.select().from(barberos).orderBy(barberos.nombre);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Barberos</h2>
          <p className="mt-1 text-sm text-gray-500">
            Solo el admin puede editar comisiones, modelo y activación.
          </p>
        </div>
        <Link
          href="/configuracion/barberos/nuevo"
          className="inline-flex min-h-[44px] items-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
        >
          + Nuevo
        </Link>
      </div>

      {lista.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500">No hay barberos cargados todavía.</p>
          <Link
            href="/configuracion/barberos/nuevo"
            className="mt-4 inline-block text-sm text-gray-900 underline"
          >
            Crear el primero
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {lista.map((barbero) => (
            <div
              key={barbero.id}
              className={`rounded-2xl border bg-white p-4 ${
                !barbero.activo ? "border-gray-200 opacity-70" : "border-gray-200"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 flex-1 gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-900 text-sm font-bold text-white">
                    {initials(barbero.nombre)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-gray-900">{barbero.nombre}</span>
                      {!barbero.activo ? (
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                          Inactivo
                        </span>
                      ) : null}
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs capitalize text-blue-700">
                        {barbero.rol}
                      </span>
                    </div>

                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                      <span>Modelo: {modeloLabel(barbero.tipoModelo)}</span>
                      <span>Comisión: {formatPct(barbero.porcentajeComision)}</span>
                      {barbero.alquilerBancoMensual ? (
                        <span>Alquiler banco: {formatARS(barbero.alquilerBancoMensual)}/mes</span>
                      ) : null}
                      {barbero.sueldoMinimoGarantizado ? (
                        <span>Mínimo: {formatARS(barbero.sueldoMinimoGarantizado)}</span>
                      ) : null}
                    </div>

                    <p className="mt-2 text-xs text-gray-400">
                      La activación y desactivación se gestiona dentro de la edición para evitar clics accidentales.
                    </p>
                  </div>
                </div>

                <Link
                  href={`/configuracion/barberos/${barbero.id}/editar`}
                  className="inline-flex min-h-[44px] shrink-0 items-center rounded-lg bg-gray-50 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
                >
                  Editar
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
