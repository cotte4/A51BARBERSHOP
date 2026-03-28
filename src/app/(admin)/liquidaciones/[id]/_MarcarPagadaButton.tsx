"use client";

import { useActionState } from "react";
import type { MarcarPagadaState } from "../actions";

interface Props {
  marcarAction: (prevState: MarcarPagadaState, formData: FormData) => Promise<MarcarPagadaState>;
}

export default function MarcarPagadaButton({ marcarAction }: Props) {
  const [state, formAction, isPending] = useActionState(marcarAction, {});

  return (
    <form action={formAction}>
      {state.error && (
        <p className="text-red-500 text-sm mb-2">{state.error}</p>
      )}
      <button
        type="submit"
        disabled={isPending}
        onClick={e => {
          if (!window.confirm("¿Confirmás el pago de esta liquidación?")) e.preventDefault();
        }}
        className="min-h-[44px] w-full bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50"
      >
        {isPending ? "Guardando..." : "Marcar como pagada"}
      </button>
    </form>
  );
}
