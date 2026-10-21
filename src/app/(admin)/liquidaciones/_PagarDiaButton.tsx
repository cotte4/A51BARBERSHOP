"use client";

import { useActionState } from "react";
import type { MarcarPagadaState } from "./actions";

const initialState: MarcarPagadaState = {};

export default function PagarDiaButton({
  action,
}: {
  action: (prevState: MarcarPagadaState, formData: FormData) => Promise<MarcarPagadaState>;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <button
        type="submit"
        disabled={pending}
        className="ghost-button inline-flex min-h-[40px] items-center justify-center rounded-xl px-3 text-sm font-semibold disabled:opacity-50"
      >
        {pending ? "Guardando…" : "Pagado"}
      </button>
      {state.error ? <p className="text-xs text-red-300">{state.error}</p> : null}
    </form>
  );
}
