"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { signIn } from "@/lib/auth-client";
import {
  registerMarcianoAction,
  type MarcianoRegisterState,
} from "@/app/marciano/actions";

const initialState: MarcianoRegisterState = {};

export default function MarcianoRegisterForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(registerMarcianoAction, initialState);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [autoLoginError, setAutoLoginError] = useState("");

  useEffect(() => {
    if (!state.success) {
      return;
    }

    let cancelled = false;

    async function loginAfterRegister() {
      const { error } = await signIn.email({ email, password });

      if (cancelled) {
        return;
      }

      if (error) {
        setAutoLoginError(
          "La cuenta quedo creada, pero no pudimos iniciar sesion automaticamente. Probalo desde el login."
        );
        return;
      }

      router.push("/marciano");
      router.refresh();
    }

    void loginAfterRegister();

    return () => {
      cancelled = true;
    };
  }, [email, password, router, state.success]);

  useEffect(() => {
    if (!state.success) {
      setAutoLoginError("");
    }
  }, [state.success]);

  return (
    <form action={formAction} className="space-y-5" aria-busy={pending}>
      <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
          Alta Marciana
        </p>
        <p className="mt-2 text-sm leading-6 text-zinc-300">
          Validamos tu email, armas tu clave y te intentamos meter al portal en la misma pasada.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-sm font-medium text-zinc-300">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="tu@email.com"
          className="h-12 w-full rounded-2xl border border-zinc-700 bg-zinc-950/75 px-4 text-zinc-50 outline-none transition focus:border-[#8cff59] focus:ring-2 focus:ring-[#8cff59]/20"
        />
        {state.fields?.email ? <p className="text-sm text-rose-300">{state.fields.email}</p> : null}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="password" className="text-sm font-medium text-zinc-300">
          Clave
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Minimo 8 caracteres"
          className="h-12 w-full rounded-2xl border border-zinc-700 bg-zinc-950/75 px-4 text-zinc-50 outline-none transition focus:border-[#8cff59] focus:ring-2 focus:ring-[#8cff59]/20"
        />
        {state.fields?.password ? <p className="text-sm text-rose-300">{state.fields.password}</p> : null}
      </div>

      {state.message ? (
        <div
          className={`rounded-2xl border p-4 text-sm ${
            state.success
              ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
              : "border-white/10 bg-white/5 text-zinc-200"
          }`}
          aria-live="polite"
        >
          {state.message}
        </div>
      ) : null}

      {autoLoginError ? (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100">
          {autoLoginError}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="neon-button h-[52px] w-full rounded-[22px] text-base font-semibold disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Creando acceso..." : "Activar mi portal"}
      </button>

      <Link
        href="/marciano/login"
        className="flex min-h-[52px] items-center justify-center rounded-[22px] border border-white/10 bg-white/5 px-4 text-center text-sm font-medium text-zinc-300 transition hover:border-[#8cff59]/22 hover:text-white"
      >
        Ya tenes cuenta? Entrar desde aca
      </Link>
    </form>
  );
}
