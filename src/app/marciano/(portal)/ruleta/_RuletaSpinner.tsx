"use client";

import { useState } from "react";
import { formatOvnis } from "@/lib/ovnis";
import { girarRuletaAction } from "./actions";

type Prize = { label: string; type: string; ovnisAmount: number };

export default function RuletaSpinner() {
  const [status, setStatus] = useState<"idle" | "spinning" | "done" | "error">("idle");
  const [prize, setPrize] = useState<Prize | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleGirar() {
    setStatus("spinning");
    const result = await girarRuletaAction();
    if (result.success) {
      setPrize(result.prize);
      setStatus("done");
    } else {
      setStatus("error");
      setErrorMsg(result.error);
    }
  }

  if (status === "done" && prize) {
    return (
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="relative">
          <div className="flex h-32 w-32 items-center justify-center rounded-full border-2 border-[#8cff59]/40 bg-[#8cff59]/10 text-6xl shadow-[0_0_40px_rgba(140,255,89,0.25)]">
            {prize.type === "ovnis" ? "✨" : prize.type === "nada" ? "🌌" : "🎁"}
          </div>
        </div>

        <div className="space-y-2">
          <p className="eyebrow text-xs text-[#8cff59]">El universo habló</p>
          <p className="font-display text-2xl font-bold text-white">{prize.label}</p>
          {prize.type === "ovnis" && prize.ovnisAmount > 0 && (
            <p className="text-lg font-semibold text-[#8cff59]">
              +{formatOvnis(prize.ovnisAmount)}
            </p>
          )}
          {prize.type === "redemption_item" && (
            <p className="text-sm text-zinc-400">
              Premio canjeado — mostráselo al barbero en{" "}
              <a href="/marciano/ovnis/canjear" className="text-[#8cff59] hover:underline">
                Mis canjes
              </a>
            </p>
          )}
          {prize.type === "nada" && (
            <p className="text-sm text-zinc-500">
              El universo es caprichoso. Mejor suerte en la próxima visita.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-8 text-center">
      <div className="relative flex h-40 w-40 items-center justify-center">
        <div
          className={`absolute inset-0 rounded-full border-2 border-[#8cff59]/30 ${
            status === "spinning" ? "animate-spin" : ""
          }`}
          style={{ borderTopColor: "#8cff59" }}
        />
        <span className="text-6xl">{status === "spinning" ? "🌀" : "🛸"}</span>
      </div>

      <div className="space-y-2">
        <p className="font-display text-xl font-semibold text-white">La ruleta del universo</p>
        <p className="text-sm text-zinc-400">
          Una sola oportunidad. El universo decide tu destino.
        </p>
      </div>

      {status === "error" ? (
        <p className="text-sm text-red-300">{errorMsg}</p>
      ) : (
        <button
          onClick={handleGirar}
          disabled={status === "spinning"}
          className="neon-button rounded-[24px] px-10 py-4 text-lg font-bold disabled:opacity-50"
        >
          {status === "spinning" ? "Girando..." : "GIRAR"}
        </button>
      )}
    </div>
  );
}
