"use client";

import { useState } from "react";
import { updateOvnisValueAction } from "./actions";

interface Props {
  entityId: string;
  entityType: "servicio" | "producto";
  currentValue: number;
}

export default function OvnisValueEditor({ entityId, entityType, currentValue }: Props) {
  const [value, setValue] = useState(currentValue);
  const [status, setStatus] = useState<"idle" | "saving" | "ok" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSave() {
    setStatus("saving");
    setErrorMsg("");
    const result = await updateOvnisValueAction(entityId, entityType, value);
    if (result.success) {
      setStatus("ok");
      setTimeout(() => setStatus("idle"), 1800);
    } else {
      setStatus("error");
      setErrorMsg(result.error);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={0}
        step={1}
        value={value}
        onChange={(e) => {
          setValue(Number(e.target.value));
          setStatus("idle");
        }}
        className="w-24 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-sm text-white focus:border-[#8cff59]/60 focus:outline-none"
      />
      <button
        onClick={handleSave}
        disabled={status === "saving"}
        className="ghost-button rounded-[16px] px-3 py-1.5 text-sm font-medium disabled:opacity-50"
      >
        {status === "saving" ? "..." : "Guardar"}
      </button>
      {status === "ok" && (
        <span className="text-xs font-medium text-[#8cff59]">Guardado</span>
      )}
      {status === "error" && (
        <span className="text-xs font-medium text-red-300">{errorMsg}</span>
      )}
    </div>
  );
}
