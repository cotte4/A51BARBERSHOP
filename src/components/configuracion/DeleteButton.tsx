"use client";

import { useState } from "react";
import ActionButton from "@/components/ui/ActionButton";

interface DeleteButtonProps {
  deleteAction: () => Promise<void>;
  label?: string;
  confirmMessage?: string;
}

export default function DeleteButton({
  deleteAction,
  label = "Eliminar",
  confirmMessage = "¿Estás seguro? Esta acción no se puede deshacer.",
}: DeleteButtonProps) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex min-h-[44px] items-center justify-center rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-200 transition hover:border-rose-400/60 hover:bg-rose-500/15"
      >
        {label}
      </button>
    );
  }

  return (
    <div
      className="rounded-[22px] border border-rose-500/30 bg-zinc-950/90 p-4 shadow-[0_20px_50px_rgba(127,29,29,0.14)]"
      style={{ animation: "a51-btn-scale-in 0.18s ease-out both" }}
    >
      <p className="text-sm font-semibold text-rose-200">Confirmar eliminación</p>
      <p className="mt-1 text-sm leading-6 text-zinc-400">{confirmMessage}</p>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="inline-flex min-h-[42px] flex-1 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-900 px-4 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800"
        >
          Cancelar
        </button>
        <ActionButton
          variant="danger"
          onAction={async () => {
            await deleteAction();
            setConfirming(false);
          }}
          successText="Eliminado"
          className="min-h-[42px] flex-1"
        >
          Confirmar
        </ActionButton>
      </div>
    </div>
  );
}
