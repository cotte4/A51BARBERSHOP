"use client";

import { useState } from "react";
import { resolverDisputaAction } from "./actions";

interface Props {
  betId: string;
  challengerName: string;
  challengerId: string;
  opponentName: string;
  opponentId: string;
  gameName: string;
  amount: number;
  claimAttempts: number;
  challengerClaim: string | null;
  opponentClaim: string | null;
}

function formatOvnis(n: number) {
  return `${n.toLocaleString("es-AR")} OVNIS`;
}

const CLAIM_LABELS: Record<string, string> = {
  won: "Ganó",
  lost: "Perdió",
  forfeit: "Rendido",
};

export default function DisputaRow({
  betId,
  challengerName,
  challengerId,
  opponentName,
  opponentId,
  gameName,
  amount,
  claimAttempts,
  challengerClaim,
  opponentClaim,
}: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  if (status === "done") {
    return (
      <div className="rounded-[22px] border border-[#8cff59]/25 bg-[#8cff59]/10 p-4">
        <p className="font-semibold text-[#8cff59]">Disputa resuelta</p>
      </div>
    );
  }

  async function handleResolver(winnerClientId: string) {
    setStatus("loading");
    const result = await resolverDisputaAction(betId, winnerClientId);
    if (result.success) {
      setStatus("done");
    } else {
      setStatus("error");
      setErrorMsg(result.error);
    }
  }

  return (
    <div className="rounded-[22px] border border-amber-500/35 bg-amber-500/10 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">
            {gameName} · Intento {claimAttempts} de 3
          </p>
          <p className="mt-1 font-semibold text-white">
            {challengerName} vs {opponentName}
          </p>
          <p className="mt-0.5 text-sm text-zinc-400">
            En juego:{" "}
            <span className="font-semibold text-[#8cff59]">{formatOvnis(amount)}</span> cada uno
          </p>

          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-zinc-300">
              {challengerName}:{" "}
              {challengerClaim ? CLAIM_LABELS[challengerClaim] ?? challengerClaim : "Sin claim"}
            </span>
            <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-zinc-300">
              {opponentName}:{" "}
              {opponentClaim ? CLAIM_LABELS[opponentClaim] ?? opponentClaim : "Sin claim"}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={() => handleResolver(challengerId)}
          disabled={status === "loading"}
          className="neon-button rounded-[16px] px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          {status === "loading" ? "..." : `Ganó ${challengerName}`}
        </button>
        <button
          onClick={() => handleResolver(opponentId)}
          disabled={status === "loading"}
          className="ghost-button rounded-[16px] px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          {status === "loading" ? "..." : `Ganó ${opponentName}`}
        </button>
      </div>

      {status === "error" && (
        <p className="mt-2 text-sm text-red-300">{errorMsg}</p>
      )}
    </div>
  );
}
