"use client";

import { useActionState } from "react";
import { crearProducto, type ProductoFormState } from "../actions";
import Link from "next/link";

const initialState: ProductoFormState = {};

export default function NuevoProductoPage() {
  const [state, formAction, isPending] = useActionState(crearProducto, initialState);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto">
          <Link href="/inventario" className="text-gray-400 hover:text-gray-600 text-sm mb-2 block">← Inventario</Link>
          <h1 className="text-xl font-bold text-gray-900">Nuevo producto</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          {state.error && (
            <div className="mb-4 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">
              {state.error}
            </div>
          )}

          <form action={formAction} className="flex flex-col gap-4">
            {/* Nombre */}
            <div>
              <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">
                Nombre <span className="text-red-500">*</span>
              </label>
              <input
                id="nombre"
                name="nombre"
                type="text"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                placeholder="Ej: Pomada fijadora"
              />
              {state.fieldErrors?.nombre && (
                <p className="text-red-500 text-xs mt-1">{state.fieldErrors.nombre}</p>
              )}
            </div>

            {/* Descripción */}
            <div>
              <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700 mb-1">
                Descripción <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <textarea
                id="descripcion"
                name="descripcion"
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
                placeholder="Descripción del producto"
              />
            </div>

            {/* Precio venta / Costo compra */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="precioVenta" className="block text-sm font-medium text-gray-700 mb-1">
                  Precio de venta
                </label>
                <input
                  id="precioVenta"
                  name="precioVenta"
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  placeholder="0"
                />
                {state.fieldErrors?.precioVenta && (
                  <p className="text-red-500 text-xs mt-1">{state.fieldErrors.precioVenta}</p>
                )}
              </div>
              <div>
                <label htmlFor="costoCompra" className="block text-sm font-medium text-gray-700 mb-1">
                  Costo de compra
                </label>
                <input
                  id="costoCompra"
                  name="costoCompra"
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                  placeholder="0"
                />
                {state.fieldErrors?.costoCompra && (
                  <p className="text-red-500 text-xs mt-1">{state.fieldErrors.costoCompra}</p>
                )}
              </div>
            </div>

            {/* Stock mínimo */}
            <div>
              <label htmlFor="stockMinimo" className="block text-sm font-medium text-gray-700 mb-1">
                Stock mínimo
              </label>
              <input
                id="stockMinimo"
                name="stockMinimo"
                type="number"
                min="0"
                step="1"
                defaultValue={5}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
              <p className="text-xs text-gray-400 mt-1">Se mostrará alerta cuando el stock sea igual o menor a este valor</p>
              {state.fieldErrors?.stockMinimo && (
                <p className="text-red-500 text-xs mt-1">{state.fieldErrors.stockMinimo}</p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Link
                href="/inventario"
                className="flex-1 min-h-[44px] inline-flex items-center justify-center border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 min-h-[44px] bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50"
              >
                {isPending ? "Guardando..." : "Crear producto"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
