"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
    <div className="app-shell min-h-screen px-4">
      <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center py-10">
        <div className="grid w-full max-w-5xl gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="panel-card hidden overflow-hidden rounded-[32px] p-8 text-white lg:block">
            <div className="flex h-full flex-col justify-between">
              <div>
                <p className="eyebrow text-xs font-semibold">A51 Barber Shop</p>
                <h1 className="font-display mt-4 max-w-md text-5xl font-bold leading-none">
                  Nave madre para cobrar, coordinar y operar sin friccion.
                </h1>
                <p className="mt-5 max-w-lg text-base text-zinc-300">
                  Tema nocturno, acciones rapidas y foco total en caja, agenda y clientes.
                </p>
              </div>

              <div className="panel-soft rounded-[28px] p-5">
                <div className="flex items-center gap-4">
                  <Image
                    src="/a51barbershop.jpeg"
                    alt="A51 Barber Shop"
                    width={84}
                    height={84}
                    className="rounded-3xl object-cover ring-1 ring-[#8cff59]/25"
                    priority
                  />
                  <div>
                    <p className="eyebrow text-[11px] font-semibold">Modo nocturno activo</p>
                    <p className="font-display mt-2 text-2xl font-semibold text-[#8cff59]">
                      Base de control
                    </p>
                    <p className="mt-2 text-sm text-zinc-300">
                      Entra y sigue la jornada desde el centro de comando.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className="panel-card w-full rounded-[32px] p-6 sm:p-8">
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex justify-center lg:hidden">
                <Image
                  src="/a51barbershop.jpeg"
                  alt="A51 Barber Shop"
                  width={72}
                  height={72}
                  className="rounded-3xl object-cover ring-1 ring-[#8cff59]/25"
                  priority
                />
              </div>
              <h1 className="font-display text-4xl font-bold text-white">Ingreso de agentes</h1>
              <p className="mt-2 text-sm text-zinc-400">Sistema interno de gestion A51</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-zinc-300">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="h-12 w-full rounded-2xl border border-zinc-700 bg-zinc-950/75 px-4 text-zinc-50 outline-none focus:border-[#8cff59] focus:ring-2 focus:ring-[#8cff59]/20"
                  placeholder="tu@email.com"
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
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="h-12 w-full rounded-2xl border border-zinc-700 bg-zinc-950/75 px-4 text-zinc-50 outline-none focus:border-[#8cff59] focus:ring-2 focus:ring-[#8cff59]/20"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <div className="rounded-2xl border border-rose-500/35 bg-rose-500/10 p-3">
                  <p className="text-sm text-rose-200">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="neon-button h-12 w-full rounded-2xl text-base font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Ingresando..." : "Entrar a la base"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
