import MarcianoProfileForm from "@/components/marciano/MarcianoProfileForm";
import { requireMarcianoClient } from "@/lib/marciano-portal";

export default async function MarcianoPerfilPage() {
  const { client } = await requireMarcianoClient();

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <div className="public-panel rounded-[32px] p-6">
        <p className="public-badge inline-flex rounded-full px-3 py-1.5 text-[11px] font-semibold">
          Perfil Marciano
        </p>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <h2 className="font-display text-3xl font-semibold text-white sm:text-4xl">
              Ajusta como te vemos antes del corte
            </h2>
            <p className="max-w-2xl text-sm text-zinc-300">
              Acá podés mantener tu nombre, teléfono y preferencias al día para que el equipo tenga
              contexto sin tocar tu briefing interno.
            </p>
          </div>

          <div className="grid gap-2 text-sm text-zinc-300 sm:min-w-[220px]">
            <ProfileSummary label="Email" value={client.email ?? "Sin email"} />
            <ProfileSummary label="Telefono" value={client.phoneRaw ?? "Pendiente"} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="public-panel rounded-[28px] p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Resumen rapido
          </p>
          <div className="mt-4 space-y-3">
            <ProfileSummary label="Nombre visible" value={client.name} />
            <ProfileSummary label="Telefono" value={client.phoneRaw ?? "Pendiente"} />
            <ProfileSummary
              label="Preferencias"
              value={
                (client.preferences as { extraNotes?: string } | null)?.extraNotes
                  ? "Hay notas cargadas"
                  : "Sin notas cargadas"
              }
            />
          </div>
          <div className="mt-4 rounded-[24px] border border-[#8cff59]/20 bg-[#8cff59]/8 p-4 text-sm text-zinc-200">
            Este perfil ayuda a A51 a prepararte mejor, pero no cambia tu acceso interno.
          </div>
        </section>

        <section className="public-panel rounded-[28px] p-5">
          <MarcianoProfileForm
            client={{
              name: client.name,
              email: client.email,
              phoneRaw: client.phoneRaw,
              preferences: (client.preferences ?? null) as {
                allergies?: string;
                productPreferences?: string;
                extraNotes?: string;
              } | null,
            }}
          />
        </section>
      </div>
    </section>
  );
}

function ProfileSummary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
