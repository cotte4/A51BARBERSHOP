"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { AtencionFormState } from "@/app/(barbero)/caja/actions";

interface AtencionFormProps {
  action: (
    prevState: AtencionFormState,
    formData: FormData
  ) => Promise<AtencionFormState>;
  barberosList: Array<{
    id: string;
    nombre: string;
    porcentajeComision: string | null;
  }>;
  serviciosList: Array<{
    id: string;
    nombre: string;
    precioBase: string | null;
  }>;
  adicionalesList: Array<{
    id: string;
    servicioId: string | null;
    nombre: string;
    precioExtra: string | null;
  }>;
  mediosPagoList: Array<{
    id: string;
    nombre: string | null;
    comisionPorcentaje: string | null;
  }>;
  preselectedBarberoId?: string;
  isAdmin: boolean;
  initialData?: {
    barberoId?: string;
    servicioId?: string;
    adicionalesIds?: string[];
    precioCobrado?: string;
    medioPagoId?: string;
    notas?: string | null;
  };
  submitLabel?: string;
  cancelHref?: string;
}

function formatARS(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(value);
}

function getBarberoEmoji(nombre: string): string {
  const normalized = nombre.toLowerCase();
  if (normalized.includes("pinky")) return "👽";
  if (normalized.includes("gabo") || normalized.includes("gabote")) return "🧔🏻";
  return "✂️";
}

function getServicioEmoji(nombre: string): string {
  const normalized = nombre.toLowerCase();
  if (normalized.includes("barba") && normalized.includes("corte")) return "👽";
  if (normalized.includes("barba")) return "🧔";
  if (normalized.includes("niño") || normalized.includes("nino")) return "👦";
  if (normalized.includes("ceja")) return "✨";
  if (normalized.includes("combo")) return "⚡";
  if (normalized.includes("corte")) return "✂️";
  return "🪄";
}

function getMedioPagoMeta(nombre: string | null) {
  const normalized = (nombre ?? "").toLowerCase();

  if (normalized.includes("efectivo")) {
    return { emoji: "💵", label: "Efectivo", order: 0 };
  }
  if (normalized.includes("transf")) {
    return { emoji: "📱", label: "Transferencia", order: 1 };
  }
  if (normalized.includes("posnet") || normalized.includes("tarjeta")) {
    return { emoji: "💳", label: "Posnet / Tarjeta", order: 2 };
  }
  if (normalized.includes("mercado") || normalized === "mp") {
    return { emoji: "📲", label: nombre ?? "Mercado Pago", order: 3 };
  }

  return { emoji: "💳", label: nombre ?? "Otro", order: 4 };
}

function getInitials(nombre: string): string {
  return nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function BarberoAvatarButton({
  active,
  locked,
  nombre,
  subtitle,
  emoji,
  onClick,
}: {
  active: boolean;
  locked?: boolean;
  nombre: string;
  subtitle: string;
  emoji: string;
  onClick?: () => void;
}) {
  const classes = active
    ? "border-emerald-400 bg-emerald-400 text-emerald-950 shadow-[0_20px_40px_rgba(16,185,129,0.22)]"
    : "border-stone-200 bg-white text-stone-900 hover:-translate-y-0.5 hover:border-stone-300 hover:bg-stone-50";

  const content = (
    <>
      <div
        className={`relative flex h-20 w-20 items-center justify-center rounded-full border text-xl font-semibold ${
          active
            ? "border-emerald-950/10 bg-emerald-950/10 text-emerald-950"
            : "border-stone-200 bg-stone-100 text-stone-700"
        }`}
      >
        <span>{getInitials(nombre)}</span>
        <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border border-white bg-stone-950 text-sm text-white">
          {emoji}
        </span>
      </div>
      <div className="mt-4 text-center">
        <p className="text-base font-semibold">{nombre}</p>
        <p className={`mt-1 text-sm ${active ? "text-emerald-950/80" : "text-stone-500"}`}>
          {subtitle}
        </p>
      </div>
    </>
  );

  if (locked) {
    return (
      <div className={`rounded-[28px] border p-4 transition ${classes}`}>
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[28px] border p-4 transition ${classes}`}
    >
      {content}
    </button>
  );
}

export default function AtencionForm({
  action,
  barberosList,
  serviciosList,
  adicionalesList,
  mediosPagoList,
  preselectedBarberoId,
  isAdmin,
  initialData,
  submitLabel = "Confirmar",
  cancelHref = "/caja",
}: AtencionFormProps) {
  const [barberoId, setBarberoId] = useState(initialData?.barberoId ?? preselectedBarberoId ?? "");
  const [servicioId, setServicioId] = useState(initialData?.servicioId ?? "");
  const [adicionalesSeleccionados, setAdicionalesSeleccionados] = useState<string[]>(
    initialData?.adicionalesIds ?? []
  );
  const [precioCobrado, setPrecioCobrado] = useState(initialData?.precioCobrado ?? "");
  const [medioPagoId, setMedioPagoId] = useState(initialData?.medioPagoId ?? "");
  const [allowManualPrice, setAllowManualPrice] = useState(false);

  const [state, formAction, isPending] = useActionState(action, {});
  const shouldSkipInitialAutofill = useRef(
    initialData?.precioCobrado !== undefined && initialData?.precioCobrado !== ""
  );

  const serviciosOrdenados = [...serviciosList].sort((a, b) => a.nombre.localeCompare(b.nombre));
  const mediosPagoOrdenados = [...mediosPagoList].sort((a, b) => {
    const left = getMedioPagoMeta(a.nombre).order;
    const right = getMedioPagoMeta(b.nombre).order;
    if (left !== right) return left - right;
    return (a.nombre ?? "").localeCompare(b.nombre ?? "");
  });

  const servicioSeleccionado = serviciosList.find((item) => item.id === servicioId);
  const barberoSeleccionado = barberosList.find((item) => item.id === barberoId);
  const medioPagoSeleccionado = mediosPagoList.find((item) => item.id === medioPagoId);
  const adicionalesDelServicio = adicionalesList.filter((item) => item.servicioId === servicioId);
  const precioSugerido =
    Number(servicioSeleccionado?.precioBase ?? 0) +
    adicionalesSeleccionados.reduce((sum, adicionalId) => {
      const adicional = adicionalesList.find((item) => item.id === adicionalId);
      return sum + Number(adicional?.precioExtra ?? 0);
    }, 0);

  useEffect(() => {
    if (!servicioId) return;

    if (shouldSkipInitialAutofill.current) {
      shouldSkipInitialAutofill.current = false;
      setAllowManualPrice(
        initialData?.precioCobrado !== undefined &&
          initialData?.precioCobrado !== "" &&
          Number(initialData.precioCobrado) !== precioSugerido
      );
      return;
    }

    if (!allowManualPrice) {
      setPrecioCobrado(String(precioSugerido));
    }
  }, [allowManualPrice, precioSugerido, servicioId]);

  function selectServicio(nextServicioId: string) {
    setServicioId(nextServicioId);
    setAdicionalesSeleccionados([]);
    setAllowManualPrice(false);
    const servicio = serviciosList.find((item) => item.id === nextServicioId);
    setPrecioCobrado(String(Number(servicio?.precioBase ?? 0)));
  }

  function toggleAdicional(id: string) {
    setAdicionalesSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function resetAutomaticPrice() {
    setAllowManualPrice(false);
    setPrecioCobrado(String(precioSugerido));
  }

  const precio = Number(precioCobrado) || 0;
  const comisionMpPct = Number(medioPagoSeleccionado?.comisionPorcentaje ?? 0);
  const comisionMpMonto = (precio * comisionMpPct) / 100;
  const montoNeto = precio - comisionMpMonto;
  const comisionBarberoPct = Number(barberoSeleccionado?.porcentajeComision ?? 0);
  const comisionBarberoMonto = (precio * comisionBarberoPct) / 100;
  const mostrarPreview = precio > 0 && medioPagoId !== "";
  const barberoBloqueado = !isAdmin && Boolean(preselectedBarberoId);
  const barberosVisibles = barberoBloqueado
    ? barberosList.filter((item) => item.id === barberoId)
    : barberosList;
  const precioEditado = allowManualPrice && precioCobrado !== "" && precio !== precioSugerido;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state.error ? (
        <div className="rounded-[24px] border border-rose-500/35 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {state.error}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-[30px] bg-stone-950 text-stone-50 shadow-[0_24px_80px_rgba(28,25,23,0.18)]">
        <div className="bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.28),_transparent_32%),radial-gradient(circle_at_bottom_left,_rgba(14,165,233,0.18),_transparent_28%)] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-300">
                Smart POS
              </p>
              <h3 className="mt-2 text-3xl font-semibold tracking-tight">
                Servicio, pago y listo.
              </h3>
              <p className="mt-2 text-sm leading-6 text-stone-300">
                Tocá un servicio, elegí cómo pagó y registrá la atención en segundos. El precio se completa solo.
              </p>
            </div>

            <div className="grid min-w-[260px] gap-3 sm:grid-cols-3">
              <div className="rounded-[24px] bg-white/10 p-4 backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-300">
                  Barbero
                </p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {barberoSeleccionado?.nombre ?? "Elegir"}
                </p>
              </div>
              <div className="rounded-[24px] bg-white/10 p-4 backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-300">
                  Servicio
                </p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {servicioSeleccionado?.nombre ?? "Elegir"}
                </p>
              </div>
              <div className="rounded-[24px] bg-emerald-400 p-4 text-emerald-950">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-900/80">
                  Cobro
                </p>
                <p className="mt-2 text-2xl font-bold">
                  {formatARS(servicioId ? precio : 0)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="panel-card rounded-[30px] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow text-xs font-semibold">
              Paso 1
            </p>
            <h3 className="font-display mt-2 text-2xl font-semibold text-white">Barbero</h3>
            <p className="mt-1 text-sm text-zinc-400">
              {barberoBloqueado
                ? "Tu perfil ya viene seleccionado."
                : "Elegí quién está atendiendo con un toque."}
            </p>
          </div>
          {state.fieldErrors?.barberoId ? (
            <p className="text-sm text-rose-300">{state.fieldErrors.barberoId}</p>
          ) : null}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {barberosVisibles.map((item) => (
            <BarberoAvatarButton
              key={item.id}
              active={barberoId === item.id}
              locked={barberoBloqueado}
              nombre={item.nombre}
              subtitle={
                item.id === preselectedBarberoId && !isAdmin
                  ? "Sesión activa"
                  : Number(item.porcentajeComision ?? 0) > 0
                    ? `${item.porcentajeComision}% comisión`
                    : "Listo para cobrar"
              }
              emoji={getBarberoEmoji(item.nombre)}
              onClick={() => setBarberoId(item.id)}
            />
          ))}
        </div>
        <input type="hidden" name="barberoId" value={barberoId} />
      </section>

      <section className="panel-card rounded-[30px] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow text-xs font-semibold">
              Paso 2
            </p>
            <h3 className="font-display mt-2 text-2xl font-semibold text-white">Servicio</h3>
            <p className="mt-1 text-sm text-zinc-400">
              Cada botón ya muestra el precio. Al tocarlo, el cobro se llena automáticamente.
            </p>
          </div>
          {state.fieldErrors?.servicioId ? (
            <p className="text-sm text-rose-300">{state.fieldErrors.servicioId}</p>
          ) : null}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {serviciosOrdenados.map((servicio) => {
            const active = servicioId === servicio.id;
            return (
              <button
                key={servicio.id}
                type="button"
                onClick={() => selectServicio(servicio.id)}
                className={`rounded-[26px] border p-5 text-left transition ${
                  active
                    ? "border-emerald-400 bg-emerald-400 text-emerald-950 shadow-[0_20px_40px_rgba(16,185,129,0.22)]"
                    : "border-stone-200 bg-white text-stone-900 hover:-translate-y-0.5 hover:border-stone-300 hover:bg-stone-50"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${active ? "text-emerald-950/80" : "text-stone-500"}`}>
                      {getServicioEmoji(servicio.nombre)} Servicio
                    </p>
                    <p className="mt-3 text-xl font-semibold leading-tight">{servicio.nombre}</p>
                  </div>
                  <span className="rounded-full bg-stone-950 px-3 py-1 text-xs font-semibold text-white">
                    {formatARS(Number(servicio.precioBase ?? 0))}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
        <input type="hidden" name="servicioId" value={servicioId} />

        {adicionalesDelServicio.length > 0 ? (
          <div className="mt-5 rounded-[26px] border border-zinc-800 bg-zinc-950/25 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">Extras del servicio</p>
                <p className="mt-1 text-sm text-zinc-400">
                  Sumalos con un toque y el precio total se recalcula.
                </p>
              </div>
              <div className="rounded-full bg-zinc-950 px-3 py-1 text-sm font-medium text-zinc-200 ring-1 ring-zinc-800">
                Total sugerido {formatARS(precioSugerido)}
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {adicionalesDelServicio.map((adicional) => {
                const checked = adicionalesSeleccionados.includes(adicional.id);
                return (
                  <button
                    key={adicional.id}
                    type="button"
                    onClick={() => toggleAdicional(adicional.id)}
                    className={`rounded-[22px] border px-4 py-4 text-left transition ${
                      checked
                        ? "border-emerald-300 bg-emerald-50 text-emerald-950"
                        : "border-stone-200 bg-white text-stone-700 hover:border-stone-300"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{adicional.nombre}</p>
                        <p className="mt-1 text-sm opacity-80">
                          +{formatARS(Number(adicional.precioExtra ?? 0))}
                        </p>
                      </div>
                      <span className="text-xl">{checked ? "✓" : "+"}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {adicionalesSeleccionados.map((id) => (
              <input key={id} type="hidden" name="adicionalesIds" value={id} />
            ))}
          </div>
        ) : null}

        <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[26px] border border-stone-200 bg-stone-950 p-5 text-stone-50">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-300">
                  Precio cobrado
                </p>
                <p className="mt-2 text-3xl font-bold">{formatARS(precio)}</p>
                <p className="mt-2 text-sm text-stone-300">
                  {allowManualPrice
                    ? "Ajuste manual activo. Usalo solo si hay descuento o una excepción."
                    : "Bloqueado en automático. Solo se habilita si querés aplicar un descuento."}
                </p>
              </div>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-stone-200">
                {precioEditado ? "Manual" : "Auto"}
              </span>
            </div>
          </div>

          <div className="rounded-[26px] border border-zinc-800 bg-zinc-950/30 p-4">
            <label htmlFor="precioCobrado" className="text-sm font-medium text-zinc-300">
              Descuento o ajuste
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setAllowManualPrice((prev) => !prev)}
                className={`inline-flex min-h-[48px] items-center justify-center rounded-2xl px-4 text-sm font-semibold transition ${
                  allowManualPrice
                    ? "neon-button"
                    : "border border-zinc-700 bg-zinc-950 text-zinc-300 hover:bg-zinc-900"
                }`}
              >
                {allowManualPrice ? "Bloquear precio otra vez" : "Habilitar ajuste manual"}
              </button>
              {allowManualPrice ? (
                <button
                  type="button"
                  onClick={resetAutomaticPrice}
                  className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-950 px-4 text-sm font-medium text-zinc-300 transition hover:bg-zinc-900"
                >
                  Volver al valor sugerido
                </button>
              ) : null}
            </div>

            <div className="relative mt-4">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                $
              </span>
              <input
                id="precioCobrado"
                name="precioCobrado"
                type="number"
                min="0"
                step="1"
                value={precioCobrado}
                disabled={!allowManualPrice}
                onChange={(event) => setPrecioCobrado(event.target.value)}
                placeholder="0"
                className="h-14 w-full rounded-2xl border border-zinc-700 bg-zinc-950 pl-8 pr-4 text-lg font-semibold text-white outline-none transition disabled:cursor-not-allowed disabled:bg-zinc-900 disabled:text-zinc-500 focus:border-[#8cff59]"
              />
            </div>

            {!allowManualPrice ? (
              <p className="mt-2 text-xs text-zinc-400">
                Primero elegí el servicio. Después activá este campo solo si necesitás cobrar menos o más.
              </p>
            ) : null}

            {state.fieldErrors?.precioCobrado ? (
              <p className="mt-2 text-xs text-rose-300">{state.fieldErrors.precioCobrado}</p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="panel-card rounded-[30px] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow text-xs font-semibold">
              Paso 3
            </p>
            <h3 className="font-display mt-2 text-2xl font-semibold text-white">Medio de pago</h3>
            <p className="mt-1 text-sm text-zinc-400">
              Los más usados van primero para que el toque sea inmediato.
            </p>
          </div>
          {state.fieldErrors?.medioPagoId ? (
            <p className="text-sm text-rose-300">{state.fieldErrors.medioPagoId}</p>
          ) : null}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {mediosPagoOrdenados.map((medio) => {
            const meta = getMedioPagoMeta(medio.nombre);
            const fee = Number(medio.comisionPorcentaje ?? 0);
            const active = medioPagoId === medio.id;

            return (
              <button
                key={medio.id}
                type="button"
                onClick={() => setMedioPagoId(medio.id)}
                className={`rounded-[24px] border px-5 py-5 text-left transition ${
                  active
                    ? "border-stone-950 bg-stone-950 text-white shadow-[0_18px_35px_rgba(28,25,23,0.18)]"
                    : "border-stone-200 bg-white text-stone-900 hover:-translate-y-0.5 hover:border-stone-300 hover:bg-stone-50"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={`text-sm font-semibold ${active ? "text-stone-300" : "text-stone-500"}`}>
                      Medio de pago
                    </p>
                    <p className="mt-3 text-xl font-semibold">{meta.emoji} {meta.label}</p>
                    <p className={`mt-2 text-sm ${active ? "text-stone-300" : "text-stone-500"}`}>
                      {fee > 0 ? `${fee}% de comisión` : "Sin comisión"}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <input type="hidden" name="medioPagoId" value={medioPagoId} />
      </section>

      {mostrarPreview ? (
        <section className="rounded-[30px] border border-stone-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-400">
                Resumen express
              </p>
              <h3 className="mt-2 text-2xl font-semibold text-stone-950">
                Todo listo para guardar
              </h3>
            </div>
            <div className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200">
              {barberoSeleccionado?.nombre ?? "Sin barbero"} • {medioPagoSeleccionado?.nombre ?? "Sin medio"}
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-[22px] bg-stone-100 p-4">
              <p className="text-xs font-medium text-stone-500">Cobrado</p>
              <p className="mt-2 text-2xl font-bold text-stone-950">{formatARS(precio)}</p>
            </div>
            <div className="rounded-[22px] bg-stone-100 p-4">
              <p className="text-xs font-medium text-stone-500">Neto</p>
              <p className="mt-2 text-2xl font-bold text-stone-950">{formatARS(montoNeto)}</p>
            </div>
            <div className="rounded-[22px] bg-stone-100 p-4">
              <p className="text-xs font-medium text-stone-500">Comisión barbero</p>
              <p className="mt-2 text-2xl font-bold text-stone-950">
                {formatARS(comisionBarberoMonto)}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-[22px] border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
            <div className="flex items-center justify-between gap-3">
              <span>Servicio</span>
              <span className="font-medium text-stone-900">{servicioSeleccionado?.nombre ?? "-"}</span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span>Medio de pago</span>
              <span className="font-medium text-stone-900">{medioPagoSeleccionado?.nombre ?? "-"}</span>
            </div>
            {comisionMpPct > 0 ? (
              <div className="mt-2 flex items-center justify-between gap-3">
                <span>Comisión del medio ({comisionMpPct}%)</span>
                <span className="font-medium text-stone-900">-{formatARS(comisionMpMonto)}</span>
              </div>
            ) : null}
            {barberoSeleccionado && comisionBarberoPct > 0 ? (
              <div className="mt-2 flex items-center justify-between gap-3">
                <span>{barberoSeleccionado.nombre} ({comisionBarberoPct}%)</span>
                <span className="font-medium text-stone-900">{formatARS(comisionBarberoMonto)}</span>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="panel-card rounded-[30px] p-5">
        <label htmlFor="notas" className="text-sm font-medium text-zinc-300">
          Notas
          <span className="ml-2 text-xs text-zinc-500">(opcional)</span>
        </label>
        <textarea
          id="notas"
          name="notas"
          rows={3}
          defaultValue={initialData?.notas ?? ""}
          placeholder="Ej: descuento por cliente frecuente"
          className="mt-3 w-full resize-none rounded-[22px] border border-zinc-700 bg-zinc-950/70 px-4 py-3 text-sm text-white outline-none focus:border-[#8cff59]"
        />
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          disabled={isPending}
          className="neon-button inline-flex min-h-[58px] flex-1 items-center justify-center rounded-[22px] px-6 text-base font-semibold disabled:opacity-50"
        >
          {isPending ? "Guardando..." : submitLabel}
        </button>
        <a
          href={cancelHref}
          className="ghost-button inline-flex min-h-[58px] items-center justify-center rounded-[22px] px-6 text-base font-medium"
        >
          Cancelar
        </a>
      </div>
    </form>
  );
}
