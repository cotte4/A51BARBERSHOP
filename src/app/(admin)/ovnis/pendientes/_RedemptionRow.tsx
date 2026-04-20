"use client";

import { useState } from "react";
import { entregarRedemptionAction, cancelarRedemptionAction } from "./actions";

interface Props {
  id: string;
  clientName: string;
  prizeLabel: string;
  costOvnis: number;
  redeemedAt: string;
}

function formatOvnis(n: number) {
  return `${n.toLocaleString("es-AR")} OVNIS`;
}

export default function RedemptionRow({ id, clientName, prizeLabel, costOvnis, redeemedAt }: Props) {
  const [cancelMode, setCancelMode] = useState(false);
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  if (status === "done") return null;

  async function handleEntregar() {
    setStatus("loading");
    const result = await entregarRedemptionAction(id);
    if (result.success) {
      setStatus("done");
    } else {
      setStatus("error");
      setErrorMsg(result.error);
    }
  }

  async function handleCancelar() {
    if (!reason.trim()) return;
    setStatus("loading");
    const result = await cancelarRedemptionAction(id, reason);
    if (result.success) {
      setStatus("done");
    } else {
      setStatus("error");
      setErrorMsg(result.error);
    }
  }

  return (
    <div className="rounded-[22px] border border-zinc-800 bg-zinc-950/50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-white">{clientName}</p>
          <p className="mt-0.5 text-sm text-zinc-400">
            {prizeLabel} ·{" "}
            <span className="font-semibold text-[#8cff59]">{formatOvnis(costOvnis)}</span>
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">{redeemedAt}</p>
        </div>

        {!cancelMode && (
          <div className="flex gap-2">
            <button
              onClick={handleEntregar}
              disabled={status === "loading"}
              className="neon-button rounded-[16px] px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              {status === "loading" ? "..." : "Entregar"}
            </button>
            <button
              onClick={() => setCancelMode(true)}
              disabled={status === "loading"}
              className="ghost-button rounded-[16px] px-4 py-2 text-sm font-semibold disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>

      {cancelMode && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Motivo de cancelación..."
            className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-[#8cff59]/60 focus:outline-none"
          />
          <button
            onClick={handleCancelar}
            disabled={status === "loading" || !reason.trim()}
            className="ghost-button rounded-[16px] px-3 py-2 text-sm font-semibold disabled:opacity-50"
          >
            {status === "loading" ? "..." : "Confirmar"}
          </button>
          <button
            onClick={() => { setCancelMode(false); setReason(""); }}
            className="text-sm text-zinc-500 hover:text-zinc-300"
          >
            Volver
          </button>
        </div>
      )}

      {status === "error" && (
        <p className="mt-2 text-sm text-red-300">{errorMsg}</p>
      )}
    </div>
  );
}
