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

  // Auto-fill precio cuando cambia el producto o la cantidad
  useEffect(() => {
    if (!productoId) return;
    const producto = productosList.find((p) => p.id === productoId);
    const precioBase = Number(producto?.precioVenta ?? 0);
    const cant = parseInt(cantidad, 10) || 1;
    setPrecioCobrado(String(precioBase * cant));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productoId, cantidad]);

  // Cálculo en tiempo real
  const precio = Number(precioCobrado) || 0;
  const comisionMpPct = Number(medioPago?.comisionPorcentaje ?? 0);
  const comisionMpMonto = precio * comisionMpPct / 100;
  const montoNeto = precio - comisionMpMonto;

  const mostrarPreview = precio > 0 && medioPagoId !== "";

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {state.error}
        </div>
      )}

      {/* Producto */}
      <div className="flex flex-col gap-1">
        <label htmlFor="productoId" className="text-sm font-medium text-gray-700">
          Producto <span className="text-red-500">*</span>
        </label>
        <select
          id="productoId"
          name="productoId"
          value={productoId}
          onChange={(e) => {
            setProductoId(e.target.value);
            setCantidad("1");
          }}
          className="min-h-[44px] w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
        >
          <option value="">Seleccioná un producto...</option>
          {productosList.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nombre} — Stock: {p.stockActual ?? 0} — {formatARS(Number(p.precioVenta ?? 0))}
            </option>
          ))}
        </select>
        {state.fieldErrors?.productoId && (
          <p className="text-red-500 text-xs">{state.fieldErrors.productoId}</p>
        )}
      </div>

      {/* Cantidad */}
      <div className="flex flex-col gap-1">
        <label htmlFor="cantidad" className="text-sm font-medium text-gray-700">
          Cantidad <span className="text-red-500">*</span>
        </label>
        <input
          id="cantidad"
          name="cantidad"
          type="number"
          min="1"
          max={productoSeleccionado?.stockActual ?? undefined}
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          placeholder="1"
          className="min-h-[44px] w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        {productoSeleccionado && (
          <p className="text-xs text-gray-400">
            Stock disponible: {productoSeleccionado.stockActual ?? 0}
          </p>
        )}
        {state.fieldErrors?.cantidad && (
          <p className="text-red-500 text-xs">{state.fieldErrors.cantidad}</p>
        )}
      </div>

      {/* Precio cobrado */}
      <div className="flex flex-col gap-1">
        <label htmlFor="precioCobrado" className="text-sm font-medium text-gray-700">
          Precio cobrado <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
            $
          </span>
          <input
            id="precioCobrado"
            name="precioCobrado"
            type="number"
            min="0"
            step="1"
            value={precioCobrado}
            onChange={(e) => setPrecioCobrado(e.target.value)}
            placeholder="0"
            className="min-h-[44px] w-full px-4 py-2 pl-8 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        <p className="text-xs text-gray-400">Podés modificarlo para aplicar descuentos</p>
        {state.fieldErrors?.precioCobrado && (
          <p className="text-red-500 text-xs">{state.fieldErrors.precioCobrado}</p>
        )}
      </div>

      {/* Medio de pago */}
      <div className="flex flex-col gap-1">
        <label htmlFor="medioPagoId" className="text-sm font-medium text-gray-700">
          Medio de pago <span className="text-red-500">*</span>
        </label>
        <select
          id="medioPagoId"
          name="medioPagoId"
          value={medioPagoId}
          onChange={(e) => setMedioPagoId(e.target.value)}
          className="min-h-[44px] w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
        >
          <option value="">Seleccioná medio de pago...</option>
          {mediosPagoList.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nombre ?? "—"}
              {Number(m.comisionPorcentaje ?? 0) > 0
                ? ` (${m.comisionPorcentaje}%)`
                : ""}
            </option>
          ))}
        </select>
        {state.fieldErrors?.medioPagoId && (
          <p className="text-red-500 text-xs">{state.fieldErrors.medioPagoId}</p>
        )}
      </div>

      {/* Preview de cálculo */}
      {mostrarPreview && (
        <div className="bg-gray-50 rounded-lg p-3 text-sm flex flex-col gap-1">
          <div className="flex justify-between text-gray-700">
            <span>Precio cobrado</span>
            <span className="font-medium">{formatARS(precio)}</span>
          </div>
          {comisionMpPct > 0 && (
            <div className="flex justify-between text-gray-500">
              <span>
                Comisión {medioPago?.nombre ?? ""} ({comisionMpPct}%)
              </span>
              <span>−{formatARS(comisionMpMonto)}</span>
            </div>
          )}
          <div className="border-t border-gray-200 my-1" />
          <div className="flex justify-between font-semibold text-gray-900">
            <span>Neto</span>
            <span>{formatARS(montoNeto)}</span>
          </div>
        </div>
      )}

      {/* Botones */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 min-h-[44px] bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors disabled:opacity-50"
        >
          {isPending ? "Guardando..." : "Confirmar venta"}
        </button>
        <a
          href="/caja"
          className="min-h-[44px] px-6 flex items-center justify-center bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
        >
          Cancelar
        </a>
      </div>
    </form>
  );
}
