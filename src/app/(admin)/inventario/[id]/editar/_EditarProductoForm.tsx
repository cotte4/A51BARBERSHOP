"use client";

import { useActionState } from "react";
import type { ProductoFormState } from "../../actions";
import Link from "next/link";

interface ProductoData {
  id: string;
  nombre: string;
  descripcion: string;
  precioVenta: string;
  costoCompra: string;
  stockMinimo: number;
  stockActual: number;
  esConsumicion: boolean;
}

interface Props {
  editarAction: (prevState: ProductoFormState, formData: FormData) => Promise<ProductoFormState>;
  producto: ProductoData;
}

const initialState: ProductoFormState = {};

export default function EditarProductoForm({ editarAction, producto }: Props) {
  const [state, formAction, isPending] = useActionState(editarAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error && (
        <div className="mb-2 bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg">
          {state.error}
        </div>
      )}

      {/* Stock actual — solo informativo */}
      <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm text-gray-600">
        Stock actual: <span className="font-semibold text-gray-900">{producto.stockActual}</span>
        <span className="text-gray-400 ml-2">(modificar solo desde movimientos)</span>
      </div>

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
          defaultValue={producto.nombre}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
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
          defaultValue={producto.descripcion}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
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
            defaultValue={producto.precioVenta}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
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
            defaultValue={producto.costoCompra}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
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
          defaultValue={producto.stockMinimo}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        {state.fieldErrors?.stockMinimo && (
          <p className="text-red-500 text-xs mt-1">{state.fieldErrors.stockMinimo}</p>
        )}
      </div>

      <label className="flex items-start gap-3 rounded-lg border border-gray-300 px-4 py-3 text-sm text-gray-700">
        <input
          type="checkbox"
          name="esConsumicion"
          defaultChecked={producto.esConsumicion}
          className="mt-0.5 size-4 rounded border-gray-300"
        />
        <span>
          <span className="block font-medium text-gray-900">Producto de consumiciÃ³n</span>
          <span className="mt-1 block text-xs text-gray-500">
            Permite incluirlo a $0 dentro de beneficios Marciano desde caja.
          </span>
        </span>
      </label>

      <div className="flex gap-3 pt-2">
        <Link
          href={`/inventario/${producto.id}`}
          className="flex-1 min-h-[44px] inline-flex items-center justify-center border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 min-h-[44px] bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50"
        >
          {isPending ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
