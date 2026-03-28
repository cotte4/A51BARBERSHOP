"use client";
import { useActionState } from "react";
import type { CierreFormState } from "@/app/(barbero)/caja/actions";

interface CerrarCajaButtonProps {
  cerrarAction: (prevState: CierreFormState, formData: FormData) => Promise<CierreFormState>;
}

export default function CerrarCajaButton({ cerrarAction }: CerrarCajaButtonProps) {
  const [state, formAction, isPending] = useActionState(cerrarAction, {});

  return (
    <form action={formAction}>
      {state.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
          {state.error}
        </div>
      )}
      <button
        type="submit"
        disabled={isPending}
        onClick={(e) => {
          if (!window.confirm("¿Confirmás el cierre de caja del día? Esta acción no se puede deshacer.")) {
            e.preventDefault();
          }
        }}
        className="min-h-[44px] w-full bg-gray-900 text-white rounded-lg text-sm font-semibold hover:bg-gray-700 transition-colors disabled:opacity-50"
      >
        {isPending ? "Cerrando caja..." : "Confirmar cierre del día"}
      </button>
    </form>
  );
}
