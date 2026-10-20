import Link from "next/link";
import { redirect } from "next/navigation";
import DiasEspecialesForm from "@/components/turnos/DiasEspecialesForm";
import HorarioSemanalForm from "@/components/turnos/HorarioSemanalForm";
import { agregarDiaEspecialAction, guardarHorarioSemanalAction, quitarDiaEspecialAction } from "../actions";
import {
  getBarberoAgendaProfile,
  getBarberosActivosTurnos,
  getFechaHoyArgentina,
  getHorarioBarbero,
} from "@/lib/turnos";
import { getLinkedBarberoIdForUser } from "@/lib/dal/authz";
import { getTurnosActorContext } from "@/lib/turnos-access";

// "Mi horario": el horario semanal de cada barbero y sus días especiales. Cada barbero edita el suyo;
// la dueña puede elegir cualquiera y cargar feriados de todo el local.
export default async function MiHorarioPage({
  searchParams,
}: {
  searchParams: Promise<{ barbero?: string }>;
}) {
  const actor = await getTurnosActorContext();
  if (!actor) redirect("/login");

  const params = await searchParams;
  const barberosActivos = actor.isAdmin ? await getBarberosActivosTurnos() : [];
  // Para un admin el contexto de turnos no trae barbero; la dueña también corta, así que se busca el suyo.
  const propioId =
    actor.barberoId ?? (await getLinkedBarberoIdForUser(actor.userId, { activeOnly: true })) ?? null;
  const barberoId =
    actor.isAdmin && params.barbero && barberosActivos.some((b) => b.id === params.barbero)
      ? params.barbero
      : (propioId ?? barberosActivos[0]?.id ?? null);

  const barbero = barberoId ? await getBarberoAgendaProfile(barberoId) : null;
  if (!barbero) {
    return (
      <main className="app-shell min-h-screen px-4 py-6">
        <div className="panel-card mx-auto max-w-5xl rounded-[28px] p-6">
          <p className="eyebrow text-xs">Mi horario</p>
          <p className="mt-3 text-lg font-semibold text-white">Tu usuario no está vinculado a un barbero activo.</p>
          <p className="mt-2 text-sm text-zinc-400">Pedile a la dueña que lo vincule desde Configuración.</p>
        </div>
      </main>
    );
  }

  const hoy = getFechaHoyArgentina();
  const horario = await getHorarioBarbero(barbero.id);
  const esPropio = barbero.id === propioId;
  const especialesBarbero = horario.especiales.filter((e) => e.barberoId !== null);
  const especialesLocal = horario.especiales.filter((e) => e.barberoId === null);

  return (
    <main className="app-shell min-h-screen">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 pb-24">
        <header className="space-y-2">
          <Link href="/turnos" className="text-sm text-zinc-400 hover:text-[#8cff59]">
            &larr; Volver a turnos
          </Link>
          <h1 className="font-display text-3xl font-semibold text-white">
            {esPropio ? "Mi horario" : `Horario de ${barbero.nombre}`}
          </h1>
          {actor.isAdmin && barberosActivos.length > 1 ? (
            <nav className="flex flex-wrap gap-2" aria-label="Elegir barbero">
              {barberosActivos.map((b) => (
                <Link
                  key={b.id}
                  href={`/turnos/disponibilidad?barbero=${b.id}`}
                  aria-current={b.id === barbero.id ? "page" : undefined}
                  className={`rounded-full border px-3 py-1 text-sm font-semibold ${
                    b.id === barbero.id
                      ? "border-[#8cff59] bg-[#8cff59] text-[#07130a]"
                      : "border-zinc-700 text-zinc-300 hover:border-[#8cff59]/60"
                  }`}
                >
                  {b.nombre}
                </Link>
              ))}
            </nav>
          ) : null}
        </header>

        <HorarioSemanalForm
          key={barbero.id}
          semanal={horario.semanal}
          action={guardarHorarioSemanalAction.bind(null, barbero.id)}
        />

        <DiasEspecialesForm
          titulo={esPropio ? "Vacaciones o un día distinto" : `Días distintos de ${barbero.nombre}`}
          descripcion="Para una fecha puntual: no se trabaja, o se trabaja en otro horario. Pisa a la semana."
          especiales={especialesBarbero}
          minFecha={hoy}
          action={agregarDiaEspecialAction.bind(null, barbero.id)}
          quitarAction={quitarDiaEspecialAction}
        />

        {actor.isAdmin ? (
          <DiasEspecialesForm
            titulo="Feriados del local"
            descripcion="Valen para todos los barberos. Un día cerrado del local no da turnos aunque alguien tenga horario."
            especiales={especialesLocal}
            minFecha={hoy}
            action={agregarDiaEspecialAction.bind(null, null)}
            quitarAction={quitarDiaEspecialAction}
          />
        ) : null}
      </div>
    </main>
  );
}
