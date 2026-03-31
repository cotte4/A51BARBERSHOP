"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { generarLiquidacion } from "../actions";
import type { LiquidacionFormState } from "../actions";

interface Props {
  barberosList: Array<{ id: string; nombre: string }>;
  initialBarberoId?: string;
  initialFecha?: string;
}

const initialState: LiquidacionFormState = {};

type DatePreset = {
  id: string;
  label: string;
  description: string;
  getRange: () => { inicio: string; fin: string };
};

function formatDateInput(date: Date) {
  return date.toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

function shiftDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function buildPresets(): DatePreset[] {
  const today = new Date();

  return [
    {
      id: "today",
      label: "Hoy",
      description: "Liquidacion diaria del dia en curso.",
      getRange: () => ({
        inicio: formatDateInput(today),
        fin: formatDateInput(today),
      }),
    },
    {
      id: "yesterday",
      label: "Ayer",
      description: "Para cerrar el dia anterior en un toque.",
      getRange: () => ({
        inicio: formatDateInput(shiftDays(today, -1)),
        fin: formatDateInput(shiftDays(today, -1)),
      }),
    },
  ];
}

function formatFechaHumana(fecha: string) {
  if (!fecha) return "Sin fecha";
  const [year, month, day] = fecha.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  return parsed.toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

function getDaysBetween(inicio: string, fin: string) {
  if (!inicio || !fin) return null;
  const start = new Date(`${inicio}T12:00:00`);
  const end = new Date(`${fin}T12:00:00`);
  const diff = end.getTime() - start.getTime();
  if (Number.isNaN(diff) || diff < 0) return null;
  return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
}

export default function NuevaLiquidacionForm({
  barberosList,
  initialBarberoId,
  initialFecha,
}: Props) {
  const [state, formAction, isPending] = useActionState(generarLiquidacion, initialState);
  const presets = buildPresets();
  const todayRange = presets[0].getRange();
  const fechaInicial = initialFecha || todayRange.inicio;

  const [barberoId, setBarberoId] = useState(initialBarberoId ?? "");
  const [periodoInicio, setPeriodoInicio] = useState(fechaInicial);
  const [periodoFin, setPeriodoFin] = useState(fechaInicial);
  const [notas, setNotas] = useState("");
  const [activePreset, setActivePreset] = useState(
    initialFecha === presets[1].getRange().inicio ? "yesterday" : "today"
  );

  useEffect(() => {
    if (periodoInicio && periodoFin) {
      const matchingPreset = presets.find((preset) => {
        const range = preset.getRange();
        return range.inicio === periodoInicio && range.fin === periodoFin;
      });
      setActivePreset(matchingPreset?.id ?? "custom");
    }
  }, [periodoInicio, periodoFin, presets]);

  const selectedBarbero = barberosList.find((barbero) => barbero.id === barberoId);
  const durationDays = getDaysBetween(periodoInicio, periodoFin);
  const canPreview = Boolean(barberoId && periodoInicio && periodoFin);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state.error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      ) : null}

      <section className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-400">
              Paso 1
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-stone-950">
              Elegi a quien liquidar
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              Reemplazamos el dropdown por una seleccion directa y visible.
            </p>
          </div>
          <div className="rounded-2xl bg-stone-100 px-4 py-3 text-sm text-stone-600">
            {barberosList.length} barberos liquidables
          </div>
        </div>

        <input type="hidden" name="barberoId" value={barberoId} readOnly />

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {barberosList.map((barbero) => {
            const selected = barbero.id === barberoId;

            return (
              <button
                key={barbero.id}
                type="button"
                onClick={() => setBarberoId(barbero.id)}
                className={`rounded-[24px] border px-4 py-4 text-left transition ${
                  selected
                    ? "border-stone-900 bg-stone-900 text-white shadow-[0_18px_40px_rgba(28,25,23,0.18)]"
                    : "border-stone-200 bg-stone-50 text-stone-900 hover:border-stone-300 hover:bg-white"
                }`}
              >
                <span className="block text-xs font-semibold uppercase tracking-[0.18em] opacity-70">
                  Barbero
                </span>
                <span className="mt-2 block text-lg font-semibold">{barbero.nombre}</span>
                <span className={`mt-2 block text-sm ${selected ? "text-stone-300" : "text-stone-500"}`}>
                  Genera una liquidacion individual para este periodo.
                </span>
              </button>
            );
          })}
        </div>

        {state.fieldErrors?.barberoId ? (
          <p className="mt-2 text-xs text-red-500">{state.fieldErrors.barberoId}</p>
        ) : null}
      </section>

      <section className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-400">
          Paso 2
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-stone-950">Defini el periodo</h2>
        <p className="mt-1 text-sm text-stone-500">
          Por default es diario. Si necesitas un rango legacy, cambialo manualmente.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {presets.map((preset) => {
            const selected = activePreset === preset.id;

            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  const range = preset.getRange();
                  setPeriodoInicio(range.inicio);
                  setPeriodoFin(range.fin);
                  setActivePreset(preset.id);
                }}
                className={`rounded-[24px] border px-4 py-4 text-left transition ${
                  selected
                    ? "border-stone-900 bg-stone-900 text-white"
                    : "border-stone-200 bg-stone-50 text-stone-900 hover:border-stone-300 hover:bg-white"
                }`}
              >
                <span className="block text-sm font-semibold">{preset.label}</span>
                <span className={`mt-2 block text-xs ${selected ? "text-stone-300" : "text-stone-500"}`}>
                  {preset.description}
                </span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setActivePreset("custom")}
            className={`rounded-[24px] border px-4 py-4 text-left transition ${
              activePreset === "custom"
                ? "border-stone-900 bg-stone-900 text-white"
                : "border-stone-200 bg-stone-50 text-stone-900 hover:border-stone-300 hover:bg-white"
            }`}
          >
            <span className="block text-sm font-semibold">Personalizado</span>
            <span className={`mt-2 block text-xs ${activePreset === "custom" ? "text-stone-300" : "text-stone-500"}`}>
              Edita inicio y fin manualmente si necesitas un rango mayor a un dia.
            </span>
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label htmlFor="periodoInicio" className="text-sm font-medium text-stone-700">
              Desde <span className="text-red-500">*</span>
            </label>
            <input
              id="periodoInicio"
              name="periodoInicio"
              type="date"
              value={periodoInicio}
              onChange={(event) => setPeriodoInicio(event.target.value)}
              className="min-h-[48px] rounded-xl border border-stone-300 px-4 text-sm text-stone-900 outline-none focus:border-stone-900"
            />
            {state.fieldErrors?.periodoInicio ? (
              <p className="text-xs text-red-500">{state.fieldErrors.periodoInicio}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="periodoFin" className="text-sm font-medium text-stone-700">
              Hasta <span className="text-red-500">*</span>
            </label>
            <input
              id="periodoFin"
              name="periodoFin"
              type="date"
              value={periodoFin}
              onChange={(event) => setPeriodoFin(event.target.value)}
              className="min-h-[48px] rounded-xl border border-stone-300 px-4 text-sm text-stone-900 outline-none focus:border-stone-900"
            />
            {state.fieldErrors?.periodoFin ? (
              <p className="text-xs text-red-500">{state.fieldErrors.periodoFin}</p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-400">
          Paso 3
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-stone-950">Preview antes de generar</h2>
        <p className="mt-1 text-sm text-stone-500">
          La liquidacion se va a crear con este alcance. Si algo no cierra, corrige ahora.
        </p>

        <div className="mt-5 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[24px] bg-stone-950 p-5 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-300">
              Liquidacion lista
            </p>
            <p className="mt-3 text-2xl font-semibold tracking-tight">
              {selectedBarbero ? selectedBarbero.nombre : "Elegi un barbero"}
            </p>
            <p className="mt-2 text-sm text-stone-300">
              {canPreview
                ? periodoInicio === periodoFin
                  ? formatFechaHumana(periodoInicio)
                  : `${formatFechaHumana(periodoInicio)} al ${formatFechaHumana(periodoFin)}`
                : "Define el barbero y la fecha para ver el resumen completo."}
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[22px] bg-white/10 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-stone-300">Duracion</p>
                <p className="mt-2 text-lg font-semibold">
                  {durationDays
                    ? durationDays === 1
                      ? "Liquidacion diaria"
                      : `${durationDays} dias`
                    : "Pendiente"}
                </p>
              </div>
              <div className="rounded-[22px] bg-white/10 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-stone-300">Notas</p>
                <p className="mt-2 text-sm text-stone-100">
                  {notas.trim() ? "Se guardaran con contexto adicional." : "Sin notas adicionales."}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-stone-200 bg-stone-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-400">
              Chequeo rapido
            </p>
            <div className="mt-4 space-y-3 text-sm">
              <PreviewRow
                label="Barbero"
                value={selectedBarbero?.nombre ?? "Falta seleccionar"}
                ok={Boolean(selectedBarbero)}
              />
              <PreviewRow
                label="Fecha inicial"
                value={periodoInicio ? formatFechaHumana(periodoInicio) : "Falta seleccionar"}
                ok={Boolean(periodoInicio)}
              />
              <PreviewRow
                label="Fecha final"
                value={periodoFin ? formatFechaHumana(periodoFin) : "Falta seleccionar"}
                ok={Boolean(periodoFin)}
              />
              <PreviewRow
                label="Rango valido"
                value={
                  durationDays
                    ? durationDays === 1
                      ? "Liquidacion diaria"
                      : `${durationDays} dias incluidos`
                    : "Revisa el rango"
                }
                ok={Boolean(durationDays)}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
        <label htmlFor="notas" className="text-sm font-medium text-stone-700">
          Notas internas <span className="text-xs text-stone-400">(opcional)</span>
        </label>
        <textarea
          id="notas"
          name="notas"
          rows={3}
          value={notas}
          onChange={(event) => setNotas(event.target.value)}
          placeholder="Ej: periodo con ajuste especial, adelanto previo o aclaracion para administracion."
          className="mt-2 w-full rounded-xl border border-stone-300 px-4 py-3 text-sm text-stone-900 outline-none focus:border-stone-900 resize-none"
        />

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex min-h-[52px] flex-1 items-center justify-center rounded-2xl bg-stone-900 px-5 text-sm font-semibold text-white transition hover:bg-stone-700 disabled:opacity-50"
          >
            {isPending ? "Generando liquidacion..." : "Generar liquidacion"}
          </button>
          <Link
            href="/liquidaciones"
            className="inline-flex min-h-[52px] items-center justify-center rounded-2xl bg-stone-100 px-5 text-sm font-medium text-stone-700 transition hover:bg-stone-200"
          >
            Cancelar
          </Link>
        </div>
      </section>
    </form>
  );
}

function PreviewRow({
  label,
  value,
  ok,
}: {
  label: string;
  value: string;
  ok: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[18px] bg-white px-4 py-3 ring-1 ring-stone-200">
      <span className="text-stone-500">{label}</span>
      <span className={`font-medium ${ok ? "text-stone-900" : "text-amber-700"}`}>{value}</span>
    </div>
  );
}
