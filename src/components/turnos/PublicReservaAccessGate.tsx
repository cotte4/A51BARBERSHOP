"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type PublicReservaAccessGateProps = {
  slug: string;
  barberoNombre: string;
  allowAuthenticatedBypass?: boolean;
};

export default function PublicReservaAccessGate({
  slug,
  barberoNombre,
  allowAuthenticatedBypass = true,
}: PublicReservaAccessGateProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/reservar/access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          slug,
          password,
        }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "No pudimos validar la clave.");
      }

      router.refresh();
    } catch (accessError) {
      setError(accessError instanceof Error ? accessError.message : "No pudimos validar la clave.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="public-panel public-glow rounded-[36px] border border-white/10 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:p-8">
      <div className="max-w-2xl space-y-4">
        <p className="eyebrow text-[#8cff59]">Puerta de acceso</p>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          Nave de {barberoNombre}
        </h1>
        <p className="text-sm text-zinc-300 sm:text-base">
          Este link se mueve con clave para cuidar la agenda publica. Si ya entraste con tu cuenta,
          la puerta se abre sola.
        </p>
        <p className="text-sm text-zinc-400">
          Marcianos del club: entren directo desde <span className="text-white">/marcianos</span>.
        </p>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(300px,0.95fr)]">
        <form onSubmit={handleSubmit} className="rounded-[30px] border border-white/10 bg-black/25 p-5">
          <label htmlFor="publicReservaPassword" className="text-sm font-medium text-zinc-300">
            Clave de acceso
          </label>
          <input
            id="publicReservaPassword"
            type="text"
            autoComplete="one-time-code"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Escribí la clave que te pasaron"
            className="mt-3 min-h-[52px] w-full rounded-2xl border border-zinc-700 bg-zinc-950/80 px-4 text-white placeholder:text-zinc-500 outline-none focus:border-[#8cff59]/60"
          />
          <p className="mt-3 text-sm text-zinc-400">
            Cuando valida, la nave queda abierta en este dispositivo y no la volvés a cargar cada rato.
          </p>

          {error ? (
            <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/15 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting || password.trim().length === 0}
            className="neon-button mt-5 inline-flex min-h-[52px] w-full items-center justify-center rounded-2xl px-5 text-sm font-semibold transition disabled:opacity-50"
          >
            {submitting ? "Verificando..." : "Entrar"}
          </button>
        </form>

        <aside className="space-y-4">
          <div className="rounded-[30px] border border-white/10 bg-white/5 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
              Cómo funciona
            </p>
            <div className="mt-4 space-y-3 text-sm text-zinc-300">
              <p>Si tenés link y clave, caés directo.</p>
              <p>Si ya estás logueado, la puerta se abre sola.</p>
              <p>Después ves los horarios, elegís servicio y mandás la solicitud.</p>
            </div>
          </div>

          <div className="rounded-[30px] border border-[#8cff59]/20 bg-[#8cff59]/8 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8cff59]">
              Acceso por cuenta
            </p>
            <p className="mt-2 text-sm text-zinc-200">
              {allowAuthenticatedBypass
                ? "Las cuentas autenticadas entran sin necesitar la clave."
                : "Si no tenés cuenta, pedí la clave al local o a tu barbero."}
            </p>
          </div>
        </aside>
      </div>
    </section>
  );
}
