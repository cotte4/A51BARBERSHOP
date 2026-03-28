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
      onClick={() => startTransition(() => toggleAction(id, activo))}
      disabled={isPending}
      className={`
        min-h-[44px] px-4 py-2 rounded-lg text-sm font-medium transition-colors
        ${
          activo
            ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
            : "bg-green-50 text-green-700 hover:bg-green-100"
        }
        disabled:opacity-50
      `}
    >
      {isPending ? "..." : activo ? "Desactivar" : "Activar"}
    </button>
  );
}
