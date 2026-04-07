"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn } from "@/lib/auth-client";

export default function MarcianoLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const { error: authError } = await signIn.email({
      email,
      password,
    });

    if (authError) {
      setError("No pudimos validar tu acceso Marciano. Revisá tu email y contraseña.");
      setLoading(false);
      return;
    }

    router.push("/marciano");
    router.refresh();
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl items-center px-4 py-10">
      <div className="grid w-full gap-8 lg:grid-cols-[1.08fr_0.92fr]">
        <section className="public-panel hidden rounded-[36px] p-8 lg:block">
          <p className="public-badge inline-flex rounded-full px-3 py-1.5 text-[11px] font-semibold">
            Los Marcianos de A51
          </p>
          <h1 className="mt-5 font-display text-5xl font-semibold leading-none text-white">
            Tu vista VIP para reservar, seguir beneficios y caer con ventaja.
          </h1>
          <p className="mt-5 max-w-lg text-base text-zinc-300">
            Desde aca vas a ver tu estado del mes, tu historial y el catalogo que A51 preparo para
            vos.
          </p>

          <div className="mt-8 grid gap-3 text-sm text-zinc-300 sm:grid-cols-2">
            <AuthNote label="Acceso" value="Email y clave" />
            <AuthNote label="Uso" value="Portal, turnos y seguridad" />
            <AuthNote label="Soporte" value="Si olvidaste la clave, la recuperas aca" />
            <AuthNote label="Velocidad" value="Entrar y reservar en pocos pasos" />
          </div>
        </section>

        <section className="public-panel rounded-[36px] p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-400">
            Acceso Marciano
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold text-white">Entra al portal</h1>
          <p className="mt-3 text-sm text-zinc-400">
            Usa el email que A51 cargo para tu membresia Marciano.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
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
                Contrasena
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-12 w-full rounded-2xl border border-zinc-700 bg-zinc-950/75 px-4 text-zinc-50 outline-none focus:border-[#8cff59] focus:ring-2 focus:ring-[#8cff59]/20"
                placeholder="••••••••"
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

          <div className="mt-6 grid gap-3 rounded-[24px] border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
            <p>
              <Link href="/marciano/recuperar" className="font-medium text-[#8cff59] hover:text-[#b6ff95]">
                Recuperar acceso
              </Link>
            </p>
            <p>
              <Link href="/marciano/registro" className="font-medium text-[#8cff59] hover:text-[#b6ff95]">
                Activar mi portal
              </Link>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

function AuthNote({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">{label}</p>
      <p className="mt-1 font-medium text-white">{value}</p>
    </div>
  );
}
