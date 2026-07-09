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
        <div className="mb-4 rounded-lg border border-red-500/35 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {state.error}
        </div>
      )}

      <div>
        <label htmlFor="nombre" className="mb-1 block text-sm font-medium text-zinc-300">
          Nombre <span className="text-red-400">*</span>
        </label>
        <input
          id="nombre"
          name="nombre"
          type="text"
          required
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-white placeholder:text-zinc-500 focus:border-[#8cff59]/60 focus:outline-none"
          placeholder="Ej: Pomada fijadora"
        />
        {state.fieldErrors?.nombre && (
          <p className="mt-1 text-xs text-red-400">{state.fieldErrors.nombre}</p>
        )}
      </div>

      <div>
        <label htmlFor="descripcion" className="mb-1 block text-sm font-medium text-zinc-300">
          Descripcion <span className="font-normal text-zinc-500">(opcional)</span>
        </label>
        <textarea
          id="descripcion"
          name="descripcion"
          rows={2}
          className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-white placeholder:text-zinc-500 focus:border-[#8cff59]/60 focus:outline-none"
          placeholder="Descripcion del producto"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="precioVenta" className="mb-1 block text-sm font-medium text-zinc-300">
            Precio de venta
          </label>
          <input
            id="precioVenta"
            name="precioVenta"
            type="number"
            min="0"
            step="0.01"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-white placeholder:text-zinc-500 focus:border-[#8cff59]/60 focus:outline-none"
            placeholder="0"
          />
          {state.fieldErrors?.precioVenta && (
            <p className="mt-1 text-xs text-red-400">{state.fieldErrors.precioVenta}</p>
          )}
        </div>

        <div>
          <label htmlFor="costoCompra" className="mb-1 block text-sm font-medium text-zinc-300">
            Costo de compra
          </label>
          <input
            id="costoCompra"
            name="costoCompra"
            type="number"
            min="0"
            step="0.01"
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-white placeholder:text-zinc-500 focus:border-[#8cff59]/60 focus:outline-none"
            placeholder="0"
          />
          {state.fieldErrors?.costoCompra && (
            <p className="mt-1 text-xs text-red-400">{state.fieldErrors.costoCompra}</p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="stockMinimo" className="mb-1 block text-sm font-medium text-zinc-300">
          Stock minimo
        </label>
        <input
          id="stockMinimo"
          name="stockMinimo"
          type="number"
          min="0"
          step="1"
          defaultValue={5}
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-white placeholder:text-zinc-500 focus:border-[#8cff59]/60 focus:outline-none"
        />
        <p className="mt-1 text-xs text-zinc-500">
          Se mostrara alerta cuando el stock sea igual o menor a este valor
        </p>
        {state.fieldErrors?.stockMinimo && (
          <p className="mt-1 text-xs text-red-400">{state.fieldErrors.stockMinimo}</p>
        )}
      </div>

      <label className="flex items-start gap-3 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-300">
        <input
          type="checkbox"
          name="esConsumicion"
          className="mt-0.5 size-4 rounded border-zinc-600 bg-zinc-900 accent-[#8cff59]"
        />
        <span>
          <span className="block font-medium text-white">Producto de consumición</span>
          <span className="mt-1 block text-xs text-zinc-500">
            Habilita que este producto pueda marcarse como incluido para clientes Marciano.
          </span>
        </span>
      </label>

      <div className="flex gap-3 pt-2">
        <Link
          href="/inventario"
          className="ghost-button inline-flex min-h-[44px] flex-1 items-center justify-center rounded-[20px] text-sm font-medium"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="neon-button min-h-[44px] flex-1 rounded-[20px] text-sm font-semibold disabled:opacity-50"
        >
          {isPending ? "Guardando..." : "Crear producto"}
        </button>
      </div>
    </form>
  );
}
