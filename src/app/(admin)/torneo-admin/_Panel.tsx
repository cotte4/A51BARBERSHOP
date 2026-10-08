import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import BrandMark from "@/components/BrandMark";
import Escudo from "@/components/torneo/Escudo";
import AutoRefresco from "./_AutoRefresco";
import BorrarPrueba from "./_BorrarPrueba";
import ConfigForm from "./_ConfigForm";
import Contador from "./_Contador";
import CrearTorneo from "./_CrearTorneo";
import EquiposForm from "./_EquiposForm";
import PagoButton from "./_PagoButton";
import Pantalla from "./_Pantalla";
import Partidos, { type JugadorInfo, type PartidoVista } from "./_Partidos";
import Reemplazo from "./_Reemplazo";
import Sorteo from "./_Sorteo";

export type EstadoTorneo = "inscripcion" | "sorteado" | "en_juego" | "finalizado";

export type JugadorPanel = {
  id: string;
  /** Lo que se ve en la tele (ya desambiguado). */
  alias: string;
  nombre: string;
  email: string;
  whatsapp: string;
  estadoPago: "pendiente" | "pagado" | "baja";
  ordenPago: number | null;
  posicionSorteo: number | null;
  equipoNombre: string | null;
};

/**
 * Pasos del sorteo en la tele. `pasosEquipos` son los primeros pasos (ruleta de equipos, uno por
 * jugador); el resto son cruces. Con 0, todos los pasos son cruces.
 */
export type RevealPanel = { paso: number; total: number; pasosEquipos: number };

export type PanelDatos = {
  torneo: {
    nombre: string;
    estado: EstadoTorneo;
    cupo: number;
    /** Cuota ya formateada en pesos. */
    cuota: string;
    /** "sáb 10 oct · 20:00", o null = a confirmar. */
    fechaTexto: string | null;
    /** Valor del input datetime-local. */
    fechaLocal: string;
    premiosTexto: string;
    esPrueba: boolean;
  };
  /** Progreso del sorteo en la tele (ver `RevealPanel`). */
  reveal: RevealPanel;
  jugadores: JugadorPanel[];
  /** Nombres de los equipos guardados. */
  equipos: string[];
  partidos: PartidoVista[];
};

const ESTADO: Record<EstadoTorneo, string> = {
  inscripcion: "Inscripción abierta",
  sorteado: "Sorteado",
  en_juego: "En juego",
  finalizado: "Terminado",
};

// Entrada escalonada como la landing: sube y aparece. Solo con movimiento permitido; si no, todo está quieto desde el inicio.
const ENTRA = "motion-safe:animate-[a51-fade-up_0.6s_cubic-bezier(0.22,1,0.36,1)_both]";
const demora = (ms: number): CSSProperties => ({ animationDelay: `${ms}ms` });

/* ── Marco ─────────────────────────────────────────────────────────── */

function Marco({ estado, children }: { estado?: EstadoTorneo; children: ReactNode }) {
  return (
    <div className="app-shell relative isolate min-h-screen overflow-x-clip">
      {/* Atmósfera de la landing: halo verde arriba y líneas de barrido casi invisibles. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 rounded-full bg-[#8cff59]/10 blur-3xl" />
        <div className="absolute inset-0 bg-[repeating-linear-gradient(180deg,transparent_0,transparent_3px,rgba(255,255,255,0.012)_3px,rgba(255,255,255,0.012)_4px)]" />
      </div>
      <header className="sticky top-0 z-20 border-b border-zinc-800/80 bg-zinc-950/85 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <BrandMark href="/hoy" subtitle="Torneo" />
          {estado ? <EstadoPill estado={estado} /> : null}
        </div>
      </header>
      <main className="mx-auto flex max-w-3xl flex-col gap-5 px-4 py-5 pb-24 sm:gap-6 sm:py-8">{children}</main>
    </div>
  );
}

function EstadoPill({ estado }: { estado: EstadoTorneo }) {
  const vivo = estado !== "finalizado";
  return (
    <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#8cff59]/25 bg-[#8cff59]/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#b6ff84]">
      <span
        className={`h-1.5 w-1.5 rounded-full ${vivo ? "bg-[#8cff59] shadow-[0_0_10px_rgba(140,255,89,0.9)] motion-safe:animate-pulse" : "bg-zinc-500"}`}
      />
      {ESTADO[estado]}
    </span>
  );
}

function Seccion({
  id,
  eyebrow,
  titulo,
  extra,
  retraso,
  className = "",
  children,
}: {
  id?: string;
  eyebrow?: string;
  titulo: string;
  extra?: ReactNode;
  retraso: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={`panel-card scroll-mt-20 rounded-[28px] p-5 sm:p-6 ${ENTRA} ${className}`}
      style={demora(retraso)}
    >
      <div className="mb-4 flex items-end justify-between gap-3">
        <div className="min-w-0">
          {eyebrow ? <p className="eyebrow text-[11px] font-semibold">{eyebrow}</p> : null}
          <h2 className="font-display mt-1 text-xl font-semibold text-white sm:text-2xl">{titulo}</h2>
        </div>
        {extra}
      </div>
      {children}
    </section>
  );
}

/* ── Sin torneo ────────────────────────────────────────────────────── */

export function PanelSinTorneo() {
  return (
    <Marco>
      <section className={`panel-card relative overflow-hidden rounded-[32px] p-6 sm:p-8 ${ENTRA}`} style={demora(0)}>
        <Brillo />
        <div className="relative">
          <EtiquetaSenal derecha="Sin señal" />
          <h1 className="font-display mt-5 text-3xl font-semibold leading-tight text-white sm:text-4xl">
            Todavía no hay torneo
          </h1>
          <p className="mt-2 max-w-md text-sm leading-6 text-zinc-400">
            Creá el torneo para empezar a recibir anotados.
          </p>
          <div className="mt-6">
            <CrearTorneo />
          </div>
        </div>
      </section>
    </Marco>
  );
}

/* ── Panel ─────────────────────────────────────────────────────────── */

export default function Panel({ datos }: { datos: PanelDatos }) {
  const { torneo, reveal, jugadores, equipos, partidos } = datos;
  const inscripcion = torneo.estado === "inscripcion";

  // Pagados primero (por orden en que Pinky los marcó), después pendientes (por llegada).
  const pagados = jugadores
    .filter((j) => j.estadoPago === "pagado")
    .sort((a, b) => (a.ordenPago ?? Infinity) - (b.ordenPago ?? Infinity));
  const pendientes = jugadores.filter((j) => j.estadoPago === "pendiente");
  const bajas = jugadores.filter((j) => j.estadoPago === "baja");
  const cupo = torneo.cupo;
  const lleno = pagados.length >= cupo;
  const enEspera = lleno || !inscripcion;
  const pendientesPrimero = inscripcion && !lleno;

  const sorteoCompleto = reveal.paso >= reveal.total;
  const mostrarPartidos =
    torneo.estado === "en_juego" || torneo.estado === "finalizado" || (torneo.estado === "sorteado" && sorteoCompleto);
  const jugables = partidos.filter((p) => !p.esBye);
  const jugados = jugables.filter((p) => p.estado === "jugado").length;

  // Reemplazo: solo con el sorteo hecho y antes de que se juegue el primer partido.
  const sorteado = !inscripcion;
  const empezo = partidos.some((p) => !p.esBye && p.ganadorId !== null);
  const puedeReemplazar = sorteado && !empezo;
  const esperaParaReemplazo = pendientes
    .filter((j) => j.posicionSorteo === null)
    .map((j) => ({ id: j.id, alias: j.alias, nombre: j.nombre }));

  const infoJugadores = new Map<string, JugadorInfo>(
    jugadores.map((j) => [j.id, { alias: j.alias, nombre: j.nombre, equipoNombre: j.equipoNombre }]),
  );

  let orden = 0;
  const siguienteDemora = () => 260 + Math.min(orden++, 10) * 45;

  const grupoPendientes =
    pendientes.length > 0 ? (
      <Grupo
        titulo={enEspera ? "Lista de espera" : "Sin pagar"}
        cantidad={pendientes.length}
        tono={enEspera ? "ambar" : "gris"}
      >
        {pendientes.map((j, i) => (
          <TarjetaJugador
            key={j.id}
            jugador={j}
            retraso={siguienteDemora()}
            marca={
              enEspera ? <EstadoChip tono="ambar">{i === 0 ? "El que sigue" : `Espera ${i + 1}`}</EstadoChip> : null
            }
          >
            {inscripcion ? (
              <PagoButton jugadorId={j.id} nombre={j.nombre} pagado={false} cupoLleno={lleno} />
            ) : (
              <EstadoChip tono="gris">No entró al sorteo</EstadoChip>
            )}
          </TarjetaJugador>
        ))}
      </Grupo>
    ) : null;

  const grupoPagados =
    pagados.length > 0 ? (
      <Grupo titulo="Adentro" cantidad={pagados.length} tono="verde">
        {pagados.map((j) => (
          <TarjetaJugador key={j.id} jugador={j} retraso={siguienteDemora()}>
            {inscripcion ? (
              <PagoButton jugadorId={j.id} nombre={j.nombre} pagado />
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <EstadoChip tono="verde">Pagó</EstadoChip>
                  {j.equipoNombre ? (
                    <span className="truncate text-sm font-medium text-zinc-300">{j.equipoNombre}</span>
                  ) : null}
                </div>
                {puedeReemplazar && j.posicionSorteo !== null ? (
                  <Reemplazo bajaId={j.id} nombre={j.alias} espera={esperaParaReemplazo} cuota={torneo.cuota} />
                ) : null}
              </div>
            )}
          </TarjetaJugador>
        ))}
      </Grupo>
    ) : null;

  return (
    <Marco estado={torneo.estado}>
      <AutoRefresco />

      {/* ── Resumen ── */}
      <section
        className={`panel-card relative overflow-hidden rounded-[32px] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.32)] sm:p-7 ${ENTRA}`}
        style={demora(0)}
      >
        <Brillo />
        <div className="relative">
          <EtiquetaSenal derecha={torneo.fechaTexto ?? "Fecha a confirmar"} />
          <h1 className="font-display mt-4 text-2xl font-semibold leading-tight text-white sm:text-3xl">
            {torneo.nombre}
          </h1>

          <div className="mt-5 flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow text-[11px] font-semibold">Pagaron</p>
              <p className="font-display mt-1 flex items-baseline gap-1.5 font-bold leading-none tabular-nums">
                <Contador valor={pagados.length} retraso={0.2} className="text-7xl text-white sm:text-8xl" />
                <span className="text-3xl text-zinc-500 sm:text-4xl">/{cupo}</span>
              </p>
            </div>
            {lleno ? (
              <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[#8cff59]/30 bg-[#8cff59]/12 px-3 py-1.5 text-xs font-semibold text-[#8cff59]">
                <IconoCheck className="h-3.5 w-3.5" />
                Cupo completo
              </span>
            ) : (
              <p className="mb-1 text-right text-sm leading-tight text-zinc-400">
                <span className="font-display block text-3xl font-bold tabular-nums text-white">
                  {cupo - pagados.length}
                </span>
                {cupo - pagados.length === 1 ? "lugar libre" : "lugares libres"}
              </p>
            )}
          </div>

          <BarraCupo pagados={pagados.length} cupo={cupo} />

          <div className="mt-5 grid grid-cols-3 gap-2">
            <Dato titulo="Anotados">
              <Contador valor={pagados.length + pendientes.length} retraso={0.35} />
            </Dato>
            <Dato
              titulo={enEspera ? "En espera" : "Sin pagar"}
              tono={enEspera && pendientes.length > 0 ? "ambar" : "normal"}
            >
              <Contador valor={pendientes.length} retraso={0.4} />
            </Dato>
            {mostrarPartidos ? (
              <Dato titulo="Jugados">
                <span className="tabular-nums">
                  {jugados}
                  <span className="text-base text-zinc-500">/{jugables.length}</span>
                </span>
              </Dato>
            ) : (
              <Dato titulo="Cuota">
                <span className="text-lg sm:text-2xl">{torneo.cuota}</span>
              </Dato>
            )}
          </div>

          <Link
            href="/torneo"
            className="mt-5 inline-flex min-h-11 items-center gap-1.5 text-sm text-zinc-400 hover:text-[#8cff59]"
          >
            Ver la página pública
            <IconoFlecha />
          </Link>
        </div>
      </section>

      {/* ── La acción de esta etapa ── */}
      {inscripcion ? (
        <section
          id="sorteo"
          className={`relative scroll-mt-20 overflow-hidden rounded-[28px] border border-[#8cff59]/25 bg-[linear-gradient(160deg,rgba(140,255,89,0.12),rgba(24,24,27,0.97)_42%,rgba(18,18,20,0.98))] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.3)] sm:p-6 ${ENTRA}`}
          style={demora(120)}
        >
          <div className="relative">
            <p className="eyebrow text-[11px] font-semibold">Cuando estén todos</p>
            <h2 className="font-display mt-1 text-2xl font-semibold text-white sm:text-3xl">El sorteo</h2>
            <p className="mt-1 text-sm text-zinc-400">Mezcla equipos y cruces. Después lo vas mostrando en la tele.</p>
            <div className="mt-5">
              <Sorteo pagados={pagados.length} equipos={equipos.length} />
            </div>
          </div>
        </section>
      ) : (
        <section
          className={`relative overflow-hidden rounded-[28px] border border-[#8cff59]/25 bg-[linear-gradient(160deg,rgba(140,255,89,0.12),rgba(24,24,27,0.97)_42%,rgba(18,18,20,0.98))] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.3)] sm:p-6 ${ENTRA}`}
          style={demora(120)}
        >
          <p className="eyebrow text-[11px] font-semibold">En la tele</p>
          <h2 className="font-display mt-1 text-2xl font-semibold text-white sm:text-3xl">La pantalla</h2>
          <div className="mt-5">
            <Pantalla paso={reveal.paso} total={reveal.total} pasosEquipos={reveal.pasosEquipos} />
          </div>
        </section>
      )}

      {/* ── Los partidos ── */}
      {mostrarPartidos ? (
        <Seccion
          eyebrow={torneo.estado === "finalizado" ? "Terminó" : "Cargá los goles"}
          titulo="Los partidos"
          retraso={200}
        >
          <Partidos partidos={partidos} jugadores={infoJugadores} finalizado={torneo.estado === "finalizado"} />
        </Seccion>
      ) : null}

      {/* ── Jugadores ── */}
      <Seccion
        id="jugadores"
        eyebrow={inscripcion ? "Tocá cuando te pague" : "Anotados"}
        titulo="Jugadores"
        retraso={200}
      >
        {jugadores.length === 0 ? (
          <div className="rounded-[22px] border border-dashed border-zinc-800 px-4 py-8 text-center">
            <p className="text-sm text-zinc-400">Todavía nadie se anotó.</p>
            <p className="mt-1 text-xs text-zinc-500">Aparecen solos acá cuando se anotan desde la página.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Mientras hay lugar, lo que Pinky tiene que tocar va arriba. */}
            {pendientesPrimero ? grupoPendientes : grupoPagados}
            {pendientesPrimero ? grupoPagados : grupoPendientes}
            {bajas.length > 0 ? (
              <Grupo titulo="Bajas" cantidad={bajas.length} tono="gris">
                {bajas.map((j) => (
                  <li
                    key={j.id}
                    className={`rounded-[22px] border border-zinc-800/80 bg-zinc-950/40 p-4 ${ENTRA}`}
                    style={demora(siguienteDemora())}
                  >
                    <p className="font-semibold text-zinc-400 line-through decoration-zinc-600">{j.alias}</p>
                    <p className="text-sm text-zinc-500">{j.nombre}</p>
                    <p className="mt-1.5 text-xs font-semibold text-amber-300/90">Baja · se le devolvió la cuota</p>
                  </li>
                ))}
              </Grupo>
            ) : null}
          </div>
        )}
      </Seccion>

      {/* ── Equipos ── */}
      <Seccion
        id="equipos"
        eyebrow={inscripcion ? "Los que entran al sorteo" : "Ya sorteados"}
        titulo="Equipos"
        retraso={260}
      >
        <EquiposForm guardados={equipos} minimo={Math.max(pagados.length, cupo)} bloqueado={!inscripcion} />
      </Seccion>

      {/* ── Datos del torneo (se tocan poco: plegados) ── */}
      <details className={`group panel-card rounded-[28px] ${ENTRA}`} style={demora(300)}>
        <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-3 rounded-[28px] px-5 py-4 sm:px-6 [&::-webkit-details-marker]:hidden">
          <span>
            <span className="eyebrow block text-[11px] font-semibold">Nombre, fecha y premios</span>
            <span className="font-display mt-0.5 block text-lg font-semibold text-white">Datos del torneo</span>
          </span>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-zinc-700 text-zinc-400 transition-transform duration-200 group-open:rotate-180">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9">
              <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </summary>
        <div className="px-5 pb-5 sm:px-6 sm:pb-6">
          <ConfigForm nombre={torneo.nombre} fechaLocal={torneo.fechaLocal} premiosTexto={torneo.premiosTexto} />
        </div>
      </details>

      {torneo.esPrueba ? (
        <section
          className={`rounded-[28px] border border-red-500/25 bg-[linear-gradient(160deg,rgba(239,68,68,0.08),rgba(24,24,27,0.96)_50%)] p-5 sm:p-6 ${ENTRA}`}
          style={demora(340)}
        >
          <BorrarPrueba />
        </section>
      ) : null}
    </Marco>
  );
}

/* ── Piezas ────────────────────────────────────────────────────────── */

function Brillo() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(140,255,89,0.2),transparent_42%),radial-gradient(circle_at_bottom_left,rgba(140,255,89,0.08),transparent_38%)]" />
      {/* Radar tenue en la esquina, como el de la landing. */}
      <div className="absolute -right-24 -top-24 h-72 w-72 opacity-[0.07]">
        {[100, 70, 40].map((pct) => (
          <div
            key={pct}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#8cff59]"
            style={{ width: `${pct}%`, height: `${pct}%` }}
          />
        ))}
        <div
          className="absolute inset-0 rounded-full motion-safe:animate-[radar-sweep_6s_linear_infinite]"
          style={{
            background:
              "conic-gradient(from 0deg, rgba(140,255,89,0.6) 0deg, rgba(140,255,89,0.15) 24deg, transparent 70deg)",
          }}
        />
      </div>
    </div>
  );
}

function EtiquetaSenal({ derecha }: { derecha: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="shrink-0 rounded-full border border-[#8cff59]/20 bg-[#8cff59]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8cff59]">
        A51 // torneo
      </span>
      <span className="h-px flex-1 bg-gradient-to-r from-[#8cff59]/50 via-[#8cff59]/20 to-transparent" />
      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400">{derecha}</span>
    </div>
  );
}

/** Una celda por lugar del cupo: se encienden en orden al entrar y cuando alguien paga. */
function BarraCupo({ pagados, cupo }: { pagados: number; cupo: number }) {
  return (
    <div
      className="mt-5 grid gap-1"
      style={{ gridTemplateColumns: `repeat(${cupo}, minmax(0, 1fr))` }}
      role="img"
      aria-label={`${pagados} de ${cupo} lugares pagos`}
    >
      {Array.from({ length: cupo }, (_, i) => {
        const prendida = i < pagados;
        return (
          <span
            key={i}
            className={`h-2.5 rounded-full transition-[background-color,box-shadow] duration-500 motion-safe:animate-[a51-scale-in_0.45s_cubic-bezier(0.22,1,0.36,1)_both] ${
              prendida ? "bg-[#8cff59] shadow-[0_0_10px_rgba(140,255,89,0.55)]" : "bg-zinc-800"
            }`}
            style={demora(300 + i * 35)}
          />
        );
      })}
    </div>
  );
}

function Dato({
  titulo,
  tono = "normal",
  children,
}: {
  titulo: string;
  tono?: "normal" | "ambar";
  children: ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl border px-3 py-3 ${
        tono === "ambar" ? "border-amber-500/30 bg-amber-500/8" : "border-white/8 bg-white/[0.04]"
      }`}
    >
      <p
        className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${tono === "ambar" ? "text-amber-300/90" : "text-zinc-500"}`}
      >
        {titulo}
      </p>
      <p
        className={`font-display mt-1 text-2xl font-bold leading-none tabular-nums ${tono === "ambar" ? "text-amber-200" : "text-white"}`}
      >
        {children}
      </p>
    </div>
  );
}

function Grupo({
  titulo,
  cantidad,
  tono,
  children,
}: {
  titulo: string;
  cantidad: number;
  tono: "verde" | "ambar" | "gris";
  children: ReactNode;
}) {
  const color = { verde: "text-[#8cff59]", ambar: "text-amber-300", gris: "text-zinc-400" }[tono];
  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${color}`}>{titulo}</p>
        <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-xs font-semibold tabular-nums text-zinc-300">
          {cantidad}
        </span>
        <span className="h-px flex-1 bg-gradient-to-r from-zinc-700/80 to-transparent" />
      </div>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</ul>
    </div>
  );
}

function TarjetaJugador({
  jugador,
  retraso,
  marca,
  children,
}: {
  jugador: JugadorPanel;
  retraso: number;
  marca?: ReactNode;
  children: ReactNode;
}) {
  const pagado = jugador.estadoPago === "pagado";
  return (
    <li
      className={`flex flex-col gap-3 rounded-[22px] border p-3.5 ${ENTRA} ${
        pagado
          ? "border-[#8cff59]/20 bg-[linear-gradient(160deg,rgba(140,255,89,0.07),rgba(9,9,11,0.6)_55%)]"
          : "border-zinc-800 bg-zinc-950/60"
      }`}
      style={demora(retraso)}
    >
      <div className="flex items-start gap-3">
        <Ficha jugador={jugador} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="min-w-0 truncate text-lg font-semibold leading-tight text-white">{jugador.alias}</p>
            {marca}
          </div>
          <p className="truncate text-sm text-zinc-300">{jugador.nombre}</p>
          <p className="mt-0.5 truncate text-xs text-zinc-500">
            <a href={`tel:${jugador.whatsapp}`} className="hover:text-[#8cff59]">
              {jugador.whatsapp}
            </a>
            {" · "}
            {jugador.email}
          </p>
        </div>
      </div>
      {children}
    </li>
  );
}

/** A la izquierda de cada jugador: su escudo si ya tiene equipo; si no, su puesto en el cupo o su inicial. */
function Ficha({ jugador }: { jugador: JugadorPanel }) {
  if (jugador.equipoNombre) {
    return (
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-zinc-900/80">
        <Escudo equipo={jugador.equipoNombre} tamano={40} />
      </span>
    );
  }
  const pagado = jugador.estadoPago === "pagado";
  return (
    <span
      className={`font-display flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-lg font-bold tabular-nums ${
        pagado ? "border-[#8cff59]/35 bg-[#8cff59]/10 text-[#8cff59]" : "border-zinc-700 bg-zinc-900 text-zinc-400"
      }`}
      aria-hidden="true"
    >
      {pagado && jugador.ordenPago !== null ? jugador.ordenPago : jugador.alias.charAt(0).toUpperCase()}
    </span>
  );
}

function EstadoChip({ tono, children }: { tono: "verde" | "ambar" | "gris"; children: ReactNode }) {
  const estilo = {
    verde: "border-[#8cff59]/30 bg-[#8cff59]/10 text-[#8cff59]",
    ambar: "border-amber-500/35 bg-amber-500/10 text-amber-300",
    gris: "border-zinc-700 bg-zinc-900 text-zinc-400",
  }[tono];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${estilo}`}
    >
      {tono === "verde" ? <IconoCheck className="h-3 w-3" /> : null}
      {children}
    </span>
  );
}

function IconoCheck({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconoFlecha() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <path d="M7 17L17 7M9 7h8v8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
