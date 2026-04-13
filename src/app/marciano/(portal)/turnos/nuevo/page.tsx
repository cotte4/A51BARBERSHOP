import Link from "next/link";
import MarcianoReservaForm from "@/components/marciano/MarcianoReservaForm";
import { getMarcianoTurnoById } from "@/lib/marciano-turnos";
import { requireMarcianoClient } from "@/lib/marciano-portal";
import {
  getBarberosPublicosReserva,
  getFechaMananaArgentina,
  getServiciosPublicos,
} from "@/lib/turnos";

type MarcianoNuevoTurnoPageProps = {
  searchParams: Promise<{ reprogramar?: string; barbero?: string }>;
};

export default async function MarcianoNuevoTurnoPage({
  searchParams,
}: MarcianoNuevoTurnoPageProps) {
  const { client } = await requireMarcianoClient();
  const params = await searchParams;
  const [services, barberosPublicos] = await Promise.all([
    getServiciosPublicos(),
    getBarberosPublicosReserva(),
  ]);
  const turnoAReprogramar = params.reprogramar
    ? await getMarcianoTurnoById(client.id, params.reprogramar)
    : null;

  const fechaMañana = getFechaMananaArgentina();
  const pinkyBarbero = barberosPublicos.find((b) => b.nombre.toLowerCase() === "pinky");
  const selectedBarbero = params.barbero
    ? (barberosPublicos.find((b) => b.publicSlug === params.barbero) ?? pinkyBarbero ?? barberosPublicos[0] ?? null)
    : (pinkyBarbero ?? barberosPublicos[0] ?? null);

  const initialFecha =
    turnoAReprogramar && turnoAReprogramar.fecha >= fechaMañana
      ? turnoAReprogramar.fecha
      : fechaMañana;

  return (
    <div className="space-y-6">
      <section className="public-panel rounded-[32px] p-6">
        <Link href="/marciano/turnos" className="text-sm text-zinc-400 hover:text-[#8cff59]">
          Volver a mis turnos
        </Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-3">
            <p className="public-badge inline-flex rounded-full px-3 py-1.5 text-[11px] font-semibold">
              {turnoAReprogramar ? "Reprogramar turno" : "Nueva reserva"}
            </p>
            <h1 className="font-display text-4xl font-semibold text-white sm:text-5xl">
              {turnoAReprogramar ? "Elegi tu nuevo horario" : "Reserva desde tu portal"}
            </h1>
            <p className="max-w-2xl text-sm text-zinc-300">
              Esta reserva usa tus datos Marcianos y queda vinculada a tu cuenta automaticamente.
            </p>
          </div>

          <div className="grid gap-2 text-sm text-zinc-300 sm:min-w-[220px]">
            <ReserveTip label="Paso 1" value="Elegir barbero y servicio" />
            <ReserveTip label="Paso 2" value="Elegir fecha y horario" />
            <ReserveTip label="Paso 3" value="Confirmar solicitud" />
          </div>
        </div>
      </section>

      {barberosPublicos.length > 0 ? (
        <section className="public-panel rounded-[28px] p-5">
          <p className="eyebrow text-zinc-500">Barbero</p>
          <div className="mt-4 flex flex-wrap gap-3">
            {barberosPublicos.map((barbero) => {
              const selected = barbero.id === selectedBarbero?.id;
              const isPinky = barbero.nombre.toLowerCase() === "pinky";
              const href = `/marciano/turnos/nuevo?barbero=${encodeURIComponent(barbero.publicSlug ?? "")}${
                params.reprogramar ? `&reprogramar=${encodeURIComponent(params.reprogramar)}` : ""
              }`;

              return (
                <Link
                  key={barbero.id}
                  href={href}
                  className={`rounded-[22px] border px-4 py-3 text-sm transition ${
                    selected
                      ? isPinky
                        ? "border-pink-400/45 bg-pink-500/15 text-pink-100"
                        : "border-[#8cff59]/35 bg-[#8cff59]/10 text-white"
                      : isPinky
                        ? "border-pink-400/25 bg-pink-500/8 text-pink-300 hover:border-pink-400/40 hover:bg-pink-500/15"
                        : "border-white/10 bg-white/5 text-zinc-300 hover:border-white/20 hover:bg-white/8"
                  }`}
                >
                  {barbero.nombre}
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      {!client.phoneRaw ? (
        <section className="rounded-[28px] border border-amber-400/25 bg-amber-400/10 p-5 text-sm text-amber-100">
          Necesitamos un telefono cargado para reservar desde el portal. Completa ese dato en{" "}
          <Link href="/marciano/perfil" className="font-semibold text-white underline">
            tu perfil Marciano
          </Link>{" "}
          y volve a intentar.
        </section>
      ) : turnoAReprogramar && !turnoAReprogramar.canManage ? (
        <section className="rounded-[28px] border border-amber-400/25 bg-amber-400/10 p-5 text-sm text-amber-100">
          {turnoAReprogramar.manageMessage ?? "Ese turno ya no admite cambios desde el portal."}
        </section>
      ) : !selectedBarbero ? (
        <section className="rounded-[28px] border border-white/10 bg-white/5 p-5 text-sm text-zinc-300">
          Todavia no hay barberos publicados para reserva.
        </section>
      ) : (
        <MarcianoReservaForm
          slug={selectedBarbero.publicSlug ?? ""}
          initialFecha={initialFecha}
          clientName={client.name}
          clientPhoneRaw={client.phoneRaw}
          services={services}
          reprogramarTurno={
            turnoAReprogramar
              ? {
                  id: turnoAReprogramar.id,
                  fecha: turnoAReprogramar.fecha,
                  horaInicio: turnoAReprogramar.horaInicio,
                  servicioNombre: turnoAReprogramar.servicioNombre,
                }
              : null
          }
          initialServicioId={turnoAReprogramar?.servicioId ?? services[0]?.id}
          initialNota={turnoAReprogramar?.notaCliente ?? ""}
        />
      )}
    </div>
  );
}

function ReserveTip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
