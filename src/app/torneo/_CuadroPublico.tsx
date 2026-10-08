import { fueAPenales } from "@/lib/torneo";
import { getTableroPublico } from "@/lib/torneo-juego";
import Escudo from "@/components/torneo/Escudo";
import Refrescar from "./_Refrescar";

function nombreRonda(ronda: number, rondas: number): string {
  const faltan = rondas - ronda;
  if (faltan === 0) return "Final";
  if (faltan === 1) return "Semifinales";
  if (faltan === 2) return "Cuartos";
  if (faltan === 3) return "Octavos";
  return `Ronda ${ronda}`;
}

/** El cuadro en el celular. Aparece recién cuando la tele terminó de revelar el sorteo. */
export default async function CuadroPublico() {
  const tablero = await getTableroPublico();
  if (!tablero) return null;

  const cruces1 = tablero.partidos.filter((p) => p.ronda === 1).length;
  if (tablero.torneo.revealPaso < cruces1) return null;

  const jugadores = new Map(tablero.jugadores.map((j) => [j.id, j] as const));
  const rondas = Math.max(...tablero.partidos.map((p) => p.ronda));
  const campeon = tablero.podio.campeonId ? jugadores.get(tablero.podio.campeonId) : undefined;
  const final = tablero.partidos.find((p) => p.ronda === rondas);
  // "Final 3 – 1", siempre desde el lado del campeón.
  const golesFinal =
    campeon && final && final.marcadorA !== null && final.marcadorB !== null
      ? final.ganadorId === final.jugadorAId
        ? `${final.marcadorA} – ${final.marcadorB}`
        : `${final.marcadorB} – ${final.marcadorA}`
      : null;

  return (
    <section aria-label="El cuadro" className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <Refrescar />
      <div>
        <p className="torneo-hud text-[0.65rem] text-[#8cff59]">En vivo</p>
        <h2 className="torneo-titulo mt-1 text-4xl font-extrabold italic text-white">El cuadro</h2>
        {campeon && (
          <p className="torneo-titulo mt-3 text-2xl font-bold text-[#8cff59]">
            Campeón: {campeon.nombre}
            {campeon.equipo ? ` · ${campeon.equipo}` : ""}
          </p>
        )}
        {golesFinal && (
          <p className="torneo-hud mt-1 text-[0.65rem] text-white/70">
            Final {golesFinal}
            {final && fueAPenales(final) ? " · pen." : ""}
          </p>
        )}
      </div>
      {Array.from({ length: rondas }, (_, i) => i + 1).map((ronda) => (
        <div key={ronda} className="flex flex-col gap-2">
          <p className="torneo-hud text-[0.65rem] text-[#8cff59]">{nombreRonda(ronda, rondas)}</p>
          {tablero.partidos
            .filter((p) => p.ronda === ronda)
            .sort((a, b) => a.posicion - b.posicion)
            .map((p) => {
              const penales = fueAPenales(p);
              const lado = (id: string | null, goles: number | null) => {
                const j = id ? jugadores.get(id) : undefined;
                const gano = id !== null && p.ganadorId === id;
                const perdio = id !== null && p.ganadorId !== null && !gano;
                return (
                  <div
                    className={`flex min-h-7 items-center gap-2.5 ${perdio ? "text-white/35" : gano ? "text-[#8cff59]" : "text-white"}`}
                  >
                    <Escudo equipo={j?.equipo ?? null} tamano={28} className={perdio ? "opacity-35" : ""} />
                    <span className="torneo-titulo min-w-0 max-w-[62%] shrink-0 truncate pr-1 text-xl font-extrabold italic">{j?.nombre ?? "—"}</span>
                    {j?.equipo && (
                      <span className="torneo-hud min-w-0 flex-1 truncate text-right text-[0.6rem] opacity-80">
                        {j.equipo}
                      </span>
                    )}
                    {p.ganadorId && goles !== null && (
                      <span className={`flex shrink-0 items-baseline gap-1 ${j?.equipo ? "" : "ml-auto"}`}>
                        {penales && gano && <span className="torneo-hud text-[0.55rem]">pen.</span>}
                        <span className="torneo-titulo w-6 text-right text-2xl font-extrabold tabular-nums">{goles}</span>
                      </span>
                    )}
                  </div>
                );
              };
              return (
                <div key={p.id} className="border border-white/10 bg-black/40 px-4 py-2">
                  {lado(p.jugadorAId, p.marcadorA)}
                  <div className="my-1 h-px bg-white/10" />
                  {p.esBye ? (
                    <span className="torneo-hud text-[0.6rem] text-white/40">Pase directo</span>
                  ) : (
                    lado(p.jugadorBId, p.marcadorB)
                  )}
                </div>
              );
            })}
        </div>
      ))}
    </section>
  );
}
