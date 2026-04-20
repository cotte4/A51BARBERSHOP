"use client";

import { useState } from "react";
import { createPremioAction } from "./actions";

const TYPES = [
  { value: "consumicion", label: "Consumición" },
  { value: "descuento_pct", label: "Descuento %" },
  { value: "descuento_fijo", label: "Descuento fijo" },
  { value: "producto", label: "Producto" },
] as const;

type PremioType = (typeof TYPES)[number]["value"];

export default function NuevoPremioForm() {
  const [label, setLabel] = useState("");
  const [type, setType] = useState<PremioType>("consumicion");
  const [costOvnis, setCostOvnis] = useState(200);
  const [value, setValue] = useState(0);
  const [stock, setStock] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "ok" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setErrorMsg("");
    const result = await createPremioAction({
      label,
      type,
      costOvnis,
      value,
      stock: stock === "" ? null : Number(stock),
    });
    if (result.success) {
      setStatus("ok");
      setLabel("");
      setCostOvnis(200);
      setValue(0);
      setStock("");
      setTimeout(() => setStatus("idle"), 2000);
    } else {
      setStatus("error");
      setErrorMsg(result.error);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
      <div>
        <label className="text-sm font-medium text-zinc-300">Nombre del premio</label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="ej: Corte gratis"
          required
          className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-white placeholder:text-zinc-500 focus:border-[#8cff59]/60 focus:outline-none"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-zinc-300">Tipo</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as PremioType)}
            className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-white focus:border-[#8cff59]/60 focus:outline-none"
          >
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-zinc-300">Costo (OVNIS)</label>
          <input
            type="number"
            min={1}
            step={1}
            value={costOvnis}
            onChange={(e) => setCostOvnis(Number(e.target.value))}
            required
            className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-white focus:border-[#8cff59]/60 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-zinc-300">Valor</label>
          <input
            type="number"
            min={0}
            step={1}
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-white focus:border-[#8cff59]/60 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-zinc-300">
            Stock <span className="text-zinc-500">(vacío = ilimitado)</span>
          </label>
          <input
            type="number"
            min={0}
            step={1}
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            placeholder="ilimitado"
            className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-white placeholder:text-zinc-500 focus:border-[#8cff59]/60 focus:outline-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={status === "saving"}
          className="neon-button rounded-[20px] px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
        >
          {status === "saving" ? "Guardando..." : "Crear premio"}
        </button>
        {status === "ok" && (
          <span className="text-sm font-medium text-[#8cff59]">Premio creado</span>
        )}
        {status === "error" && (
          <span className="text-sm font-medium text-red-300">{errorMsg}</span>
        )}
      </div>
    </form>
  );
}
