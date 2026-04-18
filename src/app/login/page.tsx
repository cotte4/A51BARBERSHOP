"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { signIn } from "@/lib/auth-client";

export default function LoginPage() {
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
      setError("Email o contrasena incorrectos. Revisa los datos e intenta de nuevo.");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="app-shell min-h-screen px-4 py-5 sm:px-6 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100vh-2.5rem)] max-w-md items-center justify-center">
        <div className="panel-card relative w-full overflow-hidden rounded-[30px] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.34)] sm:p-7">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -top-20 right-[-3.5rem] h-44 w-44 rounded-full bg-[#8cff59]/10 blur-3xl" />
            <div className="absolute bottom-[-5rem] left-[-3rem] h-40 w-40 rounded-full bg-white/5 blur-3xl" />
            <div className="absolute inset-x-5 top-24 h-px bg-gradient-to-r from-transparent via-[#8cff59]/22 to-transparent" />
          </div>

          <div className="relative z-10">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <Image
                  src="/a51barbershop.jpeg"
                  alt="A51 Barber Shop"
                  width={52}
                  height={52}
                  className="rounded-2xl object-cover ring-1 ring-[#8cff59]/25"
                  priority
                />
                <div>
                  <p className="eyebrow text-[11px] font-semibold">A51 Barber Shop</p>
                  <p className="font-display text-lg font-semibold text-white">Acceso interno</p>
                </div>
              </div>

              <span className="rounded-full border border-[#8cff59]/18 bg-[#8cff59]/8 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#b6ff84]">
                Online
              </span>
            </div>

            <div className="panel-soft mt-5 rounded-[26px] p-4 sm:p-5">
              <p className="eyebrow text-[10px] font-semibold">Acceso interno</p>
              <h1 className="font-display mt-2 text-[2rem] font-bold leading-[0.95] text-white sm:text-[2.35rem]">
                Base lista
              </h1>
              <p className="mt-3 max-w-sm text-sm leading-6 text-zinc-300">
                La base esta online. Vos entra.
              </p>

              <div className="mt-4 grid grid-cols-3 gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-300">
                <div className="rounded-2xl border border-white/8 bg-black/15 px-3 py-3 text-center">
                  Caja
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/15 px-3 py-3 text-center">
                  Turnos
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/15 px-3 py-3 text-center">
                  Gestion
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-zinc-300">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  autoComplete="email"
                  placeholder="tu@email.com"
                  className="h-12 w-full rounded-2xl border border-zinc-700 bg-zinc-950/75 px-4 text-zinc-50 outline-none focus:border-[#8cff59] focus:ring-2 focus:ring-[#8cff59]/20"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-zinc-300"
                >
                  Contrasena
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="Tu contrasena"
                  className="h-12 w-full rounded-2xl border border-zinc-700 bg-zinc-950/75 px-4 text-zinc-50 outline-none focus:border-[#8cff59] focus:ring-2 focus:ring-[#8cff59]/20"
                />
              </div>

              {error ? (
                <div className="rounded-2xl border border-rose-500/35 bg-rose-500/10 p-3">
                  <p className="text-sm text-rose-200">{error}</p>
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
          </div>
        </div>
      </div>
    </div>
  );
}
