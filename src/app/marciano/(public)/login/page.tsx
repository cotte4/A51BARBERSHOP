"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import MarcianoPublicShell from "@/components/marciano/MarcianoPublicShell";
import { signIn } from "@/lib/auth-client";

export default function MarcianoLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const { error: authError } = await signIn.email({
      email,
      password,
    });

    if (authError) {
      setError("No pudimos validar tu acceso. Revisa tu email y tu clave.");
      setLoading(false);
      return;
    }

    router.push("/marciano");
    router.refresh();
  }

  return (
    <MarcianoPublicShell
      badge="Club Marciano"
      title="La entrada al club"
      description="Entra con tu email y tu clave para ver tus cortes, mover tus turnos y entrar a tu Perfil Marciano."
      sideTitle="La entrada del club."
      sideDescription="Aca cae lo real de ser Marciano: tus cortes del mes, agenda propia, Style DNA y acceso al portal sin pasar por el staff."
      notes={[
        { label: "Cortes", value: "2 por mes" },
        { label: "Agenda", value: "Reserva y reprograma" },
        { label: "Perfil", value: "Style DNA propio" },
        { label: "Portal", value: "Turnos y seguridad" },
      ]}
      highlight="Gestiona cambios en tu agenda hasta 11 horas antes."
      footer={
        <div className="grid gap-3 sm:flex sm:flex-wrap">
          <Link
            href="/marciano/recuperar"
            className="flex min-h-[52px] items-center justify-center rounded-[22px] border border-white/10 bg-white/5 px-4 py-4 text-sm font-medium text-zinc-200 transition hover:border-[#8cff59]/22 hover:text-white sm:min-h-[44px] sm:flex-1 sm:rounded-full sm:px-5 sm:py-0"
          >
            Recuperar acceso
          </Link>
          <Link
            href="/marciano/registro"
            className="flex min-h-[52px] items-center justify-center rounded-[22px] border border-[#8cff59]/18 bg-[#8cff59]/8 px-4 py-4 text-sm font-medium text-[#d8ffca] transition hover:border-[#8cff59]/28 hover:bg-[#8cff59]/12 sm:min-h-[44px] sm:flex-1 sm:rounded-full sm:px-5 sm:py-0"
          >
            Activar mi portal
          </Link>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium text-zinc-300">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-12 w-full rounded-2xl border border-zinc-700 bg-zinc-950/75 px-4 text-zinc-50 outline-none focus:border-[#8cff59] focus:ring-2 focus:ring-[#8cff59]/20"
            placeholder="tu@email.com"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-medium text-zinc-300">
            Clave
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-12 w-full rounded-2xl border border-zinc-700 bg-zinc-950/75 px-4 text-zinc-50 outline-none focus:border-[#8cff59] focus:ring-2 focus:ring-[#8cff59]/20"
            placeholder="Tu clave Marciana"
          />
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="neon-button h-12 w-full rounded-2xl text-base font-semibold disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </MarcianoPublicShell>
  );
}
