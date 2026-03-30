"use client";

import { useActionState, useEffect, useState } from "react";
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

  const productoSeleccionado = productosList.find((p) => p.id === productoId);
  const medioPago = mediosPagoList.find((m) => m.id === medioPagoId);

  useEffect(() => {
    if (!productoId) return;
    const producto = productosList.find((p) => p.id === productoId);
    const precioBase = Number(producto?.precioVenta ?? 0);
    const cant = parseInt(cantidad, 10) || 1;
    setPrecioCobrado(String(precioBase * cant));
  }, [cantidad, productoId, productosList]);

  const precio = Number(precioCobrado) || 0;
  const comisionMpPct = Number(medioPago?.comisionPorcentaje ?? 0);
  const comisionMpMonto = (precio * comisionMpPct) / 100;
  const montoNeto = precio - comisionMpMonto;
  const mostrarPreview = precio > 0 && medioPagoId !== "";
  const cantidadesSugeridas = [1, 2, 3];

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700">
          Producto <span className="text-red-500">*</span>
        </label>
        <input type="hidden" name="productoId" value={productoId} readOnly />
        <div className="grid gap-3 sm:grid-cols-2">
          {productosList.map((producto) => (
            <button
              key={producto.id}
              type="button"
              onClick={() => {
                setProductoId(producto.id);
                setCantidad("1");
              }}
              className={`rounded-xl border px-4 py-3 text-left transition ${
                productoId === producto.id
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-200 bg-gray-50 text-gray-900 hover:border-gray-300 hover:bg-white"
              }`}
            >
              <span className="block text-sm font-semibold">{producto.nombre}</span>
              <span
                className={`mt-1 block text-xs ${
                  productoId === producto.id ? "text-gray-300" : "text-gray-500"
                }`}
              >
                Stock: {producto.stockActual ?? 0}
              </span>
              <span className="mt-2 block text-sm font-bold">
                {formatARS(Number(producto.precioVenta ?? 0))}
              </span>
            </button>
          ))}
        </div>
        {state.fieldErrors?.productoId && (
          <p className="text-xs text-red-500">{state.fieldErrors.productoId}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="cantidad" className="text-sm font-medium text-gray-700">
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
                className={`min-h-[44px] min-w-[52px] rounded-xl border px-4 text-sm font-medium transition ${
                  cantidad === String(value)
                    ? "border-gray-900 bg-gray-900 text-white"
                    : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
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
          className="min-h-[44px] w-full rounded-lg border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        {productoSeleccionado && (
          <p className="text-xs text-gray-400">
            Stock disponible: {productoSeleccionado.stockActual ?? 0}
          </p>
        )}
        {state.fieldErrors?.cantidad && (
          <p className="text-xs text-red-500">{state.fieldErrors.cantidad}</p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="precioCobrado" className="text-sm font-medium text-gray-700">
          Precio cobrado <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">$</span>
          <input
            id="precioCobrado"
            name="precioCobrado"
            type="number"
            min="0"
            step="1"
            value={precioCobrado}
            onChange={(event) => setPrecioCobrado(event.target.value)}
            placeholder="0"
            className="min-h-[44px] w-full rounded-lg border border-gray-300 px-4 py-2 pl-8 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        <p className="text-xs text-gray-400">
          Se completa automático y podés editarlo si querés aplicar un descuento.
        </p>
        {state.fieldErrors?.precioCobrado && (
          <p className="text-xs text-red-500">{state.fieldErrors.precioCobrado}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700">
          Medio de pago <span className="text-red-500">*</span>
        </label>
        <input type="hidden" name="medioPagoId" value={medioPagoId} readOnly />
        <div className="grid gap-3 sm:grid-cols-3">
          {mediosPagoList.map((medio) => (
            <button
              key={medio.id}
              type="button"
              onClick={() => setMedioPagoId(medio.id)}
              className={`min-h-[68px] rounded-xl border px-4 py-3 text-left transition ${
                medioPagoId === medio.id
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-200 bg-gray-50 text-gray-900 hover:border-gray-300 hover:bg-white"
              }`}
            >
              <span className="block text-sm font-semibold">{medio.nombre ?? "-"}</span>
              <span
                className={`mt-1 block text-xs ${
                  medioPagoId === medio.id ? "text-gray-300" : "text-gray-500"
                }`}
              >
                {Number(medio.comisionPorcentaje ?? 0) > 0
                  ? `Comisión ${medio.comisionPorcentaje}%`
                  : "Sin comisión"}
              </span>
            </button>
          ))}
        </div>
        {state.fieldErrors?.medioPagoId && (
          <p className="text-xs text-red-500">{state.fieldErrors.medioPagoId}</p>
        )}
      </div>

      {mostrarPreview && (
        <div className="flex flex-col gap-1 rounded-lg bg-gray-50 p-3 text-sm">
          <div className="flex justify-between text-gray-700">
            <span>Precio cobrado</span>
            <span className="font-medium">{formatARS(precio)}</span>
          </div>
          {comisionMpPct > 0 && (
            <div className="flex justify-between text-gray-500">
              <span>
                Comisión {medioPago?.nombre ?? ""} ({comisionMpPct}%)
              </span>
              <span>-{formatARS(comisionMpMonto)}</span>
            </div>
          )}
          <div className="my-1 border-t border-gray-200" />
          <div className="flex justify-between font-semibold text-gray-900">
            <span>Neto</span>
            <span>{formatARS(montoNeto)}</span>
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="min-h-[44px] flex-1 rounded-lg bg-gray-900 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-50"
        >
          {isPending ? "Guardando..." : "Confirmar venta"}
        </button>
        <a
          href="/caja"
          className="flex min-h-[44px] items-center justify-center rounded-lg bg-gray-100 px-6 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
        >
          Cancelar
        </a>
      </div>
    </form>
  );
}
