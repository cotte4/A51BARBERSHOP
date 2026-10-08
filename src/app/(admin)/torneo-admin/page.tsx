import Link from "next/link";
import { redirect } from "next/navigation";
import BrandMark from "@/components/BrandMark";
import { requireOwnerSession } from "@/lib/admin-action";
import { getTorneoVigente, listarEquipos, listarJugadores, listarPartidos } from "@/lib/torneo-data";
import { resumenCupo } from "@/lib/torneo";
import CrearTorneo from "./_CrearTorneo";
import PagoButton from "./_PagoButton";
import ConfigForm from "./_ConfigForm";
import EquiposForm from "./_EquiposForm";
import Sorteo from "./_Sorteo";
import Pantalla from "./_Pantalla";
import Reemplazo from "./_Reemplazo";
import AutoRefresco from "./_AutoRefresco";
import Partidos, { type JugadorInfo, type PartidoVista } from "./_Partidos";

export const dynamic = "force-dynamic";

const TZ = "America/Argentina/Buenos_Aires";

function formatARS(value: string | number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value));
}

/** "YYYY-MM-DDTHH:mm" en hora de Buenos Aires, para el input datetime-local. */
function fechaParaInput(fecha: Date | null): string {
  if (!fecha) return "";
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(fecha);
  const pick = (type: string) => partes.find((p) => p.type === type)?.value ?? "00";
  return `${pick("year")}-${pick("month")}-${pick("day")}T${pick("hour")}:${pick("minute")}`;
}

export default async function TorneoAdminPage() {
  if (!(await requireOwnerSession())) redirect("/hoy");

  const torneo = await getTorneoVigente();

  if (!torneo) {
    return (
      <div className="app-shell min-h-screen">
        <header className="border-b border-zinc-800/80 bg-zinc-950/90 px-4 py-4 backdrop-blur">
          <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
            <BrandMark href="/hoy" subtitle="Torneo" />
          </div>
        </header>
        <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6 pb-24">
          <section className="panel-card rounded-[28px] p-6">
            <h1 className="font-display text-2xl font-semibold text-white">Todavía no hay torneo</h1>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Creá el torneo para empezar a recibir anotados.
            </p>
            <div className="mt-6">
              <CrearTorneo />
            </div>
          </section>
        </main>
      </div>
    );
  }

  const [jugadores, equipos, partidos] = await Promise.all([
    listarJugadores(torneo.id),
    listarEquipos(torneo.id),
    listarPartidos(torneo.id),
  ]);
  const { pagados, cupo, lleno: resumenLleno } = resumenCupo(jugadores, torneo.cupo);

  const nombreEquipoPorId = new Map(equipos.map((e) => [e.id, e.nombre] as const));
  const infoJugadores = new Map<string, JugadorInfo>(
    jugadores.map((j) => [
      j.id,
      { nombre: j.nombre, equipoNombre: j.equipoId ? (nombreEquipoPorId.get(j.equipoId) ?? null) : null },
    ]),
  );
  const partidosVista: PartidoVista[] = partidos.map((p) => ({
    id: p.id,
    ronda: p.ronda,
    jugadorAId: p.jugadorAId,
    jugadorBId: p.jugadorBId,
    ganadorId: p.ganadorId,
    esBye: p.esBye,
    estado: p.estado,
  }));
  const totalRonda1 = partidos.filter((p) => p.ronda === 1).length;
  const sorteoCompleto = torneo.revealPaso >= totalRonda1;
  const mostrarPartidos =
    torneo.estado === "en_juego" ||
    torneo.estado === "finalizado" ||
    (torneo.estado === "sorteado" && sorteoCompleto);

  // Pagados primero (por orden en que Pinky los marcó), después pendientes (por llegada)
  const pagadosOrdenados = jugadores
    .filter((j) => j.estadoPago === "pagado")
    .sort((a, b) => (a.ordenPago ?? Infinity) - (b.ordenPago ?? Infinity));
  const pendientes = jugadores.filter((j) => j.estadoPago === "pendiente");
  const anotados = [...pagadosOrdenados, ...pendientes];
  const bajas = jugadores.filter((j) => j.estadoPago === "baja");

  // Reemplazo: solo con el sorteo hecho y antes de que se juegue el primer partido.
  const sorteado = torneo.estado !== "inscripcion";
  const empezo = partidos.some((p) => !p.esBye && p.ganadorId !== null);
  const puedeReemplazar = sorteado && !empezo;
  const esperaParaReemplazo = pendientes
    .filter((j) => j.posicionSorteo === null)
    .map((j) => ({ id: j.id, nombre: j.nombre }));

  const equiposTexto = equipos.map((e) => e.nombre).join("\n");

  return (
    <div className="app-shell min-h-screen">
      <header className="border-b border-zinc-800/80 bg-zinc-950/90 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
          <BrandMark href="/hoy" subtitle="Torneo" />
        </div>
      </header>
      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6 pb-24">
        <AutoRefresco />
        {/* Resumen */}
        <section className="panel-card rounded-[28px] p-6">
          <p className="eyebrow text-xs font-semibold">Torneo</p>
          <p className="font-display mt-3 text-4xl font-bold tabular-nums text-white">
            {pagados} de {cupo} confirmados
          </p>
          <p className="mt-2 text-sm text-zinc-400">
            {jugadores.length} anotados{resumenLleno ? ` · ${jugadores.length - pagados} en espera` : ""} · cuota {formatARS(torneo.cuotaArs)}
          </p>
          <Link
            href="/torneo"
            className="mt-4 inline-block text-sm text-zinc-400 hover:text-[#8cff59]"
          >
            Ver la página pública
          </Link>
        </section>

        {/* El sorteo */}
        {torneo.estado === "inscripcion" ? (
          <section className="panel-card rounded-[28px] p-5">
            <h2 className="font-display text-xl font-semibold text-white">El sorteo</h2>
            <p className="mt-2 text-sm text-zinc-400">
              {pagados} jugadores confirmados · {equipos.length} equipos
            </p>
            <div className="mt-4">
              <Sorteo pagados={pagados} equipos={equipos.length} />
            </div>
          </section>
        ) : (
          <section className="panel-card rounded-[28px] p-5">
            <h2 className="font-display text-xl font-semibold text-white">La pantalla</h2>
            <div className="mt-4">
              <Pantalla revealPaso={torneo.revealPaso} totalRonda1={totalRonda1} />
            </div>
          </section>
        )}

        {/* Los partidos */}
        {mostrarPartidos ? (
          <section className="panel-card rounded-[28px] p-5">
            <h2 className="font-display text-xl font-semibold text-white">Los partidos</h2>
            <div className="mt-4">
              <Partidos
                partidos={partidosVista}
                jugadores={infoJugadores}
                finalizado={torneo.estado === "finalizado"}
              />
            </div>
          </section>
        ) : null}

        {/* Anotados */}
        <section className="panel-card rounded-[28px] p-5">
          <h2 className="font-display text-xl font-semibold text-white">Anotados</h2>
          {anotados.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-400">Todavía nadie se anotó.</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-3">
              {anotados.map((jugador) => {
                const pagado = jugador.estadoPago === "pagado";
                const puestoEspera = pagado ? 0 : pendientes.indexOf(jugador) + 1;
                const enEspera = !pagado && resumenLleno;
                return (
                  <li
                    key={jugador.id}
                    className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-white">{jugador.nombre}</p>
                      {enEspera ? (
                        <p className="mt-0.5 text-xs font-semibold text-amber-300">
                          {puestoEspera === 1 ? "El que sigue" : `En espera · puesto ${puestoEspera}`}
                        </p>
                      ) : null}
                      <p className="mt-0.5 break-all text-xs text-zinc-400">{jugador.email}</p>
                      <p className="text-xs text-zinc-400">{jugador.whatsapp}</p>
                    </div>
                    <PagoButton
                      jugadorId={jugador.id}
                      nombre={jugador.nombre}
                      pagado={pagado}
                      disabled={sorteado}
                    />
                    </div>
                    {pagado && puedeReemplazar && jugador.posicionSorteo !== null ? (
                      <div className="mt-2 flex justify-end">
                        <Reemplazo
                          bajaId={jugador.id}
                          nombre={jugador.nombre}
                          espera={esperaParaReemplazo}
                          cuota={formatARS(torneo.cuotaArs)}
                        />
                      </div>
                    ) : null}
                  </li>
                );
              })}
              {bajas.map((jugador) => (
                <li
                  key={jugador.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 opacity-70"
                >
                  <p className="font-semibold text-zinc-300 line-through">{jugador.nombre}</p>
                  <p className="mt-0.5 text-xs font-semibold text-amber-300">Baja · se le devolvió la cuota</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Datos del torneo */}
        <section className="panel-card rounded-[28px] p-5">
          <h2 className="font-display text-xl font-semibold text-white">Datos del torneo</h2>
          <div className="mt-4">
            <ConfigForm
              nombre={torneo.nombre}
              fechaLocal={fechaParaInput(torneo.fecha)}
              premiosTexto={torneo.premiosTexto ?? ""}
            />
          </div>
        </section>

        {/* Equipos */}
        <section className="panel-card rounded-[28px] p-5">
          <h2 className="font-display text-xl font-semibold text-white">Equipos del sorteo</h2>
          <div className="mt-4">
            <EquiposForm
              equiposTexto={equiposTexto}
              bloqueado={torneo.estado !== "inscripcion"}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
