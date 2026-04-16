"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import type { VentaProductoFormState } from "@/app/(barbero)/caja/actions";

interface VentaProductoFormProps {
  action: (
    prevState: VentaProductoFormState,
    formData: FormData
  ) => Promise<VentaProductoFormState>;
  productosList: Array<{
    id: string;
    nombre: string;
    precioVenta: string | null;
    stockActual: number | null;
  }>;
  mediosPagoList: Array<{
    id: string;
    nombre: string | null;
    comisionPorcentaje: string | null;
  }>;
}

import { formatARS } from "@/lib/format";

const quickQuantities = [1, 2, 3];

function getProductoAccent(nombre: string) {
  const normalized = nombre.toLowerCase();
  if (normalized.includes("cafe")) return { icon: "CA", tone: "bg-amber-500/15 text-amber-300" };
  if (normalized.includes("pomada")) return { icon: "PO", tone: "bg-zinc-700 text-white" };
  if (normalized.includes("shampoo")) return { icon: "SH", tone: "bg-sky-500/15 text-sky-300" };
  if (normalized.includes("gel")) return { icon: "GE", tone: "bg-violet-500/15 text-violet-300" };
  if (normalized.includes("cera")) return { icon: "CE", tone: "bg-rose-500/15 text-rose-300" };
  return { icon: "PR", tone: "bg-emerald-500/15 text-emerald-300" };
}

function getMedioAccent(nombre: string | null | undefined) {
  const normalized = (nombre ?? "").toLowerCase();
  if (normalized.includes("efectivo")) return { icon: "EF", tone: "bg-emerald-500/15 text-emerald-300" };
  if (normalized.includes("transfer")) return { icon: "TR", tone: "bg-sky-500/15 text-sky-300" };
  if (normalized.includes("tarjeta") || normalized.includes("posnet")) {
    return { icon: "TJ", tone: "bg-violet-500/15 text-violet-300" };
  }
  if (normalized.includes("mercado") || normalized.includes("mp")) {
    return { icon: "MP", tone: "bg-cyan-500/15 text-cyan-300" };
  }
  return { icon: "PG", tone: "bg-zinc-700 text-zinc-300" };
}

function getStockTone(stockActual: number) {
  if (stockActual <= 1) return "text-red-300";
  if (stockActual <= 3) return "text-amber-300";
  return "text-zinc-300";
}

function FieldShell({
  label,
  description,
  error,
  children,
}: {
  label: string;
  description?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-[24px] border border-zinc-800 bg-zinc-950/60 p-4">
      <div className="space-y-1">
        <p className="text-sm font-medium text-zinc-200">{label}</p>
        {description ? <p className="text-xs leading-5 text-zinc-500">{description}</p> : null}
      </div>
      <div className="mt-4">{children}</div>
      {error ? <p className="mt-2 text-sm text-red-300">{error}</p> : null}
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-3">
      <span className="text-xs uppercase tracking-[0.18em] text-zinc-500">{label}</span>
      <span className="text-sm font-medium text-white">{value}</span>
    </div>
  );
}

export default function VentaProductoForm({
  action,
  productosList,
  mediosPagoList,
}: VentaProductoFormProps) {
  const [productoId, setProductoId] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [precioCobrado, setPrecioCobrado] = useState("");
  const [medioPagoId, setMedioPagoId] = useState("");

  const [state, formAction, isPending] = useActionState(action, {});
  const lastAutoPriceRef = useRef("");
  const lastProductIdRef = useRef("");

  const productoSeleccionado = productosList.find((producto) => producto.id === productoId);
  const medioPagoSeleccionado = mediosPagoList.find((medio) => medio.id === medioPagoId);
  const cantidadNum = Math.max(1, Number.parseInt(cantidad, 10) || 1);
  const stockDisponible = productoSeleccionado?.stockActual ?? 0;
  const excedeStock = Boolean(productoSeleccionado) && cantidadNum > stockDisponible;
  const precioBaseProducto = Number(productoSeleccionado?.precioVenta ?? 0);
  const precio = Number(precioCobrado) || 0;
  const comisionPct = Number(medioPagoSeleccionado?.comisionPorcentaje ?? 0);
  const comisionMonto = (precio * comisionPct) / 100;
  const montoNeto = precio - comisionMonto;
  const previewReady = Boolean(productoSeleccionado && medioPagoSeleccionado && precio > 0);

  useEffect(() => {
    if (!productoId) return;

    const nextAutoPrice = String(precioBaseProducto * cantidadNum);
    const productChanged = lastProductIdRef.current !== productoId;
    lastProductIdRef.current = productoId;

    setPrecioCobrado((current) => {
      if (productChanged || current === "" || current === lastAutoPriceRef.current) {
        lastAutoPriceRef.current = nextAutoPrice;
        return nextAutoPrice;
      }

      return current;
    });
  }, [cantidadNum, precioBaseProducto, productoId]);

  const selectedLabel = productoSeleccionado
    ? `${formatARS(precioBaseProducto)} base`
    : "Elegi un producto para arrancar";

  return (
    <form action={formAction} className="space-y-5">
      {state.error ? (
        <div className="rounded-[24px] border border-red-500/30 bg-red-500/15 p-4 text-sm text-red-200">
          {state.error}
        </div>
      ) : null}

      <section className="rounded-[28px] border border-zinc-800 bg-zinc-950/50 p-5 sm:p-6">
        <div className="flex flex-col gap-4 border-b border-zinc-800 pb-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">
              Flujo guiado
            </p>
            <h2 className="text-2xl font-semibold text-white">Venta de producto</h2>
            <p className="max-w-2xl text-sm leading-6 text-zinc-400">
              Primero elegi el producto, despues la cantidad y el cobro. El resumen te muestra el
              neto antes de confirmar para evitar errores.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[520px]">
            <StatPill label="Productos" value={productosList.length} />
            <StatPill label="Medios" value={mediosPagoList.length} />
            <StatPill label="Resumen" value={selectedLabel} subtle />
          </div>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.12fr)_minmax(320px,0.88fr)]">
          <div className="space-y-5">
            <fieldset className="rounded-[28px] border border-zinc-800 bg-zinc-950/60 p-4 sm:p-5">
              <legend className="px-1 text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">
                Paso 1 - Producto
              </legend>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-zinc-400">
                  Tocá una card. Si el stock es bajo, te lo marcamos antes de cobrar.
                </p>
                <span className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-zinc-400">
                  {productosList.length} opciones
                </span>
              </div>

              <input type="hidden" name="productoId" value={productoId} readOnly />

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {productosList.map((producto) => {
                  const selected = productoId === producto.id;
                  const stockActual = producto.stockActual ?? 0;
                  const accent = getProductoAccent(producto.nombre);
                  const lowStock = stockActual <= 3;

                  return (
                    <button
                      key={producto.id}
                      type="button"
                      onClick={() => {
                        setProductoId(producto.id);
                        setCantidad("1");
                      }}
                      className={[
                        "rounded-[24px] border px-4 py-4 text-left transition",
                        selected
                          ? "border-[#8cff59]/35 bg-[#8cff59]/10 shadow-[0_18px_40px_rgba(0,0,0,0.35)]"
                          : "border-zinc-700 bg-zinc-900 hover:border-zinc-600 hover:bg-zinc-800",
                      ].join(" ")}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={[
                            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold",
                            selected ? "bg-white/10 text-white" : accent.tone,
                          ].join(" ")}
                        >
                          {accent.icon}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <span className="block truncate text-sm font-semibold text-white">
                              {producto.nombre}
                            </span>
                            {lowStock ? (
                              <span className="rounded-full border border-zinc-700 bg-zinc-950 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-amber-300">
                                {getLowStockLabel(stockActual)}
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-1 flex items-center justify-between gap-3 text-xs">
                            <span className={selected ? "text-zinc-200" : getStockTone(stockActual)}>
                              Stock: {stockActual}
                            </span>
                            <span className="text-zinc-400">
                              {formatARS(Number(producto.precioVenta ?? 0))}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {state.fieldErrors?.productoId ? (
                <p className="mt-3 text-sm text-red-300">{state.fieldErrors.productoId}</p>
              ) : null}
            </fieldset>

            <div className="grid gap-5 md:grid-cols-2">
              <FieldShell
                label="Paso 2 - Cantidad"
                description="Usa un toque rapido o ingresala manualmente si hace falta."
                error={state.fieldErrors?.cantidad}
              >
                <div className="flex flex-wrap gap-2">
                  {quickQuantities.map((value) => {
                    const disabled = Boolean(productoSeleccionado && value > stockDisponible);
                    const selected = cantidad === String(value);

                    return (
                      <button
                        key={value}
                        type="button"
                        disabled={disabled}
                        onClick={() => setCantidad(String(value))}
                        className={[
                          "min-h-[46px] min-w-[64px] rounded-2xl border px-4 text-sm font-medium transition",
                          selected
                            ? "border-[#8cff59]/35 bg-[#8cff59]/10 text-[#b9ff96]"
                            : "border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-zinc-600 hover:bg-zinc-800",
                          disabled ? "cursor-not-allowed opacity-40" : "",
                        ].join(" ")}
                      >
                        {value}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 space-y-2">
                  <label htmlFor="cantidad" className="text-sm font-medium text-zinc-300">
                    Cantidad total
                  </label>
                  <input
                    id="cantidad"
                    name="cantidad"
                    type="number"
                    min="1"
                    max={productoSeleccionado?.stockActual ?? undefined}
                    value={cantidad}
                    onChange={(event) => setCantidad(event.target.value)}
                    className="h-12 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-base text-white outline-none transition focus:border-[#8cff59]/60"
                  />
                  {productoSeleccionado ? (
                    <p className="text-xs text-zinc-500">
                      Stock disponible: {stockDisponible}
                      {excedeStock ? " | La cantidad supera el stock." : ""}
                    </p>
                  ) : (
                    <p className="text-xs text-zinc-500">Elegi un producto para ver el stock.</p>
                  )}
                </div>
              </FieldShell>

              <FieldShell
                label="Precio cobrado"
                description="Se autocompleta y sigue siendo editable si hubo descuento o ajuste."
                error={state.fieldErrors?.precioCobrado}
              >
                <div className="space-y-2">
                  <label htmlFor="precioCobrado" className="text-sm font-medium text-zinc-300">
                    Total cobrado
                  </label>
                  <div className="relative">
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
                      onChange={(event) => setPrecioCobrado(event.target.value)}
                      className="h-12 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 pl-8 text-base text-white outline-none transition focus:border-[#8cff59]/60"
                    />
                  </div>
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-xs leading-5 text-zinc-400">
                    Base sugerida: {formatARS(precioBaseProducto)} por unidad. Si cambias el total,
                    el neto se recalcula enseguida.
                  </div>
                </div>
              </FieldShell>
            </div>
          </div>

          <div className="space-y-5">
            <fieldset className="rounded-[28px] border border-zinc-800 bg-zinc-950/60 p-4 sm:p-5">
              <legend className="px-1 text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500">
                Paso 3 - Cobro
              </legend>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-zinc-400">Elegi el medio que realmente entra a caja.</p>
                <span className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-zinc-400">
                  {mediosPagoList.length} medios
                </span>
              </div>

              <input type="hidden" name="medioPagoId" value={medioPagoId} readOnly />

              <div className="mt-4 grid gap-3">
                {mediosPagoList.map((medio) => {
                  const selected = medioPagoId === medio.id;
                  const accent = getMedioAccent(medio.nombre);

                  return (
                    <button
                      key={medio.id}
                      type="button"
                      onClick={() => setMedioPagoId(medio.id)}
                      className={[
                        "rounded-[22px] border px-4 py-4 text-left transition",
                        selected
                          ? "border-[#8cff59]/35 bg-[#8cff59]/10"
                          : "border-zinc-700 bg-zinc-900 hover:border-zinc-600 hover:bg-zinc-800",
                      ].join(" ")}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={[
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-xs font-semibold",
                            selected ? "bg-white/10 text-white" : accent.tone,
                          ].join(" ")}
                        >
                          {accent.icon}
                        </div>
                        <div className="min-w-0">
                          <span className="block truncate text-sm font-semibold text-white">
                            {medio.nombre ?? "-"}
                          </span>
                          <span className={`mt-1 block text-xs ${selected ? "text-zinc-200" : "text-zinc-400"}`}>
                            {Number(medio.comisionPorcentaje ?? 0) > 0
                              ? `Comision ${medio.comisionPorcentaje}%`
                              : "Sin comision"}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {state.fieldErrors?.medioPagoId ? (
                <p className="mt-3 text-sm text-red-300">{state.fieldErrors.medioPagoId}</p>
              ) : null}
            </fieldset>

            <section className="rounded-[28px] border border-[#8cff59]/20 bg-[#8cff59]/10 p-5 text-white">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8cff59]">
                    Resumen antes de confirmar
                  </p>
                  <h3 className="mt-2 text-xl font-semibold">Chequeo final</h3>
                </div>
                <div className="rounded-[22px] bg-white/10 px-4 py-3 text-right">
                  <p className="text-xs uppercase tracking-[0.16em] text-zinc-400">Neto final</p>
                  <p className="mt-2 text-2xl font-semibold">{formatARS(montoNeto)}</p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <PreviewRow
                  label="Producto"
                  value={productoSeleccionado?.nombre ?? "Pendiente"}
                />
                <PreviewRow label="Cantidad" value={String(cantidadNum)} />
                <PreviewRow label="Cobrado" value={formatARS(precio)} />
                <PreviewRow
                  label="Comision"
                  value={comisionPct > 0 ? `-${formatARS(comisionMonto)}` : "Sin comision"}
                />
                <PreviewRow
                  label="Medio"
                  value={medioPagoSeleccionado?.nombre ?? "Pendiente"}
                />
              </div>

              {!previewReady ? (
                <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-sm text-zinc-400">
                  Completa producto, cantidad, precio y medio de pago para habilitar la lectura
                  final.
                </div>
              ) : null}

              {excedeStock ? (
                <div className="mt-4 rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                  La cantidad supera el stock disponible. Bajala antes de confirmar.
                </div>
              ) : null}
            </section>

            <section className="rounded-[28px] border border-zinc-800 bg-zinc-950/60 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
                Regla rapida
              </p>
              <p className="mt-2 text-sm leading-6 text-zinc-300">
                Si el producto no tiene stock o el medio no esta activo, el sistema frena antes de
                tocar caja e inventario. Mejor cortar aca que corregir despues.
              </p>
            </section>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          disabled={isPending || excedeStock}
          className="neon-button inline-flex min-h-[52px] flex-1 items-center justify-center rounded-[20px] px-5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Guardando..." : "Confirmar venta"}
        </button>
        <Link
          href="/caja"
          className="inline-flex min-h-[52px] items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-950 px-5 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}

function StatPill({
  label,
  value,
  subtle = false,
}: {
  label: string;
  value: string | number;
  subtle?: boolean;
}) {
  return (
    <div className="rounded-[22px] border border-zinc-800 bg-zinc-950/70 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className={`mt-2 ${subtle ? "text-sm text-zinc-200" : "text-xl font-semibold text-white"}`}>
        {value}
      </p>
    </div>
  );
}

function getLowStockLabel(stockActual: number) {
  if (stockActual <= 1) return "Stock critico";
  if (stockActual <= 3) return "Stock bajo";
  return "Stock ok";
}
