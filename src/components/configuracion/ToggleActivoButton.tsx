"use client";

import { useTransition } from "react";

interface ToggleActivoButtonProps {
  id: string;
  activo: boolean;
  toggleAction: (id: string, activo: boolean) => Promise<void>;
}

export default function ToggleActivoButton({
  id,
  activo,
  toggleAction,
}: ToggleActivoButtonProps) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => startTransition(() => toggleAction(id, activo))}
      disabled={isPending}
      className={`inline-flex min-h-[46px] items-center justify-center rounded-2xl px-4 text-sm font-semibold transition ${
        activo
          ? "bg-stone-900 text-white hover:bg-stone-700"
          : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100"
      } disabled:opacity-50`}
    >
      {isPending ? "Actualizando..." : activo ? "Desactivar" : "Activar"}
    </button>
  );
}
