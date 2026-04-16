"use client";

import { useRef, useState, useTransition } from "react";
import { registrarCorteAction } from "./actions";

function getFechaHoyAR(): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date());
}

export default function NuevoCorteForm() {
  const [isPending, startTransition] = useTransition();
  const [preview, setPreview] = useState<string | null>(null);
  const [fotoError, setFotoError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFotoError(null);
    const file = e.target.files?.[0];
    if (!file) {
      setPreview(null);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFotoError("La foto no puede superar 5 MB");
      e.target.value = "";
      setPreview(null);
      return;
    }
    setPreview(URL.createObjectURL(file));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    startTransition(async () => {
      await registrarCorteAction(data);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="panel-card rounded-[28px] p-5 space-y-5">
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-zinc-300" htmlFor="servicioNombre">
          Servicio <span className="text-[#8cff59]">*</span>
        </label>
        <input
          id="servicioNombre"
          name="servicioNombre"
          type="text"
          required
          placeholder="Ej: Corte clásico"
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-white placeholder:text-zinc-500 focus:border-[#8cff59]/60 focus:outline-none"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-zinc-300" htmlFor="clienteNombre">
          Nombre del cliente <span className="text-zinc-500">(opcional)</span>
        </label>
        <input
          id="clienteNombre"
          name="clienteNombre"
          type="text"
          placeholder="Ej: Facundo"
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-white placeholder:text-zinc-500 focus:border-[#8cff59]/60 focus:outline-none"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-zinc-300" htmlFor="fecha">
          Fecha <span className="text-[#8cff59]">*</span>
        </label>
        <input
          id="fecha"
          name="fecha"
          type="date"
          required
          defaultValue={getFechaHoyAR()}
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-white focus:border-[#8cff59]/60 focus:outline-none"
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
          placeholder="Técnica usada, detalles del corte..."
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-white placeholder:text-zinc-500 focus:border-[#8cff59]/60 focus:outline-none resize-none"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-zinc-300" htmlFor="foto">
          Foto del resultado <span className="text-zinc-500">(opcional, máx 5 MB)</span>
        </label>
        <input
          id="foto"
          name="foto"
          type="file"
          accept="image/*"
          capture="environment"
          ref={fileRef}
          onChange={handleFileChange}
          className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-zinc-300 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-700 file:px-3 file:py-1 file:text-sm file:text-white focus:outline-none"
        />
        {fotoError && (
          <p className="text-sm text-red-400">{fotoError}</p>
        )}
        {preview && (
          <div className="mt-2 overflow-hidden rounded-2xl border border-zinc-700">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Preview del corte" className="max-h-64 w-full object-cover" />
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="neon-button w-full rounded-[20px] px-5 py-3 font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isPending ? "Guardando..." : "Registrar corte"}
      </button>
    </form>
  );
}
