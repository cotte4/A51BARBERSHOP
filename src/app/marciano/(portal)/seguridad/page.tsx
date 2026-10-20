import Link from "next/link";
import MarcianoChangePasswordForm from "@/components/marciano/MarcianoChangePasswordForm";
import DeleteAccountPanel from "./_DeleteAccountPanel";
import { requireMarcianoClient } from "@/lib/marciano-portal";

export default async function MarcianoSecurityPage() {
  const { client } = await requireMarcianoClient();

  return (
    <div className="space-y-6">
      <section className="public-panel rounded-[32px] p-6">
        <p className="public-badge inline-flex rounded-full px-3 py-1.5 text-[11px] font-semibold">
          Seguridad
        </p>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <h1 className="font-display text-4xl font-semibold text-white sm:text-5xl">
              Protege tu acceso Marciano
            </h1>
            <p className="max-w-2xl text-sm text-zinc-300">
              Tu email de acceso actual es <span className="font-semibold text-white">{client.email}</span>.
              Desde acá podés cambiar la contraseña de tu portal y cerrar sesiones viejas.
            </p>
          </div>

          <div className="grid gap-2 text-sm text-zinc-300 sm:min-w-[220px]">
            <SecuritySummary label="Cuenta" value={client.email ?? "Sin email"} />
            <SecuritySummary label="Modo" value="Cambio con revocacion" />
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="public-panel rounded-[28px] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Lo que cambia
          </p>
          <div className="mt-4 space-y-3 text-sm text-zinc-300">
            <SecuritySummary label="Sesión" value="Se revocan otras sesiones activas" />
            <SecuritySummary label="Recuperación" value="Si te olvidaste, usá el flujo público" />
            <SecuritySummary label="Email" value="No cambia, sigue siendo tu identificador" />
          </div>
          <div className="mt-4 rounded-[24px] border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
            Mantener esta clave al día es la forma más simple de proteger tu acceso sin molestar al
            equipo.
          </div>
        </div>

        <section className="public-panel rounded-[28px] p-5">
          <h2 className="text-xl font-semibold text-white">Cambiar contraseña</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Si perdés el acceso por completo, también podés usar la recuperación publica.
          </p>
          <div className="mt-5">
            <MarcianoChangePasswordForm />
          </div>
        </section>
      </section>

      <section className="rounded-[24px] border border-white/10 bg-white/5 p-5 text-sm text-zinc-300">
        ¿Necesitas recuperar la cuenta desde cero? Usa{" "}
        <Link href="/marciano/recuperar" className="text-[#8cff59] hover:text-[#b6ff84]">
          la recuperación de contraseña
        </Link>
        .
      </section>

      {/* Zona de peligro */}
      <section className="flex flex-col gap-3">
        <p className="eyebrow text-xs text-red-400/70">Zona de peligro</p>
        <DeleteAccountPanel />
      </section>
    </div>
  );
}

function SecuritySummary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
