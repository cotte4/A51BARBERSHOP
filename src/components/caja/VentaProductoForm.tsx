"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
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

function formatARS(val: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
  }).format(val);
}

function getProductoAccent(nombre: string) {
  const normalized = nombre.toLowerCase();
  if (normalized.includes("cafe")) return { icon: "CA", tone: "bg-amber-100 text-amber-900" };
  if (normalized.includes("pomada")) return { icon: "PO", tone: "bg-stone-900 text-white" };
  if (normalized.includes("shampoo")) return { icon: "SH", tone: "bg-sky-100 text-sky-900" };
  if (normalized.includes("gel")) return { icon: "GE", tone: "bg-violet-100 text-violet-900" };
  if (normalized.includes("cera")) return { icon: "CE", tone: "bg-rose-100 text-rose-900" };
  return { icon: "PR", tone: "bg-emerald-100 text-emerald-900" };
}

function getMedioAccent(nombre: string | null | undefined) {
  const normalized = (nombre ?? "").toLowerCase();
  if (normalized.includes("efectivo")) return { icon: "EF", tone: "bg-emerald-100 text-emerald-900" };
  if (normalized.includes("transfer")) return { icon: "TR", tone: "bg-sky-100 text-sky-900" };
  if (normalized.includes("tarjeta") || normalized.includes("posnet")) {
    return { icon: "TJ", tone: "bg-violet-100 text-violet-900" };
  }
  if (normalized.includes("mercado") || normalized.includes("mp")) {
    return { icon: "MP", tone: "bg-cyan-100 text-cyan-900" };
  }
  return { icon: "PG", tone: "bg-stone-200 text-stone-800" };
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

  const productoSeleccionado = productosList.find((producto) => producto.id === productoId);
  const medioPago = mediosPagoList.find((medio) => medio.id === medioPagoId);

  useEffect(() => {
    if (!productoId) return;
    const producto = productosList.find((item) => item.id === productoId);
    const precioBase = Number(producto?.precioVenta ?? 0);
    const cant = parseInt(cantidad, 10) || 1;
    setPrecioCobrado(String(precioBase * cant));
  }, [cantidad, productoId, productosList]);

  const precio = Number(precioCobrado) || 0;
  const comisionMpPct = Number(medioPago?.comisionPorcentaje ?? 0);
  const comisionMpMonto = (precio * comisionMpPct) / 100;
  const montoNeto = precio - comisionMpMonto;
  const mostrarPreview = precio > 0 && medioPagoId !== "";
  const cantidadesSugeridas = useMemo(() => [1, 2, 3], []);

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
            <h2 className="mt-2 text-2xl font-semibold text-stone-950">Elegi el producto</h2>
            <p className="mt-1 text-sm text-stone-500">
              Stock, precio y seleccion en cards para resolver rapido.
            </p>
          </div>
          <div className="rounded-2xl bg-stone-100 px-4 py-3 text-sm text-stone-600">
            {productosList.length} productos disponibles
          </div>
        </div>

        <input type="hidden" name="productoId" value={productoId} readOnly />

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {productosList.map((producto) => {
            const selected = productoId === producto.id;
            const accent = getProductoAccent(producto.nombre);

            return (
              <button
                key={producto.id}
                type="button"
                onClick={() => {
                  setProductoId(producto.id);
                  setCantidad("1");
                }}
                className={`rounded-[24px] border px-4 py-4 text-left transition ${
                  selected
                    ? "border-stone-900 bg-stone-900 text-white shadow-[0_18px_40px_rgba(28,25,23,0.18)]"
                    : "border-stone-200 bg-stone-50 text-stone-900 hover:border-stone-300 hover:bg-white"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-semibold ${
                      selected ? "bg-white/10 text-white" : accent.tone
                    }`}
                  >
                    {accent.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{producto.nombre}</span>
                    <span className={`mt-1 block text-xs ${selected ? "text-stone-300" : "text-stone-500"}`}>
                      Stock: {producto.stockActual ?? 0}
                    </span>
                    <span className="mt-3 block text-lg font-semibold">
                      {formatARS(Number(producto.precioVenta ?? 0))}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {state.fieldErrors?.productoId ? (
          <p className="mt-2 text-xs text-red-500">{state.fieldErrors.productoId}</p>
        ) : null}
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-400">
            Paso 2
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-stone-950">Cantidad y cobro</h2>

          <div className="mt-5 space-y-5">
            <div className="flex flex-col gap-2">
              <label htmlFor="cantidad" className="text-sm font-medium text-stone-700">
                Cantidad <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {cantidadesSugeridas.map((value) => {
                  const stockActual = productoSeleccionado?.stockActual ?? null;
                  const exceedsStock = stockActual !== null && value > stockActual;

                  return (
                    <button
                      key={value}
                      type="button"
                      disabled={exceedsStock}
                      onClick={() => setCantidad(String(value))}
                      className={`min-h-[46px] min-w-[62px] rounded-2xl border px-4 text-sm font-medium transition ${
                        cantidad === String(value)
                          ? "border-stone-900 bg-stone-900 text-white"
                          : "border-stone-300 bg-stone-50 text-stone-700 hover:border-stone-400 hover:bg-white"
                      } disabled:cursor-not-allowed disabled:opacity-40`}
                    >
                      {value}
                    </button>
                  );
                })}
              </div>
              <input
                id="cantidad"
                name="cantidad"
                type="number"
                min="1"
                max={productoSeleccionado?.stockActual ?? undefined}
                value={cantidad}
                onChange={(event) => setCantidad(event.target.value)}
                placeholder="1"
                className="min-h-[48px] w-full rounded-xl border border-stone-300 px-4 text-sm text-stone-900 outline-none focus:border-stone-900"
              />
              {productoSeleccionado ? (
                <p className="text-xs text-stone-500">
                  Stock disponible: {productoSeleccionado.stockActual ?? 0}
                </p>
              ) : null}
              {state.fieldErrors?.cantidad ? (
                <p className="text-xs text-red-500">{state.fieldErrors.cantidad}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="precioCobrado" className="text-sm font-medium text-stone-700">
                Precio cobrado <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-stone-400">$</span>
                <input
                  id="precioCobrado"
                  name="precioCobrado"
                  type="number"
                  min="0"
                  step="1"
                  value={precioCobrado}
                  onChange={(event) => setPrecioCobrado(event.target.value)}
                  placeholder="0"
                  className="min-h-[48px] w-full rounded-xl border border-stone-300 px-4 pl-8 text-sm text-stone-900 outline-none focus:border-stone-900"
                />
              </div>
              <p className="text-xs text-stone-500">
                Se completa automatico y puedes editarlo para aplicar descuento o ajuste.
              </p>
              {state.fieldErrors?.precioCobrado ? (
                <p className="text-xs text-red-500">{state.fieldErrors.precioCobrado}</p>
              ) : null}
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-400">
            Paso 3
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-stone-950">Medio de pago</h2>

          <input type="hidden" name="medioPagoId" value={medioPagoId} readOnly />

          <div className="mt-5 grid gap-3">
            {mediosPagoList.map((medio) => {
              const selected = medioPagoId === medio.id;
              const accent = getMedioAccent(medio.nombre);

              return (
                <button
                  key={medio.id}
                  type="button"
                  onClick={() => setMedioPagoId(medio.id)}
                  className={`rounded-[22px] border px-4 py-4 text-left transition ${
                    selected
                      ? "border-stone-900 bg-stone-900 text-white"
                      : "border-stone-200 bg-stone-50 text-stone-900 hover:border-stone-300 hover:bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-2xl text-xs font-semibold ${
                        selected ? "bg-white/10 text-white" : accent.tone
                      }`}
                    >
                      {accent.icon}
                    </div>
                    <div>
                      <span className="block text-sm font-semibold">{medio.nombre ?? "-"}</span>
                      <span className={`mt-1 block text-xs ${selected ? "text-stone-300" : "text-stone-500"}`}>
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
            <p className="mt-2 text-xs text-red-500">{state.fieldErrors.medioPagoId}</p>
          ) : null}
        </section>
      </div>

      {mostrarPreview ? (
        <section className="rounded-[28px] bg-stone-950 p-5 text-white shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-300">
                Checkout
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                Resumen antes de confirmar
              </h2>
            </div>
            <div className="rounded-[22px] bg-white/10 px-4 py-3 text-right">
              <p className="text-xs uppercase tracking-[0.16em] text-stone-300">Neto final</p>
              <p className="mt-2 text-2xl font-semibold">{formatARS(montoNeto)}</p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <PreviewStat
              label="Producto"
              value={productoSeleccionado?.nombre ?? "Pendiente"}
            />
            <PreviewStat label="Cobrado" value={formatARS(precio)} />
            <PreviewStat
              label="Comision"
              value={comisionMpPct > 0 ? `-${formatARS(comisionMpMonto)}` : "Sin comision"}
            />
          </div>
        </section>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-[52px] flex-1 items-center justify-center rounded-2xl bg-stone-900 px-5 text-sm font-semibold text-white transition hover:bg-stone-700 disabled:opacity-50"
        >
          {isPending ? "Guardando..." : "Confirmar venta"}
        </button>
        <Link
          href="/caja"
          className="inline-flex min-h-[52px] items-center justify-center rounded-2xl bg-stone-100 px-5 text-sm font-medium text-stone-700 transition hover:bg-stone-200"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}

function PreviewStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[20px] bg-white/8 px-4 py-4">
      <p className="text-xs uppercase tracking-[0.16em] text-stone-300">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}
