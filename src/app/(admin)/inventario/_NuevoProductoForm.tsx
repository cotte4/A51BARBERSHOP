"use client";

import { useActionState } from "react";
import Link from "next/link";
import { crearProducto, type ProductoFormState } from "./actions";

const initialState: ProductoFormState = {};

export default function NuevoProductoForm() {
  const [state, formAction, isPending] = useActionState(crearProducto, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div>
        <label htmlFor="nombre" className="mb-1 block text-sm font-medium text-gray-700">
          Nombre <span className="text-red-500">*</span>
        </label>
        <input
          id="nombre"
          name="nombre"
          type="text"
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          placeholder="Ej: Pomada fijadora"
        />
        {state.fieldErrors?.nombre && (
          <p className="mt-1 text-xs text-red-500">{state.fieldErrors.nombre}</p>
        )}
      </div>

      <div>
        <label htmlFor="descripcion" className="mb-1 block text-sm font-medium text-gray-700">
          Descripcion <span className="font-normal text-gray-400">(opcional)</span>
        </label>
        <textarea
          id="descripcion"
          name="descripcion"
          rows={2}
          className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          placeholder="Descripcion del producto"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="precioVenta" className="mb-1 block text-sm font-medium text-gray-700">
            Precio de venta
          </label>
          <input
            id="precioVenta"
            name="precioVenta"
            type="number"
            min="0"
            step="0.01"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            placeholder="0"
          />
          {state.fieldErrors?.precioVenta && (
            <p className="mt-1 text-xs text-red-500">{state.fieldErrors.precioVenta}</p>
          )}
        </div>

        <div>
          <label htmlFor="costoCompra" className="mb-1 block text-sm font-medium text-gray-700">
            Costo de compra
          </label>
          <input
            id="costoCompra"
            name="costoCompra"
            type="number"
            min="0"
            step="0.01"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
            placeholder="0"
          />
          {state.fieldErrors?.costoCompra && (
            <p className="mt-1 text-xs text-red-500">{state.fieldErrors.costoCompra}</p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="stockMinimo" className="mb-1 block text-sm font-medium text-gray-700">
          Stock minimo
        </label>
        <input
          id="stockMinimo"
          name="stockMinimo"
          type="number"
          min="0"
          step="1"
          defaultValue={5}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        <p className="mt-1 text-xs text-gray-400">
          Se mostrara alerta cuando el stock sea igual o menor a este valor
        </p>
        {state.fieldErrors?.stockMinimo && (
          <p className="mt-1 text-xs text-red-500">{state.fieldErrors.stockMinimo}</p>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <Link
          href="/inventario"
          className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="min-h-[44px] flex-1 rounded-lg bg-gray-900 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {isPending ? "Guardando..." : "Crear producto"}
        </button>
      </div>
    </form>
  );
}
