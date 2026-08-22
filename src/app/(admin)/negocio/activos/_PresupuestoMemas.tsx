"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { formatARS } from "@/lib/format";
import {
  PRESUPUESTO_CATEGORIAS,
  getFotoCropStyle,
  type PresupuestoScope,
} from "@/lib/presupuesto";
import AjustarFotoModal from "./_AjustarFotoModal";
import HangarUploadField from "./_HangarUploadField";
import {
  actualizarLineaPresupuestoAction,
  borrarLineaPresupuestoAction,
  crearLineaPresupuestoAction,
  type PresupuestoLineaFormState,
} from "./presupuesto-actions";

export type PresupuestoLineaView = {
  id: string;
  categoria: string;
  nombre: string;
  montoEstimado: number;
  notas: string | null;
  fotoUrl: string | null;
  fotoPos: string | null;
  fotoZoom: string | null;
  comprobanteUrl: string | null;
};

const initialState: PresupuestoLineaFormState = {};

function getCategoryTone(categoria: string) {
  switch (categoria) {
    case "Inmueble":
      return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
    case "Obra":
      return "border-orange-400/30 bg-orange-400/10 text-orange-200";
    case "Habilitaciones":
      return "border-violet-400/30 bg-violet-400/10 text-violet-200";
    case "Equipamiento":
      return "border-sky-400/30 bg-sky-400/10 text-sky-200";
    case "Mobiliario":
      return "border-cyan-400/30 bg-cyan-400/10 text-cyan-200";
    default:
      return "border-zinc-700 bg-zinc-800/80 text-zinc-200";
  }
}

export default function PresupuestoMemas({
  scope,
  nombre,
  lineas,
  total,
}: {
  scope: PresupuestoScope;
  nombre: string;
  lineas: PresupuestoLineaView[];
  total: number;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<string | null>(null);

  // Categorias con items, en el orden canonico, con su subtotal.
  const categoriasConItems = useMemo(() => {
    return PRESUPUESTO_CATEGORIAS.map((categoria) => {
      const items = lineas.filter((linea) => linea.categoria === categoria);
      return {
        categoria,
        count: items.length,
        subtotal: items.reduce((sum, linea) => sum + linea.montoEstimado, 0),
      };
    }).filter((grupo) => grupo.count > 0);
  }, [lineas]);

  const visibles = useMemo(
    () => (filtro ? lineas.filter((linea) => linea.categoria === filtro) : lineas),
    [lineas, filtro]
  );

  const totalVisible = useMemo(
    () => visibles.reduce((sum, linea) => sum + linea.montoEstimado, 0),
    [visibles]
  );

  const filtrando = filtro !== null;

  return (
    <div className="app-shell min-h-screen pb-24">
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[34px] border border-zinc-800/80 bg-[radial-gradient(circle_at_top_right,_rgba(140,255,89,0.18),_transparent_28%),radial-gradient(circle_at_bottom_left,_rgba(56,189,248,0.08),_transparent_24%),linear-gradient(180deg,_rgba(24,24,27,0.98),_rgba(9,9,11,0.98))] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.35)] sm:p-7">
          <div className="space-y-5">
            <div className="space-y-3">
              <p className="eyebrow text-xs font-semibold">Hangar / Presupuesto</p>
              <h1 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                {nombre}
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-zinc-300 sm:text-base">
                Inversion inicial de una vez: inmueble, obra y puesta en marcha. Es una
                proyeccion para negociar — no impacta el capital ni las finanzas de A51.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/negocio/activos"
                className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs font-semibold text-zinc-400 transition hover:border-zinc-700 hover:text-zinc-200"
              >
                Activos A51
              </Link>
              <span className="rounded-full border border-[#8cff59]/30 bg-[#8cff59]/10 px-3 py-1 text-xs font-semibold text-[#b9ff96]">
                Presupuesto Memas
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <HeroStat
                label={filtrando ? `Total ${filtro}` : "Total presupuestado"}
                value={formatARS(filtrando ? totalVisible : total)}
                helper={
                  filtrando
                    ? `de ${formatARS(total)} · ${Math.round((totalVisible / (total || 1)) * 100)}% del total`
                    : "Suma de todas las lineas cargadas"
                }
                accent
              />
              <HeroStat
                label={filtrando ? "Items filtrados" : "Lineas"}
                value={`${visibles.length}`}
                helper={
                  filtrando
                    ? `de ${lineas.length} lineas en total`
                    : `${categoriasConItems.length} categoria${categoriasConItems.length === 1 ? "" : "s"} con items`
                }
              />
              <HeroStat
                label="Impacto en A51"
                value="$0"
                helper="Un presupuesto no mueve capital ni Finanzas"
              />
            </div>

            {categoriasConItems.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                <FiltroChip
                  label="Todo"
                  count={lineas.length}
                  monto={total}
                  active={!filtrando}
                  onClick={() => setFiltro(null)}
                />
                {categoriasConItems.map((grupo) => (
                  <FiltroChip
                    key={grupo.categoria}
                    label={grupo.categoria}
                    count={grupo.count}
                    monto={grupo.subtotal}
                    active={filtro === grupo.categoria}
                    onClick={() =>
                      setFiltro((prev) => (prev === grupo.categoria ? null : grupo.categoria))
                    }
                  />
                ))}
              </div>
            ) : null}

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm((prev) => !prev);
                  setEditingId(null);
                }}
                className="neon-button inline-flex min-h-[42px] items-center rounded-[16px] px-4 text-sm font-semibold"
              >
                {showForm ? "Cerrar" : "+ Nueva linea"}
              </button>
            </div>
          </div>
        </section>

        {showForm ? (
          <section className="mt-5 rounded-[30px] border border-zinc-800/80 bg-[linear-gradient(180deg,rgba(24,24,27,0.96),rgba(9,9,11,0.98))] p-5">
            <h2 className="font-display text-xl font-semibold text-white">Nueva linea</h2>
            <LineaForm
              scope={scope}
              action={crearLineaPresupuestoAction}
              submitLabel="Agregar linea"
              categoriaSugerida={filtro}
              onDone={() => setShowForm(false)}
            />
          </section>
        ) : null}

        {lineas.length === 0 ? (
          <section className="panel-card mt-5 rounded-[30px] p-6 text-center">
            <p className="text-sm text-zinc-400">
              Todavia no hay lineas cargadas. Arranca por el inmueble y la obra.
            </p>
          </section>
        ) : (
          <section className="mt-5 space-y-3">
            {visibles.map((linea) =>
              editingId === linea.id ? (
                <div
                  key={linea.id}
                  className="rounded-[26px] border border-[#8cff59]/25 bg-zinc-950/80 p-5"
                >
                  <h2 className="font-display text-lg font-semibold text-white">
                    Editar linea
                  </h2>
                  <LineaForm
                    scope={scope}
                    action={actualizarLineaPresupuestoAction}
                    submitLabel="Guardar cambios"
                    linea={linea}
                    onDone={() => setEditingId(null)}
                    onCancel={() => setEditingId(null)}
                  />
                </div>
              ) : (
                <LineaRow
                  key={linea.id}
                  scope={scope}
                  linea={linea}
                  onEdit={() => {
                    setEditingId(linea.id);
                    setShowForm(false);
                  }}
                />
              )
            )}

            <section className="rounded-[30px] border border-[#8cff59]/22 bg-[#8cff59]/10 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">
                    {filtrando ? `Subtotal ${filtro}` : "Total inversion Memas"}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {visibles.length} linea{visibles.length === 1 ? "" : "s"}
                    {filtrando ? ` · total general ${formatARS(total)}` : " · CAPEX puntual"}
                  </p>
                </div>
                <p className="text-3xl font-semibold text-[#b9ff96]">
                  {formatARS(filtrando ? totalVisible : total)}
                </p>
              </div>
            </section>
          </section>
        )}
      </main>
    </div>
  );
}

function LineaRow({
  scope,
  linea,
  onEdit,
}: {
  scope: PresupuestoScope;
  linea: PresupuestoLineaView;
  onEdit: () => void;
}) {
  const [ajustando, setAjustando] = useState(false);
  const [hover, setHover] = useState(false);
  // El hover multiplica sobre el recorte guardado en vez de reemplazarlo, para
  // que acercarse no pierda el encuadre elegido.
  const cropStyle = getFotoCropStyle(linea.fotoPos, linea.fotoZoom, hover ? 1.35 : 1);

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-[26px] border border-zinc-800 bg-zinc-950/70 p-4 transition hover:border-[#8cff59]/25">
      {linea.fotoUrl ? (
        <button
          type="button"
          onClick={() => setAjustando(true)}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          title="Ajustar encuadre y recorte"
          className="group relative h-16 w-16 shrink-0 overflow-hidden rounded-[20px] border border-zinc-800 bg-zinc-900"
        >
          <Image
            src={linea.fotoUrl}
            alt={linea.nombre}
            fill
            sizes="64px"
            style={cropStyle}
            className="object-cover transition-transform duration-200"
          />
          <span className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/70 to-transparent pb-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-white opacity-0 transition group-hover:opacity-100">
            Ajustar
          </span>
        </button>
      ) : (
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[20px] border border-zinc-800 bg-zinc-900">
          <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
            {linea.categoria.slice(0, 3)}
          </div>
        </div>
      )}

      {ajustando && linea.fotoUrl ? (
        <AjustarFotoModal
          scope={scope}
          lineaId={linea.id}
          nombre={linea.nombre}
          fotoUrl={linea.fotoUrl}
          fotoPos={linea.fotoPos}
          fotoZoom={linea.fotoZoom}
          onClose={() => setAjustando(false)}
        />
      ) : null}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-base font-semibold text-white">{linea.nombre}</p>
          <span
            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${getCategoryTone(linea.categoria)}`}
          >
            {linea.categoria}
          </span>
          {linea.comprobanteUrl ? (
            <a
              href={linea.comprobanteUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-0.5 text-[11px] font-semibold text-zinc-300 hover:border-[#8cff59]/40 hover:text-[#b9ff96]"
            >
              Ver recibo
            </a>
          ) : null}
        </div>
        <p className="mt-1 truncate text-sm text-zinc-500">{linea.notas || "Sin notas"}</p>
      </div>

      <div className="flex items-center gap-3">
        <p className="text-lg font-semibold text-white">{formatARS(linea.montoEstimado)}</p>
        <button
          type="button"
          onClick={onEdit}
          className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-xs font-semibold text-zinc-300 transition hover:border-[#8cff59]/40 hover:text-[#b9ff96]"
        >
          Editar
        </button>
        <BorrarLineaButton scope={scope} lineaId={linea.id} />
      </div>
    </div>
  );
}

function FiltroChip({
  label,
  count,
  monto,
  active,
  onClick,
}: {
  label: string;
  count: number;
  monto: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
        active
          ? "border-[#8cff59]/30 bg-[#8cff59]/10 text-[#b9ff96]"
          : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
      }`}
    >
      {label}
      <span className={active ? "ml-2 text-[#8cff59]/70" : "ml-2 text-zinc-600"}>
        {count} · {formatARS(monto)}
      </span>
    </button>
  );
}

function LineaForm({
  scope,
  action,
  submitLabel,
  linea,
  categoriaSugerida,
  onDone,
  onCancel,
}: {
  scope: PresupuestoScope;
  action: (
    prevState: PresupuestoLineaFormState,
    formData: FormData
  ) => Promise<PresupuestoLineaFormState>;
  submitLabel: string;
  linea?: PresupuestoLineaView;
  categoriaSugerida?: string | null;
  onDone?: () => void;
  onCancel?: () => void;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  // El server action ya revalido la ruta; al confirmar, cerramos el form.
  useEffect(() => {
    if (state.success) {
      onDone?.();
    }
  }, [state.success, onDone]);

  const defaultCategoria =
    linea?.categoria ?? categoriaSugerida ?? PRESUPUESTO_CATEGORIAS[0];

  return (
    <form action={formAction} className="mt-4 flex flex-col gap-4">
      <input type="hidden" name="scope" value={scope} />
      {linea ? <input type="hidden" name="lineaId" value={linea.id} /> : null}

      {state.error ? (
        <div className="rounded-2xl border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {state.error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-zinc-300">Nombre</label>
          <input
            name="nombre"
            defaultValue={linea?.nombre ?? ""}
            placeholder="Ej: Alquiler llave del local"
            className="min-h-[44px] rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-sm text-white outline-none focus:border-[#8cff59]/60"
          />
          {state.fieldErrors?.nombre ? (
            <p className="text-xs text-red-400">{state.fieldErrors.nombre}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-zinc-300">Categoria</label>
          <select
            name="categoria"
            defaultValue={defaultCategoria}
            className="min-h-[44px] rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-sm text-white outline-none focus:border-[#8cff59]/60"
          >
            {PRESUPUESTO_CATEGORIAS.map((categoria) => (
              <option key={categoria} value={categoria}>
                {categoria}
              </option>
            ))}
          </select>
          {state.fieldErrors?.categoria ? (
            <p className="text-xs text-red-400">{state.fieldErrors.categoria}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-zinc-300">Monto estimado (ARS)</label>
          <input
            name="montoEstimado"
            type="number"
            min="0"
            step="1"
            defaultValue={linea ? String(linea.montoEstimado) : ""}
            placeholder="0"
            className="min-h-[44px] rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-sm text-white outline-none focus:border-[#8cff59]/60"
          />
          {state.fieldErrors?.montoEstimado ? (
            <p className="text-xs text-red-400">{state.fieldErrors.montoEstimado}</p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-zinc-300">Notas (opcional)</label>
          <input
            name="notas"
            defaultValue={linea?.notas ?? ""}
            placeholder="Ej: incluye deposito y comision"
            className="min-h-[44px] rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-sm text-white outline-none focus:border-[#8cff59]/60"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <HangarUploadField
          name="fotoUrl"
          label="Foto"
          helper="JPG, PNG o WEBP hasta 8 MB."
          kind="photo"
          accept="image/jpeg,image/png,image/webp"
          initialValue={linea?.fotoUrl ?? null}
          assetId={`presupuesto-${linea?.id ?? "nueva"}`}
        />
        <HangarUploadField
          name="comprobanteUrl"
          label="Recibo / presupuesto"
          helper="JPG, PNG, WEBP o PDF hasta 8 MB."
          kind="receipt"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          initialValue={linea?.comprobanteUrl ?? null}
          assetId={`presupuesto-${linea?.id ?? "nueva"}`}
        />
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="ghost-button inline-flex min-h-[42px] items-center rounded-[16px] px-4 text-sm font-semibold"
          >
            Cancelar
          </button>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="neon-button inline-flex min-h-[42px] items-center rounded-[16px] px-4 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "Guardando..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

function BorrarLineaButton({
  scope,
  lineaId,
}: {
  scope: PresupuestoScope;
  lineaId: string;
}) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("scope", scope);
      formData.set("lineaId", lineaId);
      await borrarLineaPresupuestoAction(formData);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="rounded-full border border-zinc-600/50 bg-zinc-800/60 px-3 py-1 text-xs font-semibold text-zinc-400 transition hover:border-red-500/40 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isPending ? "..." : "Borrar"}
    </button>
  );
}

function HeroStat({
  label,
  value,
  helper,
  accent = false,
}: {
  label: string;
  value: string;
  helper: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-[24px] border p-4 ${accent ? "border-[#8cff59]/22 bg-[#8cff59]/10" : "border-zinc-800 bg-zinc-950/70"}`}
    >
      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className={`mt-2 text-2xl font-semibold ${accent ? "text-[#b9ff96]" : "text-white"}`}>
        {value}
      </p>
      <p className="mt-1 text-xs text-zinc-500">{helper}</p>
    </div>
  );
}
