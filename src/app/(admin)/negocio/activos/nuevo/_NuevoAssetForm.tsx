"use client";

import Link from "next/link";
import { useActionState } from "react";
import HangarUploadField from "../_HangarUploadField";
import { crearAssetAction, type AssetFormState } from "../actions";
import { ASSET_CATEGORIAS } from "../types";

const initialState: AssetFormState = {};

function getTodayArgentina() {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

export default function NuevoAssetForm() {
  const [state, formAction, pending] = useActionState(crearAssetAction, initialState);

  return (
    <form action={formAction} className="space-y-6">
      {state.error ? (
        <div className="rounded-[22px] border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {state.error}
        </div>
      ) : null}

      <section className="panel-card rounded-[30px] p-5 sm:p-6">
        <div className="flex flex-col gap-4 border-b border-zinc-800 pb-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="eyebrow text-xs font-semibold">Alta Hangar</p>
            <h2 className="font-display mt-2 text-2xl font-semibold text-white">
              Nuevo activo para la inversion inicial
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Registra lo que ya compraste o deja planificado lo que todavia falta cerrar.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <StatusCard
              title="Planificado"
              helper="Todavia no tuvo pagos, pero ya entra en el radar."
            />
            <StatusCard
              title="Pagado"
              helper="Crea el activo y registra el movimiento conectado enseguida."
            />
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
          <div className="space-y-5">
            <section className="rounded-[26px] border border-zinc-800 bg-zinc-950/60 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">
                Identidad del activo
              </p>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <Field
                  label="Nombre"
                  name="nombre"
                  placeholder="Ej: Sillon hidraulico Takara"
                  required
                  error={state.fieldErrors?.nombre}
                />

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-300" htmlFor="categoria">
                    Categoria
                  </label>
                  <select
                    id="categoria"
                    name="categoria"
                    required
                    className="h-12 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-white outline-none transition focus:border-[#8cff59]/60"
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Elegir categoria
                    </option>
                    {ASSET_CATEGORIAS.map((categoria) => (
                      <option key={categoria} value={categoria}>
                        {categoria}
                      </option>
                    ))}
                  </select>
                  {state.fieldErrors?.categoria ? (
                    <p className="text-xs text-red-400">{state.fieldErrors.categoria}</p>
                  ) : null}
                </div>

                <Field
                  label="Marca"
                  name="marca"
                  placeholder="Ej: Wahl"
                />

                <Field
                  label="Modelo"
                  name="modelo"
                  placeholder="Ej: Senior Metal"
                />

                <Field
                  label="Proveedor"
                  name="proveedor"
                  placeholder="Ej: Barber Pro"
                />

                <Field
                  label="Objetivo de compra (ARS)"
                  name="precioObjetivo"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0"
                  required
                  error={state.fieldErrors?.precioObjetivo}
                />
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-300">Modo de alta</label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="rounded-[22px] border border-zinc-700 bg-zinc-900 px-4 py-4 has-[:checked]:border-[#8cff59]/40 has-[:checked]:bg-[#8cff59]/10">
                      <input
                        type="radio"
                        name="estadoCompra"
                        value="planificado"
                        defaultChecked
                        className="accent-[#8cff59]"
                      />
                      <p className="mt-3 text-sm font-semibold text-white">Planificado</p>
                      <p className="mt-1 text-xs leading-5 text-zinc-500">
                        Lo agregas ahora y despues registras sena o cuotas desde la ficha.
                      </p>
                    </label>
                    <label className="rounded-[22px] border border-zinc-700 bg-zinc-900 px-4 py-4 has-[:checked]:border-[#8cff59]/40 has-[:checked]:bg-[#8cff59]/10">
                      <input
                        type="radio"
                        name="estadoCompra"
                        value="pagado"
                        className="accent-[#8cff59]"
                      />
                      <p className="mt-3 text-sm font-semibold text-white">Pagado directo</p>
                      <p className="mt-1 text-xs leading-5 text-zinc-500">
                        Cierra la compra en una sola vez y crea el movimiento conectado.
                      </p>
                    </label>
                  </div>
                  {state.fieldErrors?.estadoCompra ? (
                    <p className="text-xs text-red-400">{state.fieldErrors.estadoCompra}</p>
                  ) : null}
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-zinc-300" htmlFor="fechaCompra">
                    Fecha de referencia
                  </label>
                  <input
                    id="fechaCompra"
                    name="fechaCompra"
                    type="date"
                    defaultValue={getTodayArgentina()}
                    className="h-12 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-white outline-none transition focus:border-[#8cff59]/60"
                  />
                  <p className="text-xs text-zinc-500">
                    Para planificado es opcional. Para compra pagada se usa como fecha del movimiento.
                  </p>
                  {state.fieldErrors?.fechaCompra ? (
                    <p className="text-xs text-red-400">{state.fieldErrors.fechaCompra}</p>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 space-y-1.5">
                <label className="text-sm font-medium text-zinc-300" htmlFor="notas">
                  Notas
                </label>
                <textarea
                  id="notas"
                  name="notas"
                  rows={4}
                  placeholder="Contexto de compra, prioridad, ubicacion prevista, etc."
                  className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white placeholder:text-zinc-500 outline-none transition focus:border-[#8cff59]/60"
                />
              </div>
            </section>
          </div>

          <aside className="space-y-5">
            <section className="rounded-[26px] border border-zinc-800 bg-zinc-950/60 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">
                Soporte visual
              </p>
              <div className="mt-4 space-y-4">
                <HangarUploadField
                  name="fotoUrl"
                  label="Foto del activo"
                  helper="Ayuda a reconocer rapido lo que ya entro al Hangar."
                  kind="photo"
                  accept="image/jpeg,image/png,image/webp"
                />
                <HangarUploadField
                  name="comprobanteUrl"
                  label="Comprobante o respaldo"
                  helper="Factura, captura o PDF de la compra."
                  kind="receipt"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                />
              </div>
            </section>

            <section className="rounded-[26px] border border-[#8cff59]/20 bg-[#8cff59]/10 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8cff59]">
                Que pasa al guardar
              </p>
              <div className="mt-3 space-y-3 text-sm leading-6 text-zinc-200">
                <p>1. El activo entra al Hangar con su categoria y su objetivo de compra.</p>
                <p>2. Si lo marcas como pagado, se registra tambien el movimiento conectado en Finanzas.</p>
                <p>3. Si queda planificado, desde la ficha podras cargar sena, cuotas o cierre final.</p>
              </div>
            </section>
          </aside>
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href="/negocio/activos"
          className="inline-flex min-h-[52px] flex-1 items-center justify-center rounded-[20px] border border-zinc-700 bg-zinc-950 px-5 text-sm font-semibold text-zinc-300 hover:bg-zinc-800"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="neon-button inline-flex min-h-[52px] flex-1 items-center justify-center rounded-[20px] px-5 text-sm font-semibold disabled:opacity-60"
        >
          {pending ? "Guardando..." : "Crear activo en Hangar"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  placeholder,
  type = "text",
  required = false,
  min,
  step,
  error,
}: {
  label: string;
  name: string;
  placeholder: string;
  type?: string;
  required?: boolean;
  min?: string;
  step?: string;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-zinc-300" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        min={min}
        step={step}
        placeholder={placeholder}
        className="h-12 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-white placeholder:text-zinc-500 outline-none transition focus:border-[#8cff59]/60"
      />
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </div>
  );
}

function StatusCard({ title, helper }: { title: string; helper: string }) {
  return (
    <div className="rounded-[22px] border border-zinc-800 bg-zinc-950/70 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{title}</p>
      <p className="mt-2 text-sm leading-5 text-zinc-300">{helper}</p>
    </div>
  );
}
