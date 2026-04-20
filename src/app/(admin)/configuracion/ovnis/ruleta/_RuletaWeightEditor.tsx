"use client";

import { useState } from "react";
import { updateRuletaPrizeWeightAction } from "./actions";

interface Props {
  id: string;
  currentWeight: number;
}

export default function RuletaWeightEditor({ id, currentWeight }: Props) {
  const [weight, setWeight] = useState(currentWeight);
  const [status, setStatus] = useState<"idle" | "saving" | "ok" | "error">("idle");

  async function handleSave() {
    setStatus("saving");
    const result = await updateRuletaPrizeWeightAction(id, weight);
    setStatus(result.success ? "ok" : "error");
    if (result.success) setTimeout(() => setStatus("idle"), 1500);
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-zinc-500">Peso</span>
      <input
        type="number"
        min={1}
        step={1}
        value={weight}
        onChange={(e) => {
          setWeight(Number(e.target.value));
          setStatus("idle");
        }}
        className="w-16 rounded-xl border border-zinc-700 bg-zinc-900 px-2 py-1 text-sm text-white focus:border-[#8cff59]/60 focus:outline-none"
      />
      <button
        onClick={handleSave}
        disabled={status === "saving"}
        className="ghost-button rounded-[14px] px-2.5 py-1 text-xs font-medium disabled:opacity-50"
      >
        {status === "saving" ? "..." : status === "ok" ? "✓" : "OK"}
      </button>
      {status === "error" && (
        <span className="text-xs text-red-300">Error</span>
      )}
    </div>
  );
}
