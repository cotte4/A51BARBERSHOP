import Link from "next/link";
import MarcianoPasswordRecoveryForm from "@/components/marciano/MarcianoPasswordRecoveryForm";

export default function MarcianoRecoverPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-5xl items-center px-4 py-10">
      <div className="grid w-full gap-8 lg:grid-cols-[1.08fr_0.92fr]">
        <section className="public-panel hidden rounded-[36px] p-8 lg:block">
          <p className="public-badge inline-flex rounded-full px-3 py-1.5 text-[11px] font-semibold">
            Recuperacion Marciana
          </p>
          <h1 className="mt-5 font-display text-5xl font-semibold leading-none text-white">
            Recupera tu acceso sin salir del orbit.
          </h1>
          <p className="mt-5 max-w-lg text-base text-zinc-300">
            Te mandamos un link para crear una nueva contrasena y volver a entrar al portal.
          </p>

          <div className="mt-8 grid gap-3 text-sm text-zinc-300 sm:grid-cols-2">
            <AuthNote label="Destino" value="Tu email Marciano" />
            <AuthNote label="Uso" value="Solo para resetear clave" />
            <AuthNote label="Tiempo" value="En pocos minutos" />
            <AuthNote label="Soporte" value="Si no llega, revisamos tu acceso" />
          </div>
        </section>

        <section className="public-panel rounded-[36px] p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-400">
            Recuperar acceso
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold text-white">
            ¿Olvidaste tu contrasena?
          </h1>
          <p className="mt-3 text-sm text-zinc-400">
            Usa el email que A51 cargo para tu membresia Marciano.
          </p>

          <div className="mt-8">
            <MarcianoPasswordRecoveryForm />
          </div>

          <p className="mt-6 text-center text-sm text-zinc-400">
            <Link href="/marciano/login" className="text-[#8cff59] hover:text-[#b6ff84]">
              Volver al login
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
