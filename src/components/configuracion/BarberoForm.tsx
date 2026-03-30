"use client";

import Link from "next/link";
import { useActionState, useMemo, useState } from "react";
import type { BarberoFormState } from "@/app/(admin)/configuracion/barberos/actions";

interface BarberoFormProps {
  action: (
    prevState: BarberoFormState,
    formData: FormData
  ) => Promise<BarberoFormState>;
  initialData?: {
    nombre?: string;
    rol?: string;
    tipoModelo?: string;
    porcentajeComision?: string | null;
    alquilerBancoMensual?: string | null;
    sueldoMinimoGarantizado?: string | null;
    servicioDefectoId?: string | null;
    medioPagoDefectoId?: string | null;
  };
  serviciosOptions: Array<{ id: string; nombre: string }>;
  mediosPagoOptions: Array<{ id: string; nombre: string | null }>;
  submitLabel?: string;
  cancelHref?: string;
}

const initialState: BarberoFormState = {};

function formatARS(value: number) {
  if (!value) return "$ 0";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(value);
}

export default function BarberoForm({
  action,
  initialData,
  serviciosOptions,
  mediosPagoOptions,
  submitLabel = "Guardar",
  cancelHref = "/configuracion/barberos",
}: BarberoFormProps) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [nombre, setNombre] = useState(initialData?.nombre ?? "");
  const [rol, setRol] = useState(initialData?.rol ?? "barbero");
  const [tipoModelo, setTipoModelo] = useState(initialData?.tipoModelo ?? "variable");
  const [porcentajeComision, setPorcentajeComision] = useState(initialData?.porcentajeComision ?? "");
  const [alquilerBancoMensual, setAlquilerBancoMensual] = useState(initialData?.alquilerBancoMensual ?? "");
  const [sueldoMinimoGarantizado, setSueldoMinimoGarantizado] = useState(initialData?.sueldoMinimoGarantizado ?? "");
  const [servicioDefectoId, setServicioDefectoId] = useState(initialData?.servicioDefectoId ?? "");
  const [medioPagoDefectoId, setMedioPagoDefectoId] = useState(initialData?.medioPagoDefectoId ?? "");

  const servicioDefecto = serviciosOptions.find((servicio) => servicio.id === servicioDefectoId);
  const medioPagoDefecto = mediosPagoOptions.find((medio) => medio.id === medioPagoDefectoId);

  const modeloLabel = useMemo(() => {
    if (tipoModelo === "hibrido") return "Comision + alquiler";
    if (tipoModelo === "fijo") return "Con minimo garantizado";
    return "Variable por comision";
  }, [tipoModelo]);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      ) : null}

      <section className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-400">
          Perfil del barbero
        </p>
        <div className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="nombre" className="text-sm font-medium text-stone-700">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                id="nombre"
                name="nombre"
                type="text"
                value={nombre}
                onChange={(event) => setNombre(event.target.value)}
                placeholder="Ej: Gabote"
                className="min-h-[48px] rounded-xl border border-stone-300 px-4 text-sm text-stone-900 outline-none focus:border-stone-900"
              />
              {state.fieldErrors?.nombre ? (
                <p className="text-xs text-red-500">{state.fieldErrors.nombre}</p>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label htmlFor="rol" className="text-sm font-medium text-stone-700">
                  Rol <span className="text-red-500">*</span>
                </label>
                <select
                  id="rol"
                  name="rol"
                  value={rol}
                  onChange={(event) => setRol(event.target.value)}
                  className="min-h-[48px] rounded-xl border border-stone-300 bg-white px-4 text-sm text-stone-900 outline-none focus:border-stone-900"
                >
                  <option value="barbero">Barbero</option>
                  <option value="admin">Admin (dueno)</option>
                </select>
                {state.fieldErrors?.rol ? (
                  <p className="text-xs text-red-500">{state.fieldErrors.rol}</p>
                ) : null}
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="tipoModelo" className="text-sm font-medium text-stone-700">
                  Modelo de compensacion <span className="text-red-500">*</span>
                </label>
                <select
                  id="tipoModelo"
                  name="tipoModelo"
                  value={tipoModelo}
                  onChange={(event) => setTipoModelo(event.target.value)}
                  className="min-h-[48px] rounded-xl border border-stone-300 bg-white px-4 text-sm text-stone-900 outline-none focus:border-stone-900"
                >
                  <option value="variable">Variable</option>
                  <option value="hibrido">Hibrido</option>
                  <option value="fijo">Fijo</option>
                </select>
                {state.fieldErrors?.tipoModelo ? (
                  <p className="text-xs text-red-500">{state.fieldErrors.tipoModelo}</p>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label htmlFor="porcentajeComision" className="text-sm font-medium text-stone-700">
                  % de comision <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="porcentajeComision"
                    name="porcentajeComision"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={porcentajeComision}
                    onChange={(event) => setPorcentajeComision(event.target.value)}
                    placeholder="Ej: 75"
                    className="min-h-[48px] w-full rounded-xl border border-stone-300 px-4 pr-10 text-sm text-stone-900 outline-none focus:border-stone-900"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-stone-400">
                    %
                  </span>
                </div>
                {state.fieldErrors?.porcentajeComision ? (
                  <p className="text-xs text-red-500">{state.fieldErrors.porcentajeComision}</p>
                ) : null}
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="sueldoMinimoGarantizado" className="text-sm font-medium text-stone-700">
                  Sueldo minimo <span className="text-xs text-stone-400">(opcional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-stone-400">
                    $
                  </span>
                  <input
                    id="sueldoMinimoGarantizado"
                    name="sueldoMinimoGarantizado"
                    type="number"
                    min="0"
                    step="1"
                    value={sueldoMinimoGarantizado}
                    onChange={(event) => setSueldoMinimoGarantizado(event.target.value)}
                    placeholder="Ej: 500000"
                    className="min-h-[48px] w-full rounded-xl border border-stone-300 pl-8 pr-4 text-sm text-stone-900 outline-none focus:border-stone-900"
                  />
                </div>
                {state.fieldErrors?.sueldoMinimoGarantizado ? (
                  <p className="text-xs text-red-500">{state.fieldErrors.sueldoMinimoGarantizado}</p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="alquilerBancoMensual" className="text-sm font-medium text-stone-700">
                Alquiler banco mensual <span className="text-xs text-stone-400">(solo hibrido)</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-stone-400">
                  $
                </span>
                <input
                  id="alquilerBancoMensual"
                  name="alquilerBancoMensual"
                  type="number"
                  min="0"
                  step="1"
                  value={alquilerBancoMensual}
                  onChange={(event) => setAlquilerBancoMensual(event.target.value)}
                  placeholder="Ej: 300000"
                  className="min-h-[48px] w-full rounded-xl border border-stone-300 pl-8 pr-4 text-sm text-stone-900 outline-none focus:border-stone-900"
                />
              </div>
              {state.fieldErrors?.alquilerBancoMensual ? (
                <p className="text-xs text-red-500">{state.fieldErrors.alquilerBancoMensual}</p>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label htmlFor="servicioDefectoId" className="text-sm font-medium text-stone-700">
                  Servicio por defecto
                </label>
                <select
                  id="servicioDefectoId"
                  name="servicioDefectoId"
                  value={servicioDefectoId}
                  onChange={(event) => setServicioDefectoId(event.target.value)}
                  className="min-h-[48px] rounded-xl border border-stone-300 bg-white px-4 text-sm text-stone-900 outline-none focus:border-stone-900"
                >
                  <option value="">Sin configurar</option>
                  {serviciosOptions.map((servicio) => (
                    <option key={servicio.id} value={servicio.id}>
                      {servicio.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="medioPagoDefectoId" className="text-sm font-medium text-stone-700">
                  Medio de pago por defecto
                </label>
                <select
                  id="medioPagoDefectoId"
                  name="medioPagoDefectoId"
                  value={medioPagoDefectoId}
                  onChange={(event) => setMedioPagoDefectoId(event.target.value)}
                  className="min-h-[48px] rounded-xl border border-stone-300 bg-white px-4 text-sm text-stone-900 outline-none focus:border-stone-900"
                >
                  <option value="">Sin configurar</option>
                  {mediosPagoOptions.map((medio) => (
                    <option key={medio.id} value={medio.id}>
                      {medio.nombre ?? "-"}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] bg-stone-950 p-5 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-300">
              Lectura rapida
            </p>
            <div className="mt-4 space-y-3">
              <BarberStat label="Perfil" value={nombre.trim() || "Pendiente"} />
              <BarberStat label="Rol" value={rol === "admin" ? "Admin" : "Barbero"} />
              <BarberStat label="Modelo" value={modeloLabel} />
              <BarberStat
                label="Comision"
                value={`${Number(porcentajeComision || 0)}%`}
                strong
              />
              <BarberStat
                label="Alquiler"
                value={formatARS(Number(alquilerBancoMensual) || 0)}
              />
              <BarberStat
                label="Accion rapida"
                value={`${servicioDefecto?.nombre ?? "Sin servicio"} · ${medioPagoDefecto?.nombre ?? "Sin medio"}`}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-[52px] flex-1 items-center justify-center rounded-2xl bg-stone-900 px-5 text-sm font-semibold text-white transition hover:bg-stone-700 disabled:opacity-50"
        >
          {isPending ? "Guardando..." : submitLabel}
        </button>
        <Link
          href={cancelHref}
          className="inline-flex min-h-[52px] items-center justify-center rounded-2xl bg-stone-100 px-5 text-sm font-medium text-stone-700 transition hover:bg-stone-200"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}

function BarberStat({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className={`rounded-[18px] px-4 py-3 ${strong ? "bg-white/12" : "bg-white/6"}`}>
      <p className="text-xs uppercase tracking-[0.16em] text-stone-300">{label}</p>
      <p className={`mt-2 ${strong ? "text-xl font-semibold" : "text-base font-medium"} text-white`}>
        {value}
      </p>
    </div>
  );
}
