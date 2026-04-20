"use client";

import { useState } from "react";
import { canjearAction } from "./actions";

interface Props {
  itemId: string;
  costOvnis: number;
  label: string;
}

export default function CanjearButton({ itemId, costOvnis, label }: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleCanjear() {
    setStatus("loading");
    const result = await canjearAction(itemId);
    if (result.success) {
      setStatus("done");
    } else {
      setStatus("error");
      setErrorMsg(result.error);
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-[16px] border border-[#8cff59]/25 bg-[#8cff59]/10 px-4 py-3 text-center">
        <p className="text-sm font-semibold text-[#8cff59]">¡Canjeado!</p>
        <p className="mt-0.5 text-xs text-zinc-400">Mostráselo al barbero.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleCanjear}
        disabled={status === "loading"}
        className="neon-button w-full rounded-[16px] py-3 text-sm font-semibold disabled:opacity-50"
      >
        {status === "loading" ? "Canjeando..." : `Canjear — ${costOvnis.toLocaleString("es-AR")} OVNIS`}
      </button>
      {status === "error" && (
        <p className="text-center text-xs text-red-300">{errorMsg}</p>
      )}
    </div>
  );
}
