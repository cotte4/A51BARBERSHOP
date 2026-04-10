"use client";

import Link from "next/link";
import { useActionState } from "react";
import { resetMarcianoPasswordAction, type MarcianoPasswordState } from "@/app/marciano/actions";

type MarcianoPasswordResetFormProps = {
  token: string | null;
  tokenError: string | null;
};

const initialState: MarcianoPasswordState = {};

export default function MarcianoPasswordResetForm({
  token,
  tokenError,
}: MarcianoPasswordResetFormProps) {
  const [state, formAction, pending] = useActionState(resetMarcianoPasswordAction, initialState);
  const effectiveError = tokenError ?? (!token ? "El link de recuperacion no es valido." : null);

  return (
    <div className="space-y-5">
      {effectiveError ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 p-4 text-sm text-rose-200">
            {effectiveError}
          </div>
          <div className="rounded-[26px] border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
            <p className="font-semibold text-white">Probemos con un link nuevo</p>
            <p className="mt-2 leading-6">
              Pedimos otro correo de recuperacion y volvemos a cargar la pagina con ese acceso.
            </p>
            <Link
              href="/marciano/recuperar"
              className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-2xl border border-white/10 bg-black/30 px-4 text-sm font-semibold text-zinc-100 transition hover:border-[#8cff59]/30 hover:text-white"
            >
              Pedir nuevo link
            </Link>
          </div>
        </div>
      ) : (
        <form action={formAction} className="space-y-5" aria-busy={pending}>
          <input type="hidden" name="token" value={token ?? ""} />

          <div className="rounded-[26px] border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
              Seguridad
            </p>
            <p className="mt-2 text-sm leading-6 text-zinc-300">
              La nueva contrasena reemplaza la anterior en el acto. Elegi una que no compartas.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="newPassword" className="text-sm font-medium text-zinc-300">
              Nueva contrasena
            </label>
            <input
              id="newPassword"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              className="h-12 w-full rounded-2xl border border-zinc-700 bg-zinc-950/75 px-4 text-zinc-50 outline-none transition focus:border-[#8cff59] focus:ring-2 focus:ring-[#8cff59]/20"
            />
            {state.fieldErrors?.newPassword ? (
              <p className="text-sm text-rose-300">{state.fieldErrors.newPassword}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium text-zinc-300">
              Confirmar nueva contrasena
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              className="h-12 w-full rounded-2xl border border-zinc-700 bg-zinc-950/75 px-4 text-zinc-50 outline-none transition focus:border-[#8cff59] focus:ring-2 focus:ring-[#8cff59]/20"
            />
            {state.fieldErrors?.confirmPassword ? (
              <p className="text-sm text-rose-300">{state.fieldErrors.confirmPassword}</p>
            ) : null}
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
            {pending ? "Guardando..." : "Guardar nueva contrasena"}
          </button>
        </form>
      )}

      <p className="text-center text-sm text-zinc-400">
        <Link href="/marciano/login" className="text-[#8cff59] hover:text-[#b6ff84]">
          Volver al login
        </Link>
      </p>
    </div>
  );
}
