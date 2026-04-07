import Link from "next/link";
import MarcianoTurnoCard from "@/components/marciano/MarcianoTurnoCard";
import { getMarcianoTurnosList, splitMarcianoTurnos } from "@/lib/marciano-turnos";
import { requireMarcianoClient } from "@/lib/marciano-portal";

type MarcianoTurnosPageProps = {
  searchParams: Promise<{ estado?: string }>;
};

export default async function MarcianoTurnosPage({ searchParams }: MarcianoTurnosPageProps) {
  const { client } = await requireMarcianoClient();
  const params = await searchParams;
  const turnos = await getMarcianoTurnosList(client.id);
  const { proximos, historial } = splitMarcianoTurnos(turnos);
  const feedback = getFeedbackMessage(params.estado);

  return (
    <div className="space-y-6">
      <section className="public-panel rounded-[32px] p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-4">
            <p className="public-badge inline-flex rounded-full px-3 py-1.5 text-[11px] font-semibold">
              Mis turnos
            </p>
            <div>
              <h1 className="font-display text-4xl font-semibold text-white sm:text-5xl">
                Tu agenda Marciana
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-zinc-300">
                Desde aca ves lo que ya tenes reservado y autogestionas cambios mientras falten mas de
                11 horas para el turno.
              </p>
            </div>
          </div>

          <Link
            href="/marciano/turnos/nuevo"
            className="neon-button inline-flex min-h-[48px] items-center justify-center rounded-[20px] px-5 text-sm font-semibold"
          >
            Reservar nuevo turno
          </Link>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <PortalStat label="Proximos" value={String(proximos.length)} />
          <PortalStat label="Historial" value={String(historial.length)} />
          <PortalStat label="Auto gestion" value="Abierta 11 hs antes" />
        </div>
      </section>

      {feedback ? (
        <div className="rounded-[24px] border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm text-emerald-200">
          {feedback}
        </div>
      ) : null}

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="eyebrow text-zinc-500">Proximos</p>
            <h2 className="mt-1 text-2xl font-semibold text-white">Lo que viene</h2>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-zinc-300">
            {proximos.length} activos
          </span>
        </div>

        {proximos.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-white/10 bg-black/15 p-6 text-sm text-zinc-400">
            No tenes turnos activos ahora mismo.
          </div>
        ) : (
          <div className="grid gap-4">
            {proximos.map((turno) => (
              <MarcianoTurnoCard key={turno.id} turno={turno} />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <p className="eyebrow text-zinc-500">Historial reciente</p>
          <h2 className="mt-1 text-2xl font-semibold text-white">Tus ultimos movimientos</h2>
        </div>

        {historial.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-white/10 bg-black/15 p-6 text-sm text-zinc-400">
            Todavia no hay historial visible en tu agenda.
          </div>
        ) : (
          <div className="grid gap-4">
            {historial.map((turno) => (
              <MarcianoTurnoCard key={turno.id} turno={turno} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function PortalStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">{label}</p>
      <p className="mt-1 text-base font-semibold text-white">{value}</p>
    </div>
  );
}

function getFeedbackMessage(value: string | undefined) {
  if (value === "reservado") return "Tu reserva quedo enviada a A51 para confirmacion.";
  if (value === "reprogramado") return "Listo. Creamos tu nueva reserva y cancelamos la anterior.";
  if (value === "cancelado") return "Tu turno quedo cancelado desde el portal.";
  return null;
}
