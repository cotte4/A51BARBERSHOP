import Link from "next/link";
import MarcianoPasswordResetForm from "@/components/marciano/MarcianoPasswordResetForm";

type MarcianoResetPageProps = {
  searchParams: Promise<{ token?: string; error?: string }>;
};

export default async function MarcianoResetPage({ searchParams }: MarcianoResetPageProps) {
  const params = await searchParams;
  const tokenError =
    params.error === "INVALID_TOKEN" ? "El link de recuperacion ya vencio o no es valido." : null;

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl items-center px-4 py-10">
      <div className="grid w-full gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="public-panel hidden rounded-[36px] p-8 lg:block">
          <p className="public-badge inline-flex rounded-full px-3 py-1.5 text-[11px] font-semibold">
            Nueva contrasena
          </p>
          <h1 className="mt-5 font-display text-5xl font-semibold leading-none text-white">
            Volve a entrar al portal.
          </h1>
          <p className="mt-5 max-w-lg text-base text-zinc-300">
            Creá una nueva contrasena para tu acceso Marciano y seguí con la misma cuenta.
          </p>

          <div className="mt-8 grid gap-3 text-sm text-zinc-300 sm:grid-cols-2">
            <AuthNote label="Token" value={tokenError ? "Vencido" : "Valido"} />
            <AuthNote label="Clave" value="Nueva y segura" />
            <AuthNote label="Acceso" value="Portal Marciano" />
            <AuthNote label="Cierre" value="Reinicio limpio" />
          </div>
        </section>

        <section className="public-panel rounded-[36px] p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-400">
            Nueva contrasena
          </p>
          <h1 className="mt-3 font-display text-4xl font-semibold text-white">
            Volve a entrar al portal
          </h1>
          <p className="mt-3 text-sm text-zinc-400">
            Crea una nueva contrasena para tu acceso Marciano.
          </p>

          <div className="mt-8">
            <MarcianoPasswordResetForm token={params.token ?? null} tokenError={tokenError} />
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
