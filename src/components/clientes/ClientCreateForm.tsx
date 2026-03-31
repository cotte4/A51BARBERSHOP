"use client";

import { useActionState, useEffect, useState } from "react";
import {
  createClientAction,
  type ClientFormState,
} from "@/app/(barbero)/clientes/actions";
import ClientAvatarUploader from "@/components/clientes/ClientAvatarUploader";

const initialState: ClientFormState = {};

type ClientCreateFormProps = {
  isAdmin: boolean;
};

export default function ClientCreateForm({ isAdmin }: ClientCreateFormProps) {
  const [state, action, pending] = useActionState(createClientAction, initialState);
  const [confirmDuplicate, setConfirmDuplicate] = useState(false);

  useEffect(() => {
    if (!state.possibleDuplicates?.length) {
      setConfirmDuplicate(false);
    }
  }, [state.possibleDuplicates]);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="confirmDuplicate" value={confirmDuplicate ? "true" : "false"} />

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="space-y-4">
          <ClientAvatarUploader />

          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">
              Nombre
            </label>
            <input
              id="name"
              name="name"
              required
              className="h-12 w-full rounded-xl border border-gray-300 px-4 text-sm text-gray-900 outline-none focus:border-gray-900"
            />
            {state.fieldErrors?.name ? (
              <p className="mt-1 text-sm text-red-600">{state.fieldErrors.name}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor="phoneRaw" className="mb-1 block text-sm font-medium text-gray-700">
              Teléfono
            </label>
            <input
              id="phoneRaw"
              name="phoneRaw"
              className="h-12 w-full rounded-xl border border-gray-300 px-4 text-sm text-gray-900 outline-none focus:border-gray-900"
            />
            {state.fieldErrors?.phoneRaw ? (
              <p className="mt-1 text-sm text-red-600">{state.fieldErrors.phoneRaw}</p>
            ) : null}
          </div>

          {isAdmin ? (
            <label className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700">
              <input type="checkbox" name="esMarciano" className="size-4 rounded border-gray-300" />
              Crear como Marciano
            </label>
          ) : null}

          <div>
            <label htmlFor="tags" className="mb-1 block text-sm font-medium text-gray-700">
              Tags
            </label>
            <input
              id="tags"
              name="tags"
              placeholder="puntual, trae-referidos, corte-clasico"
              className="h-12 w-full rounded-xl border border-gray-300 px-4 text-sm text-gray-900 outline-none focus:border-gray-900"
            />
          </div>

          <div>
            <label htmlFor="allergies" className="mb-1 block text-sm font-medium text-gray-700">
              Alergias
            </label>
            <input
              id="allergies"
              name="allergies"
              className="h-12 w-full rounded-xl border border-gray-300 px-4 text-sm text-gray-900 outline-none focus:border-gray-900"
            />
          </div>

          <div>
            <label
              htmlFor="productPreferences"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Preferencias de producto
            </label>
            <input
              id="productPreferences"
              name="productPreferences"
              className="h-12 w-full rounded-xl border border-gray-300 px-4 text-sm text-gray-900 outline-none focus:border-gray-900"
            />
          </div>

          <div>
            <label htmlFor="extraNotes" className="mb-1 block text-sm font-medium text-gray-700">
              Extra preferencias
            </label>
            <input
              id="extraNotes"
              name="extraNotes"
              className="h-12 w-full rounded-xl border border-gray-300 px-4 text-sm text-gray-900 outline-none focus:border-gray-900"
            />
          </div>

          <div>
            <label htmlFor="notes" className="mb-1 block text-sm font-medium text-gray-700">
              Nota general
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={4}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-900"
            />
          </div>
        </div>
      </div>

      {state.error ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p>{state.error}</p>
          {state.possibleDuplicates?.length ? (
            <>
              <ul className="mt-3 space-y-1">
                {state.possibleDuplicates.map((duplicate) => (
                  <li key={duplicate.id}>
                    {duplicate.name} {duplicate.phoneRaw ? `• ${duplicate.phoneRaw}` : ""}
                  </li>
                ))}
              </ul>
              <button
                type="submit"
                onClick={() => setConfirmDuplicate(true)}
                className="mt-3 rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white"
              >
                Crear igual
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="h-12 w-full rounded-xl bg-gray-900 px-4 text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Guardando..." : "Crear cliente"}
      </button>
    </form>
  );
}
