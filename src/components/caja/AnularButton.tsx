"use client";

import { useActionState, useState } from "react";
import type { AtencionFormState } from "@/app/(barbero)/caja/actions";

interface AnularButtonProps {
  atencionId: string;
  anularAction: (
    id: string,
    prevState: AtencionFormState,
    formData: FormData
  ) => Promise<AtencionFormState>;
}

export default function AnularButton({
  atencionId,
  anularAction,
}: AnularButtonProps) {
  const [open, setOpen] = useState(false);

  const boundAction = anularAction.bind(null, atencionId);
  const [state, formAction, isPending] = useActionState(boundAction, {});

  return (
    <div>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="min-h-[44px] px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-sm font-medium transition-colors"
        >
          Anular
        </button>
      ) : (
        <div className="mt-2 border border-red-200 rounded-lg p-3 bg-red-50">
          {state.error && (
            <p className="text-red-600 text-xs mb-2">{state.error}</p>
          )}
          <form action={formAction} className="flex flex-col gap-2">
            <label
              htmlFor={`motivo-${atencionId}`}
              className="text-sm font-medium text-gray-700"
            >
              Motivo de anulación <span className="text-red-500">*</span>
            </label>
            <input
              id={`motivo-${atencionId}`}
              name="motivoAnulacion"
              type="text"
              required
              placeholder="Ingresá el motivo..."
              className="min-h-[44px] w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400 bg-white"
            />
            {state.fieldErrors?.motivoAnulacion && (
              <p className="text-red-500 text-xs">
                {state.fieldErrors.motivoAnulacion}
              </p>
            )}
            <div className="flex gap-2 mt-1">
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 min-h-[44px] bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isPending ? "Anulando..." : "Confirmar anulación"}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="min-h-[44px] px-4 bg-white text-gray-600 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
