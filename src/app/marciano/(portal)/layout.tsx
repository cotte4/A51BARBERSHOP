import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
import { requireMarcianoClient } from "@/lib/marciano-portal";

export default async function MarcianoPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { client } = await requireMarcianoClient();
  const hasPhone = Boolean(client.phoneRaw);

  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-4 sm:py-6">
      <header className="sticky top-3 z-20 mb-6 rounded-[30px] border border-white/10 bg-black/35 px-5 py-4 backdrop-blur">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#8cff59]">
                Portal Marciano
              </p>
              <span className="rounded-full border border-[#8cff59]/20 bg-[#8cff59]/10 px-3 py-1 text-[11px] font-semibold text-[#d8ffc7]">
                Acceso activo
              </span>
            </div>
            <div>
              <h1 className="font-display text-2xl font-semibold text-white sm:text-3xl">
                {client.name}
              </h1>
              <p className="mt-1 text-sm text-zinc-400">
                Tu panel personal para turnos, perfil y seguridad.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-zinc-300">
              <PortalChip label="Email" value={client.email ?? "Sin email"} />
              <PortalChip label="Telefono" value={hasPhone ? "Cargado" : "Pendiente"} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/marciano"
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 hover:border-[#8cff59]/30 hover:text-white"
            >
              Inicio
            </Link>
            <Link
              href="/marciano/turnos"
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 hover:border-[#8cff59]/30 hover:text-white"
            >
              Turnos
            </Link>
            <Link
              href="/marciano/perfil"
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 hover:border-[#8cff59]/30 hover:text-white"
            >
              Perfil
            </Link>
            <Link
              href="/marciano/seguridad"
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 hover:border-[#8cff59]/30 hover:text-white"
            >
              Seguridad
            </Link>
            <LogoutButton redirectTo="/marcianos" />
          </div>
        </div>
      </header>

      <main className="pb-8">{children}</main>
    </div>
  );
}

function PortalChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
      <span className="uppercase tracking-[0.18em] text-zinc-500">{label}</span>
      <span className="font-medium text-white">{value}</span>
    </span>
  );
}
