"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import MarcianoPublicShell from "@/components/marciano/MarcianoPublicShell";
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
    <MarcianoPublicShell
      badge="Club Marciano"
      title="Sube a la nave"
      description="Usa el email que A51 cargo para tu membresia. Desde aca reservas, ves tus beneficios y te mueves por tu carril sin tocar la base interna."
      sideTitle="El acceso VIP del club: turnos, beneficios y codigo propio."
      sideDescription="Esto no es el login del staff. Es la entrada Marciana: mas club, mas noche, mas acceso rapido para la gente que ya juega del lado de adentro."
      notes={[
        { label: "Ingreso", value: "Email y clave" },
        { label: "Ruta", value: "/marcianos" },
        { label: "Codigo", value: "VIP Marciano" },
        { label: "Uso", value: "Portal, turnos y seguridad" },
      ]}
      footer={
        <div className="grid gap-3 rounded-[24px] border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
          <p>
            <Link href="/marcianos/recuperar" className="font-medium text-[#8cff59] hover:text-[#b6ff95]">
              Recuperar acceso
            </Link>
          </p>
          <p>
            <Link href="/marcianos/registro" className="font-medium text-[#8cff59] hover:text-[#b6ff95]">
              Activar mi portal
            </Link>
          </p>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-[26px] border border-white/10 bg-white/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">
            Acceso del club
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            Solo para Marcianos. Si eres staff, la puerta correcta sigue siendo la base interna.
          </p>
        </div>

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
          {loading ? "Subiendo..." : "Entrar"}
        </button>
      </form>
    </MarcianoPublicShell>
  );
}
