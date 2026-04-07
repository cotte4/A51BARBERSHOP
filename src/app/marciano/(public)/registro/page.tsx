import Link from "next/link";
import MarcianoRegisterForm from "@/components/marciano/MarcianoRegisterForm";

export default function MarcianoRegistroPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-5xl items-center px-4 py-10">
      <div className="grid w-full gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="public-panel hidden rounded-[36px] p-8 lg:block">
          <p className="public-badge inline-flex rounded-full px-3 py-1.5 text-[11px] font-semibold">
            Activacion Marciana
          </p>
          <h1 className="mt-5 font-display text-5xl font-semibold leading-none text-white">
            Creá tu acceso VIP
          </h1>
          <p className="mt-5 max-w-lg text-base text-zinc-300">
            Si A51 ya cargó tu email en la membresía Marciano, desde acá podés crear tu contraseña
            y entrar.
          </p>

          <div className="mt-8 grid gap-3 text-sm text-zinc-300 sm:grid-cols-2">
            <AuthNote label="Paso 1" value="Validar tu email" />
            <AuthNote label="Paso 2" value="Crear tu clave" />
            <AuthNote label="Paso 3" value="Entrar al portal" />
            <AuthNote label="Soporte" value="Si no figurás, escribinos primero" />
          </div>
        </section>

        <section className="public-panel rounded-[36px] p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-400">
            Activacion Marciana
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold text-white">Creá tu acceso VIP</h1>
          <p className="mt-3 text-sm text-zinc-400">
            Si A51 ya cargó tu email en la membresía Marciano, desde acá podés crear tu contraseña y
            entrar.
          </p>

          <div className="mt-8">
            <MarcianoRegisterForm />
          </div>

          <p className="mt-6 text-center text-sm text-zinc-500">
            Si todavía no figurás, escribinos en la barber para validar tu email primero.
          </p>

          <p className="mt-3 text-center text-sm text-zinc-400">
            <Link href="/marciano/login" className="hover:text-white">
              Volver al login Marciano
            </Link>
          </p>
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
