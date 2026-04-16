"use client";

import { useTransition } from "react";
import { ASSET_CATEGORIAS } from "../actions";
import { crearAssetAction } from "../actions";

function getFechaHoyAR(): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date());
}

export default function NuevoAssetForm() {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(async () => {
      await crearAssetAction(data);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="panel-card rounded-[28px] p-5 space-y-5">
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-zinc-300" htmlFor="nombre">
          Nombre <span className="text-[#8cff59]">*</span>
        </label>
        <input
          id="nombre"
          name="nombre"
          type="text"
          required
          placeholder="Ej: Sillón hidráulico Takara"
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-white placeholder:text-zinc-500 focus:border-[#8cff59]/60 focus:outline-none"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-zinc-300" htmlFor="categoria">
          Categoría <span className="text-[#8cff59]">*</span>
        </label>
        <select
          id="categoria"
          name="categoria"
          required
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-white focus:border-[#8cff59]/60 focus:outline-none"
        >
          <option value="">Elegir categoría...</option>
          {ASSET_CATEGORIAS.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-zinc-300" htmlFor="precioCompra">
          Precio de compra (ARS) <span className="text-[#8cff59]">*</span>
        </label>
        <input
          id="precioCompra"
          name="precioCompra"
          type="number"
          required
          min="0"
          step="0.01"
          placeholder="0"
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-white placeholder:text-zinc-500 focus:border-[#8cff59]/60 focus:outline-none"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-zinc-300" htmlFor="fechaCompra">
          Fecha de compra <span className="text-[#8cff59]">*</span>
        </label>
        <input
          id="fechaCompra"
          name="fechaCompra"
          type="date"
          required
          defaultValue={getFechaHoyAR()}
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-white focus:border-[#8cff59]/60 focus:outline-none"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-zinc-300" htmlFor="proveedor">
          Proveedor <span className="text-zinc-500">(opcional)</span>
        </label>
        <input
          id="proveedor"
          name="proveedor"
          type="text"
          placeholder="Ej: Distribuidora Barber Pro"
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-white placeholder:text-zinc-500 focus:border-[#8cff59]/60 focus:outline-none"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-zinc-300" htmlFor="notas">
          Notas <span className="text-zinc-500">(opcional)</span>
        </label>
        <textarea
          id="notas"
          name="notas"
          rows={3}
          placeholder="Detalles adicionales..."
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-white placeholder:text-zinc-500 focus:border-[#8cff59]/60 focus:outline-none resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="neon-button w-full rounded-[20px] px-5 py-3 font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isPending ? "Guardando..." : "Registrar equipo"}
      </button>
    </form>
  );
}
