"use client";

import { useTransition } from "react";

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
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (window.confirm(confirmMessage)) {
      startTransition(() => deleteAction());
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="min-h-[44px] px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
    >
      {isPending ? "..." : label}
    </button>
  );
}
