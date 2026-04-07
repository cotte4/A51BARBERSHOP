"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
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
    publicSlug?: string | null;
    publicReservaActiva?: boolean | null;
    publicReservaPasswordConfigured?: boolean | null;
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
  const [publicReservaActiva, setPublicReservaActiva] = useState(
    initialData?.publicReservaActiva ?? false
  );
  const [publicReservaRequiresPassword, setPublicReservaRequiresPassword] = useState(
    initialData?.publicReservaPasswordConfigured ?? false
  );
  const [publicReservaPassword, setPublicReservaPassword] = useState("");
  const [publicSlug, setPublicSlug] = useState(initialData?.publicSlug ?? "");
  const [publicSlugEdited, setPublicSlugEdited] = useState(Boolean(initialData?.publicSlug));

  const servicioDefecto = serviciosOptions.find((servicio) => servicio.id === servicioDefectoId);
  const medioPagoDefecto = mediosPagoOptions.find((medio) => medio.id === medioPagoDefectoId);

  const modeloLabel = useMemo(() => {
    if (tipoModelo === "hibrido") return "Comision + alquiler";
    if (tipoModelo === "fijo") return "Con minimo garantizado";
    return "Variable por comision";
  }, [tipoModelo]);

  const modeloDetail = useMemo(() => {
    if (tipoModelo === "hibrido") return "Comision mas alquiler mensual del banco.";
    if (tipoModelo === "fijo") return "Pago base con minimo garantizado.";
    return "Solo comision variable por venta.";
  }, [tipoModelo]);

  const publicLink = publicSlug ? `/reservar/${publicSlug}` : "/reservar";

  useEffect(() => {
    if (publicSlugEdited) {
      return;
    }

    const suggestedSlug = nombre
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48);

    setPublicSlug(suggestedSlug);
  }, [nombre, publicSlugEdited]);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state.error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/15 px-4 py-3 text-sm text-red-300">
          {state.error}
        </div>
      ) : null}

      <section className="panel-card rounded-[28px] p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">
          Perfil del barbero
        </p>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Cargamos identidad, modelo de compensacion y defaults para que este perfil quede listo
          para caja y liquidaciones desde el primer guardado.
        </p>
        <div className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="nombre" className="text-sm font-medium text-zinc-300">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                id="nombre"
                name="nombre"
                type="text"
                value={nombre}
                onChange={(event) => setNombre(event.target.value)}
                placeholder="Ej: Gabote"
                className="min-h-[48px] w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-sm text-white placeholder:text-zinc-500 focus:border-[#8cff59]/60 focus:outline-none"
              />
              {state.fieldErrors?.nombre ? (
                <p className="text-xs text-red-500">{state.fieldErrors.nombre}</p>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label htmlFor="rol" className="text-sm font-medium text-zinc-300">
                  Rol <span className="text-red-500">*</span>
                </label>
                <select
                id="rol"
                name="rol"
                value={rol}
                onChange={(event) => setRol(event.target.value)}
                className="min-h-[48px] w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-sm text-white focus:border-[#8cff59]/60 focus:outline-none"
              >
                <option value="barbero">Barbero</option>
                <option value="admin">Admin (dueno)</option>
              </select>
              <p className="text-xs text-zinc-500">
                Define permisos y el alcance del acceso para este perfil.
              </p>
              {state.fieldErrors?.rol ? (
                <p className="text-xs text-red-500">{state.fieldErrors.rol}</p>
              ) : null}
            </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="tipoModelo" className="text-sm font-medium text-zinc-300">
                  Modelo de compensacion <span className="text-red-500">*</span>
                </label>
                <select
                id="tipoModelo"
                name="tipoModelo"
                value={tipoModelo}
                onChange={(event) => setTipoModelo(event.target.value)}
                className="min-h-[48px] w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-sm text-white focus:border-[#8cff59]/60 focus:outline-none"
              >
                <option value="variable">Variable</option>
                <option value="hibrido">Hibrido</option>
                <option value="fijo">Fijo</option>
              </select>
              <p className="text-xs text-zinc-500">{modeloDetail}</p>
              {state.fieldErrors?.tipoModelo ? (
                <p className="text-xs text-red-500">{state.fieldErrors.tipoModelo}</p>
              ) : null}
            </div>
          </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label htmlFor="porcentajeComision" className="text-sm font-medium text-zinc-300">
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
                    className="min-h-[48px] w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 pr-10 text-sm text-white placeholder:text-zinc-500 focus:border-[#8cff59]/60 focus:outline-none"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-zinc-400">
                    %
                  </span>
                </div>
                <p className="text-xs text-zinc-500">
                  Se aplica a la liquidacion del servicio y a la lectura de resultados.
                </p>
                {state.fieldErrors?.porcentajeComision ? (
                  <p className="text-xs text-red-500">{state.fieldErrors.porcentajeComision}</p>
                ) : null}
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="sueldoMinimoGarantizado" className="text-sm font-medium text-zinc-300">
                  Sueldo minimo <span className="text-xs text-zinc-400">(opcional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-zinc-400">
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
                    className="min-h-[48px] w-full rounded-xl border border-zinc-700 bg-zinc-900 pl-8 pr-4 text-sm text-white placeholder:text-zinc-500 focus:border-[#8cff59]/60 focus:outline-none"
                  />
                </div>
                <p className="text-xs text-zinc-500">
                  Solo tiene sentido si este perfil trabaja con minimo garantizado.
                </p>
                {state.fieldErrors?.sueldoMinimoGarantizado ? (
                  <p className="text-xs text-red-500">{state.fieldErrors.sueldoMinimoGarantizado}</p>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="alquilerBancoMensual" className="text-sm font-medium text-zinc-300">
                Alquiler banco mensual <span className="text-xs text-zinc-400">(solo hibrido)</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-zinc-400">
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
                  className="min-h-[48px] w-full rounded-xl border border-zinc-700 bg-zinc-900 pl-8 pr-4 text-sm text-white placeholder:text-zinc-500 focus:border-[#8cff59]/60 focus:outline-none"
                />
              </div>
              <p className="text-xs text-zinc-500">
                Solo aplica en el modelo hibrido y se muestra aparte en caja.
              </p>
              {state.fieldErrors?.alquilerBancoMensual ? (
                <p className="text-xs text-red-500">{state.fieldErrors.alquilerBancoMensual}</p>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label htmlFor="servicioDefectoId" className="text-sm font-medium text-zinc-300">
                  Servicio por defecto
                </label>
                <select
                  id="servicioDefectoId"
                  name="servicioDefectoId"
                  value={servicioDefectoId}
                  onChange={(event) => setServicioDefectoId(event.target.value)}
                  className="min-h-[48px] w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-sm text-white focus:border-[#8cff59]/60 focus:outline-none"
                >
                  <option value="">Sin configurar</option>
                  {serviciosOptions.map((servicio) => (
                    <option key={servicio.id} value={servicio.id}>
                      {servicio.nombre}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-zinc-500">
                  Se prellenara cuando cargues una atencion desde caja.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <label htmlFor="medioPagoDefectoId" className="text-sm font-medium text-zinc-300">
                  Medio de pago por defecto
                </label>
                <select
                  id="medioPagoDefectoId"
                  name="medioPagoDefectoId"
                  value={medioPagoDefectoId}
                  onChange={(event) => setMedioPagoDefectoId(event.target.value)}
                  className="min-h-[48px] w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-sm text-white focus:border-[#8cff59]/60 focus:outline-none"
                >
                  <option value="">Sin configurar</option>
                  {mediosPagoOptions.map((medio) => (
                    <option key={medio.id} value={medio.id}>
                      {medio.nombre ?? "-"}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-zinc-500">
                  Tambien se preselecciona al cobrar si lo dejamos seteado.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] bg-zinc-900 p-5 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
              Lectura rapida
            </p>
            <p className="mt-2 text-sm text-zinc-400">
              Revisá esta columna para confirmar cómo va a caer el perfil en operación.
            </p>
            <div className="mt-4 space-y-3">
              <BarberStat
                label="Perfil"
                value={nombre.trim() || "Pendiente"}
                detail="Nombre visible en caja, agenda y liquidaciones."
              />
              <BarberStat label="Rol" value={rol === "admin" ? "Admin" : "Barbero"} />
              <BarberStat label="Modelo" value={modeloLabel} detail={modeloDetail} />
              <BarberStat
                label="Comision"
                value={`${Number(porcentajeComision || 0)}%`}
                strong
                detail="Impacta la lectura de resultados y la liquidacion."
              />
              <BarberStat
                label="Alquiler"
                value={formatARS(Number(alquilerBancoMensual) || 0)}
                detail="Solo se cobra en el esquema hibrido."
              />
              <BarberStat
                label="Accion rapida"
                value={`${servicioDefecto?.nombre ?? "Sin servicio"} · ${medioPagoDefecto?.nombre ?? "Sin medio"}`}
                detail="Defaults que aceleran la carga en caja."
              />
            </div>

          </div>
        </div>
      </section>

      <section className="panel-card rounded-[28px] p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">
          Reserva publica
        </p>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Desde aca dejamos listo el link de este barbero para la landing general de Area51 y, si
          queres, le sumamos una clave simple para filtrar el acceso publico.
        </p>

        <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4">
            <label className="flex items-start gap-3 rounded-[24px] border border-zinc-800 bg-zinc-950/40 p-4">
              <input
                name="publicReservaActiva"
                type="checkbox"
                checked={publicReservaActiva}
                onChange={(event) => setPublicReservaActiva(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-zinc-600 bg-zinc-900 text-[#8cff59] focus:ring-[#8cff59]"
              />
              <div>
                <p className="text-sm font-medium text-white">Publicar reserva para este barbero</p>
                <p className="mt-1 text-xs text-zinc-400">
                  Hace visible este perfil en `/reservar` y habilita su link directo.
                </p>
              </div>
            </label>

            <div className="flex flex-col gap-2">
              <label htmlFor="publicSlug" className="text-sm font-medium text-zinc-300">
                Slug publico
              </label>
              <input
                id="publicSlug"
                name="publicSlug"
                type="text"
                value={publicSlug}
                onChange={(event) => {
                  setPublicSlugEdited(true);
                  setPublicSlug(event.target.value);
                }}
                placeholder="Ej: pinky o gabote"
                className="min-h-[48px] w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-sm text-white placeholder:text-zinc-500 focus:border-[#8cff59]/60 focus:outline-none"
              />
              <p className="text-xs text-zinc-500">
                Lo usamos en el link directo del barbero. Ejemplo: `{publicLink}`.
              </p>
              {state.fieldErrors?.publicSlug ? (
                <p className="text-xs text-red-500">{state.fieldErrors.publicSlug}</p>
              ) : null}
            </div>

            <label className="flex items-start gap-3 rounded-[24px] border border-zinc-800 bg-zinc-950/40 p-4">
              <input
                name="publicReservaRequiresPassword"
                type="checkbox"
                checked={publicReservaRequiresPassword}
                onChange={(event) => setPublicReservaRequiresPassword(event.target.checked)}
                className="mt-1 h-4 w-4 rounded border-zinc-600 bg-zinc-900 text-[#8cff59] focus:ring-[#8cff59]"
              />
              <div>
                <p className="text-sm font-medium text-white">Pedir clave para reservar</p>
                <p className="mt-1 text-xs text-zinc-400">
                  Si el cliente ya entra con cuenta, la clave se salta. Si entra publico, la
                  necesitara antes de ver horarios y reservar.
                </p>
              </div>
            </label>

            <div className="flex flex-col gap-2">
              <label htmlFor="publicReservaPassword" className="text-sm font-medium text-zinc-300">
                Clave publica
              </label>
              <input
                id="publicReservaPassword"
                name="publicReservaPassword"
                type="text"
                value={publicReservaPassword}
                onChange={(event) => setPublicReservaPassword(event.target.value)}
                placeholder={
                  initialData?.publicReservaPasswordConfigured
                    ? "Deja vacio para conservar la actual"
                    : "Ej: area51-abril"
                }
                className="min-h-[48px] w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-sm text-white placeholder:text-zinc-500 focus:border-[#8cff59]/60 focus:outline-none"
              />
              <p className="text-xs text-zinc-500">
                {initialData?.publicReservaPasswordConfigured
                  ? "Si escribis una nueva, reemplaza la actual. Si desmarcas la clave, el acceso queda abierto."
                  : "Se guarda protegida y solo la usamos para habilitar el flujo publico."}
              </p>
              {state.fieldErrors?.publicReservaPassword ? (
                <p className="text-xs text-red-500">{state.fieldErrors.publicReservaPassword}</p>
              ) : null}
            </div>
          </div>

          <div className="rounded-[24px] bg-zinc-900 p-5 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
              Salida publica
            </p>
            <div className="mt-4 space-y-3">
              <BarberStat
                label="Estado"
                value={publicReservaActiva ? "Publica activa" : "No publicada"}
                detail="Controla si el barbero aparece en la landing general de reservas."
              />
              <BarberStat
                label="Link"
                value={publicLink}
                detail="Link directo para compartir por WhatsApp o redes."
              />
              <BarberStat
                label="Acceso"
                value={publicReservaRequiresPassword ? "Con clave o cuenta" : "Link abierto"}
                detail="Las cuentas logueadas entran sin clave."
                strong={publicReservaRequiresPassword}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          disabled={isPending}
          className="neon-button inline-flex min-h-[52px] flex-1 items-center justify-center rounded-2xl px-5 text-sm font-semibold transition disabled:opacity-50"
        >
          {isPending ? "Guardando..." : submitLabel}
        </button>
        <Link
          href={cancelHref}
          className="inline-flex min-h-[52px] items-center justify-center rounded-2xl bg-zinc-800 px-5 text-sm font-medium text-zinc-300 transition hover:bg-zinc-700"
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
  detail,
}: {
  label: string;
  value: string;
  strong?: boolean;
  detail?: string;
}) {
  return (
    <div className={`rounded-[18px] px-4 py-3 ${strong ? "bg-white/12" : "bg-white/6"}`}>
      <p className="text-xs uppercase tracking-[0.16em] text-zinc-400">{label}</p>
      <p className={`mt-2 ${strong ? "text-xl font-semibold" : "text-base font-medium"} text-white`}>
        {value}
      </p>
      {detail ? <p className="mt-1 text-xs text-zinc-400">{detail}</p> : null}
    </div>
  );
}
