"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  requestMarcianoPasswordResetAction,
  type MarcianoPasswordState,
} from "@/app/marciano/actions";

const initialState: MarcianoPasswordState = {};

export default function MarcianoPasswordRecoveryForm() {
  const [state, formAction, pending] = useActionState(requestMarcianoPasswordResetAction, initialState);

  return (
    <form action={formAction} className="space-y-5" aria-busy={pending}>
      <div className="rounded-[26px] border border-white/10 bg-white/5 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
          Paso unico
        </p>
        <p className="mt-2 text-sm leading-6 text-zinc-300">
          Te enviamos un link seguro al correo registrado. Usalo una sola vez para crear una nueva
          clave.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-sm font-medium text-zinc-300">
          Email Marciano
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          className="h-12 w-full rounded-2xl border border-zinc-700 bg-zinc-950/75 px-4 text-zinc-50 outline-none transition focus:border-[#8cff59] focus:ring-2 focus:ring-[#8cff59]/20"
          placeholder="tu@email.com"
        />
        {state.fieldErrors?.email ? <p className="text-sm text-rose-300">{state.fieldErrors.email}</p> : null}
      </div>

      {state.message ? (
        <div
          className={`rounded-2xl border p-3 text-sm ${
            state.success
              ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
              : "border-white/10 bg-white/5 text-zinc-200"
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
        {pending ? "Enviando..." : "Mandar link seguro"}
      </button>

      <p className="text-center text-sm text-zinc-400">
        Ya recuperaste el acceso?{" "}
        <Link href="/marciano/login" className="text-[#8cff59] hover:text-[#b6ff84]">
          Volver al login
        </Link>
      </p>
    </form>
  );
}
