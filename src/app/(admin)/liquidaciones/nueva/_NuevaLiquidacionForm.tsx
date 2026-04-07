"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
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
  const yesterday = shiftDays(today, -1);

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
      description: "Cierra el dia anterior en un toque.",
      getRange: () => ({
        inicio: formatDateInput(yesterday),
        fin: formatDateInput(yesterday),
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
  const presets = useMemo(() => buildPresets(), []);
  const todayRange = presets[0].getRange();
  const yesterdayRange = presets[1].getRange();

  const initialPreset = useMemo(() => {
    if (!initialFecha) return "today";
    if (initialFecha === todayRange.inicio) return "today";
    if (initialFecha === yesterdayRange.inicio) return "yesterday";
    return "custom";
  }, [initialFecha, todayRange.inicio, yesterdayRange.inicio]);

  const [barberoId, setBarberoId] = useState(initialBarberoId ?? "");
  const [periodoInicio, setPeriodoInicio] = useState(initialFecha || todayRange.inicio);
  const [periodoFin, setPeriodoFin] = useState(initialFecha || todayRange.fin);
  const [notas, setNotas] = useState("");
  const [activePreset, setActivePreset] = useState(initialPreset);

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
  const periodLabel = canPreview
    ? periodoInicio === periodoFin
      ? formatFechaHumana(periodoInicio)
      : `${formatFechaHumana(periodoInicio)} al ${formatFechaHumana(periodoFin)}`
    : "Define el barbero y el periodo para ver el resumen.";

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.error ? (
        <div className="rounded-[22px] border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {state.error}
        </div>
      ) : null}

      <section className="panel-card rounded-[28px] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow text-[10px]">Paso 1</p>
            <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white">
              Elegi a quien liquidar
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              Seleccion directa y visible para evitar dudas al cargar la liquidacion.
            </p>
          </div>
          <div className="panel-soft rounded-[22px] px-4 py-3 text-sm text-zinc-200">
            <p className="eyebrow text-[10px]">Liquidables</p>
            <p className="mt-2 font-display text-3xl font-semibold tracking-tight text-[#8cff59]">
              {barberosList.length}
            </p>
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
                aria-pressed={selected}
                onClick={() => setBarberoId(barbero.id)}
                className={`rounded-[24px] border px-4 py-4 text-left transition ${
                  selected
                    ? "border-[#8cff59]/40 bg-zinc-950 text-white shadow-[0_0_0_1px_rgba(140,255,89,0.12)]"
                    : "border-zinc-800 bg-black/20 text-zinc-100 hover:border-zinc-700 hover:bg-zinc-950"
                }`}
              >
                <span className="eyebrow block text-[10px]">Barbero</span>
                <span className="mt-2 block font-display text-xl font-semibold tracking-tight">
                  {barbero.nombre}
                </span>
                <span className={`mt-2 block text-sm ${selected ? "text-zinc-300" : "text-zinc-500"}`}>
                  Genera una liquidacion individual para este periodo.
                </span>
                {selected ? (
                  <span className="mt-3 inline-flex rounded-full border border-[#8cff59]/20 bg-[#8cff59]/10 px-2.5 py-1 text-[11px] font-semibold text-[#8cff59]">
                    Elegido
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {state.fieldErrors?.barberoId ? (
          <p className="mt-3 text-xs text-amber-300">{state.fieldErrors.barberoId}</p>
        ) : null}
      </section>

      <section className="panel-card rounded-[28px] p-5">
        <p className="eyebrow text-[10px]">Paso 2</p>
        <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white">
          Defini el periodo
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          El default es diario. Si necesitas otro rango, cambialo sin perder el contexto visual.
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
                    ? "border-[#8cff59]/40 bg-zinc-950 text-white"
                    : "border-zinc-800 bg-black/20 text-zinc-100 hover:border-zinc-700 hover:bg-zinc-950"
                }`}
              >
                <span className="block font-semibold">{preset.label}</span>
                <span className={`mt-2 block text-xs ${selected ? "text-zinc-300" : "text-zinc-500"}`}>
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
                ? "border-[#8cff59]/40 bg-zinc-950 text-white"
                : "border-zinc-800 bg-black/20 text-zinc-100 hover:border-zinc-700 hover:bg-zinc-950"
            }`}
          >
            <span className="block font-semibold">Personalizado</span>
            <span
              className={`mt-2 block text-xs ${activePreset === "custom" ? "text-zinc-300" : "text-zinc-500"}`}
            >
              Edita inicio y fin manualmente si necesitas un rango mayor a un dia.
            </span>
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <label htmlFor="periodoInicio" className="text-sm font-medium text-zinc-200">
              Desde <span className="text-amber-300">*</span>
            </label>
            <input
              id="periodoInicio"
              name="periodoInicio"
              type="date"
              value={periodoInicio}
              onChange={(event) => setPeriodoInicio(event.target.value)}
              className="min-h-[48px] rounded-xl border border-zinc-800 bg-zinc-950 px-4 text-sm text-white outline-none focus:border-[#8cff59]"
            />
            {state.fieldErrors?.periodoInicio ? (
              <p className="text-xs text-amber-300">{state.fieldErrors.periodoInicio}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="periodoFin" className="text-sm font-medium text-zinc-200">
              Hasta <span className="text-amber-300">*</span>
            </label>
            <input
              id="periodoFin"
              name="periodoFin"
              type="date"
              value={periodoFin}
              onChange={(event) => setPeriodoFin(event.target.value)}
              className="min-h-[48px] rounded-xl border border-zinc-800 bg-zinc-950 px-4 text-sm text-white outline-none focus:border-[#8cff59]"
            />
            {state.fieldErrors?.periodoFin ? (
              <p className="text-xs text-amber-300">{state.fieldErrors.periodoFin}</p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="panel-card rounded-[28px] p-5">
        <p className="eyebrow text-[10px]">Paso 3</p>
        <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white">
          Preview antes de generar
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          Confirmamos barbero, rango y contexto antes de crear el registro.
        </p>

        <div className="mt-5 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="panel-soft rounded-[24px] p-5">
            <p className="eyebrow text-[10px]">Liquidacion lista</p>
            <h3 className="mt-2 font-display text-3xl font-semibold tracking-tight text-white">
              {selectedBarbero ? selectedBarbero.nombre : "Elegi un barbero"}
            </h3>
            <p className="mt-2 text-sm text-zinc-300">{periodLabel}</p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <MiniCard label="Duracion" value={durationDays ? (durationDays === 1 ? "Liquidacion diaria" : `${durationDays} dias`) : "Pendiente"} />
              <MiniCard label="Modo" value={activePreset === "custom" ? "Personalizado" : presets.find((preset) => preset.id === activePreset)?.label ?? "Diario"} />
              <MiniCard
                label="Notas"
                value={notas.trim() ? "Se guardan con contexto extra" : "Sin notas adicionales"}
              />
              <MiniCard
                label="Estado"
                value={canPreview ? "Lista para generar" : "Incompleta"}
              />
            </div>
          </div>

          <div className="panel-soft rounded-[24px] p-5">
            <p className="eyebrow text-[10px]">Chequeo rapido</p>
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
                    : "Revisá el rango"
                }
                ok={Boolean(durationDays)}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="panel-card rounded-[28px] p-5">
        <label htmlFor="notas" className="text-sm font-medium text-zinc-200">
          Notas internas <span className="text-xs text-zinc-500">(opcional)</span>
        </label>
        <textarea
          id="notas"
          name="notas"
          rows={4}
          value={notas}
          onChange={(event) => setNotas(event.target.value)}
          placeholder="Ej: periodo con ajuste especial, adelanto previo o aclaracion para administracion."
          className="mt-2 w-full resize-none rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white outline-none focus:border-[#8cff59]"
        />

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <button
            type="submit"
            disabled={isPending}
            className="neon-button inline-flex min-h-[52px] flex-1 items-center justify-center rounded-2xl px-5 text-sm font-semibold disabled:opacity-50"
          >
            {isPending ? "Generando liquidacion..." : "Generar liquidacion"}
          </button>
          <Link
            href="/liquidaciones"
            className="ghost-button inline-flex min-h-[52px] items-center justify-center rounded-2xl px-5 text-sm font-semibold"
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
    <div className="flex items-center justify-between gap-3 rounded-[18px] border border-zinc-800 bg-zinc-950 px-4 py-3">
      <span className="text-zinc-500">{label}</span>
      <span className={`font-medium ${ok ? "text-white" : "text-amber-300"}`}>{value}</span>
    </div>
  );
}

function MiniCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[20px] border border-zinc-800 bg-zinc-950 px-4 py-3">
      <p className="eyebrow text-[10px]">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
