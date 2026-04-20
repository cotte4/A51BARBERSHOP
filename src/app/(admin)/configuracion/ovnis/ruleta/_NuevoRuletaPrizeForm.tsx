"use client";

import { useState } from "react";
import { createRuletaPrizeAction } from "./actions";

type RuletaType = "ovnis" | "redemption_item" | "nada";

export default function NuevoRuletaPrizeForm() {
  const [label, setLabel] = useState("");
  const [type, setType] = useState<RuletaType>("ovnis");
  const [ovnisAmount, setOvnisAmount] = useState(111);
  const [weight, setWeight] = useState(10);
  const [status, setStatus] = useState<"idle" | "saving" | "ok" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setErrorMsg("");
    const result = await createRuletaPrizeAction({
      label,
      type,
      ovnisAmount: type === "ovnis" ? ovnisAmount : 0,
      weight,
    });
    if (result.success) {
      setStatus("ok");
      setLabel("");
      setOvnisAmount(111);
      setWeight(10);
      setTimeout(() => setStatus("idle"), 2000);
    } else {
      setStatus("error");
      setErrorMsg(result.error);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-zinc-300">Nombre</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="ej: +111 OVNIS"
            required
            className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-white placeholder:text-zinc-500 focus:border-[#8cff59]/60 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-zinc-300">Tipo</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as RuletaType)}
            className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-white focus:border-[#8cff59]/60 focus:outline-none"
          >
            <option value="ovnis">OVNIS</option>
            <option value="nada">Nada</option>
            <option value="redemption_item">Premio canjeable</option>
          </select>
        </div>

        {type === "ovnis" && (
          <div>
            <label className="text-sm font-medium text-zinc-300">Cantidad OVNIS</label>
            <input
              type="number"
              min={1}
              step={1}
              value={ovnisAmount}
              onChange={(e) => setOvnisAmount(Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-white focus:border-[#8cff59]/60 focus:outline-none"
            />
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-zinc-300">
            Peso <span className="text-zinc-500">(mayor = más probable)</span>
          </label>
          <input
            type="number"
            min={1}
            step={1}
            value={weight}
            onChange={(e) => setWeight(Number(e.target.value))}
            className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-white focus:border-[#8cff59]/60 focus:outline-none"
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
