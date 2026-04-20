"use client";

import { useState } from "react";
import { claimResultAction } from "./actions";

interface Props {
  betId: string;
  isChallenger: boolean;
  myClaim: string | null;
  claimAttempts: number;
}

const OUTCOME_MESSAGES: Record<string, string> = {
  waiting_other: "Claim enviado. Esperando al otro jugador...",
  settled: "¡Apuesta resuelta! Revisá tu wallet.",
  disputed: "No se pusieron de acuerdo. Nueva ronda de claims.",
  both_lost: "Tres intentos sin acuerdo. El universo los castigó a ambos.",
};

const CLAIM_LABELS: Record<string, string> = {
  won: "Gané",
  lost: "Perdí",
  forfeit: "Me rindo",
};

export default function ClaimResultPanel({ betId, isChallenger, myClaim, claimAttempts }: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [outcome, setOutcome] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleClaim(claim: "won" | "lost" | "forfeit") {
    setStatus("loading");
    setErrorMsg("");
    const result = await claimResultAction(betId, claim);
    if (result.success) {
      setOutcome(result.outcome);
      setStatus("done");
    } else {
      setStatus("error");
      setErrorMsg(result.error);
    }
  }

  if (status === "done" && outcome) {
    return (
      <div className="rounded-[22px] border border-[#8cff59]/25 bg-[#8cff59]/10 p-5 text-center">
        <p className="font-semibold text-[#8cff59]">
          {OUTCOME_MESSAGES[outcome] ?? "Procesado."}
        </p>
        {(outcome === "settled" || outcome === "both_lost") && (
          <a
            href="/marciano/ovnis"
            className="mt-3 block text-sm text-[#8cff59] hover:underline"
          >
            Ver mi wallet →
          </a>
        )}
      </div>
    );
  }

  if (myClaim !== null) {
    return (
      <div className="rounded-[22px] border border-zinc-700 bg-zinc-900/40 p-5 text-center">
        <p className="text-sm font-medium text-zinc-300">
          Ya enviaste tu claim:{" "}
          <span className="font-bold text-white">
            {CLAIM_LABELS[myClaim] ?? myClaim}
          </span>
        </p>
        <p className="mt-1 text-xs text-zinc-500">Esperando al otro jugador...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {claimAttempts > 0 && (
        <div className="rounded-[18px] border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-center">
          <p className="text-xs font-semibold text-amber-300">
            Intento {claimAttempts} de 3 — No se pusieron de acuerdo anteriormente.
          </p>
          <p className="mt-0.5 text-xs text-amber-200/70">
            Al tercer desacuerdo, ambos pierden sus OVNIS.
          </p>
        </div>
      )}

      <p className="text-center text-sm font-medium text-zinc-300">
        ¿Cómo terminó la partida?
      </p>

      <div className="flex flex-col gap-2">
        <button
          onClick={() => handleClaim("won")}
          disabled={status === "loading"}
          className="neon-button rounded-[20px] py-3.5 text-sm font-bold disabled:opacity-50"
        >
          {status === "loading" ? "..." : "Gané 🏆"}
        </button>
        <button
          onClick={() => handleClaim("lost")}
          disabled={status === "loading"}
          className="ghost-button rounded-[20px] py-3.5 text-sm font-semibold disabled:opacity-50"
        >
          {status === "loading" ? "..." : "Perdí"}
        </button>
        <button
          onClick={() => handleClaim("forfeit")}
          disabled={status === "loading"}
          className="rounded-[20px] border border-zinc-700 bg-zinc-900 py-3.5 text-sm font-semibold text-zinc-400 hover:bg-zinc-800 disabled:opacity-50"
        >
          {status === "loading" ? "..." : "Me rindo (otro gana automáticamente)"}
        </button>
      </div>

      {status === "error" && (
        <p className="text-center text-sm text-red-300">{errorMsg}</p>
      )}
    </div>
  );
}
