"use client";

import { useActionState } from "react";
import { changeMarcianoPasswordAction, type MarcianoPasswordState } from "@/app/marciano/actions";

const initialState: MarcianoPasswordState = {};

export default function MarcianoChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changeMarcianoPasswordAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <SecurityPill label="Paso 1" value="Confirmar clave actual" />
        <SecurityPill label="Paso 2" value="Crear nueva clave" />
        <SecurityPill label="Paso 3" value="Cerrar otras sesiones" />
      </div>

      <div>
        <label htmlFor="currentPassword" className="mb-2 block text-sm font-medium text-zinc-300">
          Contrasena actual
        </label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          className="h-12 w-full rounded-2xl border border-zinc-700 bg-zinc-950/75 px-4 text-zinc-50 outline-none focus:border-[#8cff59] focus:ring-2 focus:ring-[#8cff59]/20"
        />
        {state.fieldErrors?.currentPassword ? (
          <p className="mt-2 text-sm text-rose-300">{state.fieldErrors.currentPassword}</p>
        ) : null}
      </div>

      <div>
        <label htmlFor="newPassword" className="mb-2 block text-sm font-medium text-zinc-300">
          Nueva contrasena
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          className="h-12 w-full rounded-2xl border border-zinc-700 bg-zinc-950/75 px-4 text-zinc-50 outline-none focus:border-[#8cff59] focus:ring-2 focus:ring-[#8cff59]/20"
        />
        {state.fieldErrors?.newPassword ? (
          <p className="mt-2 text-sm text-rose-300">{state.fieldErrors.newPassword}</p>
        ) : null}
      </div>

      <div>
        <label htmlFor="confirmPassword" className="mb-2 block text-sm font-medium text-zinc-300">
          Confirmar nueva contrasena
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          className="h-12 w-full rounded-2xl border border-zinc-700 bg-zinc-950/75 px-4 text-zinc-50 outline-none focus:border-[#8cff59] focus:ring-2 focus:ring-[#8cff59]/20"
        />
        {state.fieldErrors?.confirmPassword ? (
          <p className="mt-2 text-sm text-rose-300">{state.fieldErrors.confirmPassword}</p>
        ) : null}
      </div>

      <div className="rounded-[24px] border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
        Cambiar la clave cierra las sesiones viejas para que el acceso quede limpio.
      </div>

      {state.message ? (
        <div
          className={`rounded-2xl border p-3 text-sm ${
            state.success
              ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
              : "border-rose-500/25 bg-rose-500/10 text-rose-200"
          }`}
        >
          {state.message}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="neon-button h-12 w-full rounded-[20px] text-sm font-semibold disabled:opacity-50"
      >
        {pending ? "Guardando..." : "Cambiar contrasena"}
      </button>
    </form>
  );
}

function SecurityPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
