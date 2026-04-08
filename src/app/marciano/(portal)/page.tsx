import Link from "next/link";
import { getMarcianoUpcomingTurno } from "@/lib/marciano-turnos";
import { getMarcianoDashboardData, requireMarcianoClient } from "@/lib/marciano-portal";
import { MARCIANO_BENEFICIOS } from "@/lib/marciano-config";
import StyleDNACard from "@/components/marciano/StyleDNACard";
import MarcianoTimelineVisual from "@/components/marciano/MarcianoTimelineVisual";
import type { StyleProfile, FaceShape, MarcianoVisit } from "@/lib/types";

function formatARS(value: string | null) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: Date | null) {
  if (!value) {
    return "Sin visitas todavia";
  }

  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(value);
}

export default async function MarcianoPortalPage() {
  const { session, client } = await requireMarcianoClient();
  const data = await getMarcianoDashboardData(session.user.id);
  const proximoTurno = await getMarcianoUpcomingTurno(client.id);

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Perfil Marciano CTA or card */}
      {!client.styleCompletedAt ? (
        <section className="panel-card rounded-[28px] p-5">
          <p className="eyebrow text-xs text-[#8cff59]">Nuevo</p>
          <h2 className="mt-2 font-display text-2xl font-semibold text-white">
            Descubrí tu Perfil Marciano
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            5 preguntas + análisis de rostro. Conocé tu estilo dominante.
          </p>
          <Link
            href="/marciano/estilo"
            className="neon-button mt-4 inline-block rounded-[20px] px-6 py-3 text-sm font-semibold text-[#07130a]"
          >
            Empezar ahora
          </Link>
        </section>
      ) : client.styleProfile ? (
        <section>
          <div className="flex items-center justify-between gap-3 mb-3">
            <span />
            <Link
              href="/marciano/estilo"
              className="text-xs text-zinc-500 hover:text-zinc-300 transition"
            >
              Editar
            </Link>
          </div>
          <StyleDNACard
            profile={client.styleProfile as StyleProfile}
            faceShape={client.faceShape as FaceShape | null}
            totalVisits={client.totalVisits}
          />
        </section>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="public-panel rounded-[32px] p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-4">
              <p className="public-badge inline-flex rounded-full px-3 py-1.5 text-[11px] font-semibold">
                Tu portal Marciano
              </p>
              <div>
                <h2 className="font-display text-4xl font-semibold text-white sm:text-5xl">
                  {data.usage.cortesRestantes ?? "∞"} cortes disponibles
                </h2>
                <p className="mt-3 max-w-xl text-sm text-zinc-300">
                  Tenes {data.usage.cortesUsados} de {MARCIANO_BENEFICIOS.cortesPorMes} cortes usados este mes.
                  {data.usage.consumicionesRestantes === null
                    ? " Las consumiciones incluidas siguen con tracking abierto."
                    : ` Te quedan ${data.usage.consumicionesRestantes} consumiciones incluidas.`}
                </p>
              </div>
            </div>

            <div className="grid gap-2 text-xs text-zinc-300 sm:min-w-[170px]">
              <PortalMetric label="Miembro desde" value={formatDate(data.client.marcianoDesde)} />
              <PortalMetric label="Ultima visita" value={formatDate(data.client.lastVisitAt)} />
              <PortalMetric label="Visitas" value={String(data.client.totalVisits)} />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/marciano/turnos/nuevo"
              className="neon-button rounded-2xl px-5 py-3 text-sm font-semibold text-[#07130a]"
            >
              Reservar ahora
            </Link>
            <Link
              href="/marciano/turnos"
              className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold text-zinc-200 hover:border-[#8cff59]/30 hover:text-white"
            >
              Ver agenda
            </Link>
            <Link
              href="/marciano/perfil"
              className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold text-zinc-200 hover:border-[#8cff59]/30 hover:text-white"
            >
              Editar perfil
            </Link>
          </div>
        </div>

        <div className="public-panel rounded-[32px] p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-400">
            Proxima accion
          </p>
          {proximoTurno ? (
            <div className="mt-4 rounded-[24px] border border-[#8cff59]/20 bg-[#8cff59]/8 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8cff59]">
                Proximo turno
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                {formatDate(new Date(`${proximoTurno.fecha}T${proximoTurno.horaInicio}-03:00`))} ·{" "}
                {proximoTurno.horaInicio}
              </p>
              <p className="mt-1 text-sm text-zinc-300">
                {proximoTurno.servicioNombre ?? "Turno A51"} · {proximoTurno.estado}
              </p>
            </div>
          ) : (
            <div className="mt-4 rounded-[24px] border border-white/10 bg-white/5 p-4">
              <p className="text-sm font-medium text-white">No tenes un turno proximo</p>
              <p className="mt-2 text-sm text-zinc-400">
                Si queres volver a reservar, arrancamos desde tu agenda y te mostramos solo lo que
                esta disponible.
              </p>
            </div>
          )}

          <div className="mt-4 grid gap-2 text-sm text-zinc-300">
            <PortalNote label="Consumiciones usadas" value={String(data.usage.consumicionesUsadas)} />
            <PortalNote
              label="Catalogo Marciano"
              value={
                data.consumicionesIncluidas.length
                  ? `${data.consumicionesIncluidas.length} items incluidos`
                  : "Pendiente de carga"
              }
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_0.95fr]">
        <MarcianoTimelineVisual visits={data.visits as MarcianoVisit[]} />

        <article className="public-panel rounded-[28px] p-5">
          <div>
            <p className="eyebrow text-zinc-500">Catalogo</p>
            <h3 className="mt-1 text-xl font-semibold text-white">Lo que A51 te habilita</h3>
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#8cff59]">
                Consumiciones incluidas
              </p>
              <div className="mt-3 space-y-2">
                {data.consumicionesIncluidas.length ? (
                  data.consumicionesIncluidas.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-[#8cff59]/20 bg-[#8cff59]/8 p-3 text-sm text-zinc-100"
                    >
                      {item.nombre}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-zinc-400">
                    A51 todavia no cargo consumiciones incluidas.
                  </p>
                )}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">
                Servicios activos
              </p>
              <div className="mt-3 space-y-2">
                {data.services.map((service) => (
                  <div key={service.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-white">{service.nombre}</span>
                      <span className="text-xs text-zinc-400">{service.duracionMinutos} min</span>
                    </div>
                    <p className="mt-2 text-sm text-zinc-300">{formatARS(service.precioBase)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}

function PortalMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function PortalNote({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <span className="text-zinc-400">{label}</span>
      <span className="font-medium text-white">{value}</span>
    </div>
  );
}
