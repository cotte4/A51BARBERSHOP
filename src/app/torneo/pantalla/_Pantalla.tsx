"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { DatosPantalla, TableroPublico } from "@/lib/torneo-juego";
import { fueAPenales, ordenRuleta } from "@/lib/torneo";
import { coloresDeEquipo } from "@/lib/torneo-escudos";
import Escudo from "@/components/torneo/Escudo";
import { conAlfa, cuerpoPorLargo, VERDE, type Jugador, type Partido } from "./_comun";
import { Podio } from "./_Campeon";
import Espera from "./_Espera";
import { EscenaCruce, EscenaRuleta, PrecargaEscudos } from "./_Reveal";

// Se diseña a 1920x1080 y se escala para entrar en cualquier tele o monitor.
const ANCHO = 1920;
const ALTO = 1080;
const POLL_MS = 3000;
// Un fallo suelto es un parpadeo del Wi-Fi; tres seguidos (~9 s) ya es para avisar.
const FALLOS_PARA_AVISAR = 3;

function usarEscala(): number {
  const [escala, setEscala] = useState(1);
  useEffect(() => {
    const ajustar = () => setEscala(Math.min(window.innerWidth / ANCHO, window.innerHeight / ALTO));
    ajustar();
    window.addEventListener("resize", ajustar);
    return () => window.removeEventListener("resize", ajustar);
  }, []);
  return escala;
}

/** Mantiene la pantalla encendida mientras la página está a la vista. */
function usarPantallaEncendida() {
  useEffect(() => {
    let candado: WakeLockSentinel | null = null;
    const pedir = async () => {
      try {
        candado = (await navigator.wakeLock?.request("screen")) ?? null;
      } catch {
        candado = null;
      }
    };
    const alVolver = () => {
      if (document.visibilityState === "visible") void pedir();
    };
    void pedir();
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      document.removeEventListener("visibilitychange", alVolver);
      void candado?.release();
    };
  }, []);
}

function usarDatos(inicial: DatosPantalla): { datos: DatosPantalla; sinConexion: boolean } {
  const [datos, setDatos] = useState(inicial);
  const [sinConexion, setSinConexion] = useState(false);
  useEffect(() => {
    let vivo = true;
    let fallos = 0;
    const consultar = async () => {
      try {
        const respuesta = await fetch("/api/torneo/tablero", { cache: "no-store" });
        if (!respuesta.ok) throw new Error(`tablero ${respuesta.status}`);
        const nuevos = (await respuesta.json()) as DatosPantalla;
        if (!vivo) return;
        fallos = 0;
        setDatos(nuevos);
        setSinConexion(false);
      } catch {
        // Se queda lo último que se vio; solo se avisa si la caída dura.
        fallos += 1;
        if (vivo && fallos >= FALLOS_PARA_AVISAR) setSinConexion(true);
      }
    };
    const timer = setInterval(consultar, POLL_MS);
    return () => {
      vivo = false;
      clearInterval(timer);
    };
  }, []);
  return { datos, sinConexion };
}

// ————————————————————————————
// Piezas
// ————————————————————————————
/** Un lado de la tarjeta del sorteo: escudo hacia afuera, nombre y equipo hacia el VS. */
function Lado({ jugador, alinear }: { jugador: Jugador | undefined; alinear: "izq" | "der" }) {
  const der = alinear === "der";
  const nombre = jugador?.nombre ?? "—";
  return (
    <div className={`flex min-w-0 flex-1 items-center gap-3.5 ${der ? "flex-row-reverse" : ""}`}>
      <Escudo equipo={jugador?.equipo ?? null} tamano={76} />
      <div className={`flex min-w-0 flex-col ${der ? "items-end text-right" : "items-start text-left"}`}>
        {/* Un alias largo baja el cuerpo en vez de cortarse. */}
        <span
          className="torneo-titulo max-w-full truncate font-extrabold italic text-white"
          style={{ fontSize: cuerpoPorLargo(nombre.length, [[10, 50], [14, 40], [17, 30]], 23) }}
        >
          {nombre}
        </span>
        {jugador?.equipo && (
          // .torneo-hud fija el espaciado fuera de las capas de Tailwind: por eso va por style, no tracking-*.
          <span
            className="torneo-hud mt-1 max-w-full truncate text-[16px] text-[#8cff59]"
            style={{ letterSpacing: "0.08em" }}
          >
            {jugador.equipo}
          </span>
        )}
      </div>
    </div>
  );
}

function TarjetaCruce({
  partido,
  jugadores,
  revelado,
}: {
  partido: Partido;
  jugadores: Map<string, Jugador>;
  revelado: boolean;
}) {
  if (!revelado) {
    return (
      <div className="flex h-[184px] items-center justify-center border border-dashed border-[#8cff59]/20 bg-black/30 [clip-path:polygon(0_0,calc(100%-24px)_0,100%_24px,100%_100%,24px_100%,0_calc(100%-24px))]">
        <span className="torneo-hud text-[26px] text-[#8cff59]/30">Cruce {partido.posicion}</span>
      </div>
    );
  }
  const a = partido.jugadorAId ? jugadores.get(partido.jugadorAId) : undefined;
  const b = partido.jugadorBId ? jugadores.get(partido.jugadorBId) : undefined;
  return (
    <div className="flex h-[184px] items-center justify-between gap-6 border border-[#8cff59]/40 bg-[linear-gradient(120deg,rgba(140,255,89,0.12),rgba(0,0,0,0.55))] px-7 [clip-path:polygon(0_0,calc(100%-24px)_0,100%_24px,100%_100%,24px_100%,0_calc(100%-24px))]">
      <Lado jugador={a} alinear="izq" />
      <span className="torneo-hud shrink-0 text-[34px] text-[#ff3b4e]">{partido.esBye ? "Pase directo" : "VS"}</span>
      {partido.esBye ? <div className="flex-1" /> : <Lado jugador={b} alinear="der" />}
    </div>
  );
}

function Encabezado({
  titulo,
  detalle,
  compacto,
  qr,
}: {
  titulo: string;
  detalle: string;
  compacto?: boolean;
  qr?: boolean;
}) {
  return (
    <header className={`flex items-end justify-between gap-12 px-24 ${compacto ? "pt-6" : "pt-14"}`}>
      <div>
        <p className="torneo-hud text-[22px] text-[#8cff59]">A51 · Señal interceptada</p>
        <h1
          className={`torneo-titulo mt-1 font-extrabold italic text-white ${compacto ? "text-[64px]" : "text-[84px]"}`}
        >
          {titulo}
        </h1>
      </div>
      {/* El detalle arriba a la derecha y el QR al lado, aprovechando el alto del encabezado. */}
      <div className="flex items-stretch gap-4">
        <div className="flex flex-col items-end justify-between gap-3 text-right">
          <p className="torneo-hud text-[24px] text-white/70">{detalle}</p>
          {qr && <TextoJukebox />}
        </div>
        {qr && <QrJukeboxMini />}
      </div>
    </header>
  );
}

function GrillaSorteo({
  cruces,
  jugadores,
  revelados,
  nombre,
}: {
  cruces: Partido[];
  jugadores: Map<string, Jugador>;
  revelados: number;
  nombre: string;
}) {
  return (
    <div className="flex h-full flex-col">
      <Encabezado titulo="El sorteo" detalle={`${nombre} · ${revelados} de ${cruces.length} cruces`} qr />
      <div className="grid flex-1 grid-cols-2 content-center gap-x-10 gap-y-5 px-24 pb-14">
        {cruces.map((c, i) => (
          <TarjetaCruce key={c.id} partido={c} jugadores={jugadores} revelado={i < revelados} />
        ))}
      </div>
    </div>
  );
}

/** Fase 1 de fondo: los jugadores en el orden del sorteo; cada uno muestra su equipo cuando salió en la ruleta. */
function GrillaEquipos({
  orden,
  jugadores,
  vistos,
  nombre,
}: {
  orden: string[];
  jugadores: Map<string, Jugador>;
  vistos: number;
  nombre: string;
}) {
  const filas = Math.ceil(orden.length / 4);
  return (
    <div className="flex h-full flex-col">
      <Encabezado titulo="El sorteo" detalle={`${nombre} · ${vistos} de ${orden.length} equipos`} qr />
      <div
        className="grid flex-1 grid-cols-4 gap-x-6 gap-y-4 px-24 pb-14 pt-6"
        style={{ gridTemplateRows: `repeat(${filas}, minmax(0, 1fr))` }}
      >
        {orden.map((id, i) => {
          const jugador = jugadores.get(id);
          if (i >= vistos) {
            return (
              <div
                key={id}
                className="flex items-center justify-center border border-dashed border-[#8cff59]/20 bg-black/30 [clip-path:polygon(0_0,calc(100%-18px)_0,100%_18px,100%_100%,18px_100%,0_calc(100%-18px))]"
              >
                <span className="torneo-hud text-[22px] text-[#8cff59]/30">Jugador {i + 1}</span>
              </div>
            );
          }
          const colores = coloresDeEquipo(jugador?.equipo ?? null);
          const alias = jugador?.nombre ?? "—";
          return (
            <div
              key={id}
              className="flex min-w-0 items-center gap-4 border-l-[6px] px-5 [clip-path:polygon(0_0,calc(100%-18px)_0,100%_18px,100%_100%,18px_100%,0_calc(100%-18px))]"
              style={{
                borderColor: colores.vivo,
                background: `linear-gradient(110deg, ${conAlfa(colores.primario, 0.32)}, ${conAlfa(colores.secundario, 0.12)} 60%, rgba(0,0,0,0.5))`,
              }}
            >
              <Escudo equipo={jugador?.equipo ?? null} tamano={84} />
              <div className="flex min-w-0 flex-col">
                <span
                  className="torneo-titulo max-w-full truncate font-extrabold italic text-white"
                  style={{ fontSize: cuerpoPorLargo(alias.length, [[9, 40], [13, 32], [16, 26]], 22) }}
                >
                  {alias}
                </span>
                {jugador?.equipo && (
                  <span
                    className="torneo-hud mt-1.5 max-w-full truncate text-[15px]"
                    style={{ color: colores.vivo, letterSpacing: "0.08em" }}
                  >
                    {jugador.equipo}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Fila({
  jugador,
  estado,
  goles,
  penales,
}: {
  jugador: Jugador | undefined;
  estado: "ganador" | "perdedor" | null;
  /** null mientras no se jugó (o en resultados cargados antes del marcador). */
  goles: number | null;
  /** Ganó en los penales: lleva la marca "pen." al lado de los goles. */
  penales: boolean;
}) {
  const apagado = estado === "perdedor";
  const nombre = jugador?.nombre ?? "—";
  return (
    <div className="flex h-[42px] items-center gap-2.5 overflow-hidden">
      <Escudo equipo={jugador?.equipo ?? null} tamano={34} className={apagado ? "opacity-35" : ""} />
      <span
        className={`torneo-titulo min-w-0 max-w-[64%] shrink-0 truncate pr-1 font-extrabold italic ${apagado ? "text-white/35" : "text-white"}`}
        style={{
          fontSize: cuerpoPorLargo(nombre.length, [[12, 32], [16, 27]], 23),
          ...(estado === "ganador" ? { color: VERDE } : {}),
        }}
      >
        {nombre}
      </span>
      {/* El alias no se corta; el equipo es lo que cede (el escudo ya lo dice). */}
      {jugador?.equipo && (
        <span
          className={`torneo-hud min-w-0 flex-1 truncate pl-1 text-right text-[14px] ${apagado ? "text-[#8cff59]/30" : "text-[#8cff59]"}`}
        >
          {jugador.equipo}
        </span>
      )}
      {goles !== null && (
        <span className={`flex shrink-0 items-baseline gap-1.5 ${jugador?.equipo ? "" : "ml-auto"}`}>
          {penales && <span className="torneo-hud text-[12px] text-[#8cff59]">pen.</span>}
          <span
            className={`torneo-titulo w-[34px] text-right text-[34px] font-extrabold tabular-nums ${apagado ? "text-white/35" : "text-white"}`}
            style={estado === "ganador" ? { color: VERDE } : undefined}
          >
            {goles}
          </span>
        </span>
      )}
    </div>
  );
}

function nombreRonda(ronda: number, rondas: number): string {
  const faltan = rondas - ronda;
  if (faltan === 0) return "Final";
  if (faltan === 1) return "Semifinales";
  if (faltan === 2) return "Cuartos";
  if (faltan === 3) return "Octavos";
  return `Ronda ${ronda}`;
}

function Cuadro({
  tablero,
  jugadores,
}: {
  tablero: TableroPublico;
  jugadores: Map<string, Jugador>;
}) {
  const rondas = Math.max(...tablero.partidos.map((p) => p.ronda));
  const columnas = Array.from({ length: rondas }, (_, i) => i + 1);

  return (
    <div className="flex h-full flex-col">
      <Encabezado titulo="El cuadro" detalle={tablero.torneo.nombre} compacto qr />
      <div className="flex min-h-0 flex-1 gap-8 px-24 pb-6 pt-4">
        {columnas.map((ronda) => (
          // min-w-0: las cuatro columnas miden lo mismo aunque un alias largo pida más.
          <div key={ronda} className="flex min-w-0 flex-1 flex-col">
            <p className="torneo-hud mb-3 text-center text-[20px] text-[#8cff59]">{nombreRonda(ronda, rondas)}</p>
            <div className="flex min-h-0 flex-1 flex-col justify-around">
              {tablero.partidos
                .filter((p) => p.ronda === ronda)
                .sort((x, y) => x.posicion - y.posicion)
                .map((p) => {
                  const a = p.jugadorAId ? jugadores.get(p.jugadorAId) : undefined;
                  const b = p.jugadorBId ? jugadores.get(p.jugadorBId) : undefined;
                  const estadoDe = (id: string | null) =>
                    p.ganadorId && id ? (p.ganadorId === id ? "ganador" : "perdedor") : null;
                  const conPenales = fueAPenales(p);
                  return (
                    <div
                      key={p.id}
                      className={`border bg-black/45 px-4 py-1 ${
                        p.estado === "listo"
                          ? "border-[#8cff59]/70 shadow-[0_0_24px_rgba(140,255,89,0.25)]"
                          : "border-white/10"
                      }`}
                    >
                      <Fila
                        jugador={a}
                        estado={estadoDe(p.jugadorAId)}
                        goles={p.ganadorId ? p.marcadorA : null}
                        penales={conPenales && p.ganadorId === p.jugadorAId}
                      />
                      <div className="h-px bg-white/10" />
                      {p.esBye ? (
                        <div className="flex h-[42px] items-center">
                          <span className="torneo-hud text-[14px] text-white/40">Pase directo</span>
                        </div>
                      ) : (
                        <Fila
                          jugador={b}
                          estado={estadoDe(p.jugadorBId)}
                          goles={p.ganadorId ? p.marcadorB : null}
                          penales={conPenales && p.ganadorId === p.jugadorBId}
                        />
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function usarUrlJukebox(): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => setUrl(`${window.location.origin}/jukebox`), []);
  return url;
}

// Se escanea desde unos 3 m: margen blanco de 4 módulos (la "quiet zone" que el lector necesita
// para encontrar el código) y corrección baja, que deja menos módulos y por lo tanto más grandes.
const QR_MARGEN = 4;

/**
 * QR grande arriba a la derecha: los jugadores proponen canciones para el parlante desde el celular.
 * Abajo pisaría la fila de semifinalistas del podio y el cupo de la espera; arriba no hay nada.
 */
function QrJukebox() {
  const url = usarUrlJukebox();
  if (!url) return null;
  return (
    <div className="pointer-events-none absolute right-8 top-8 z-20 flex items-center gap-8 border border-[#8cff59]/40 bg-black/80 p-5">
      <div className="text-right">
        <p className="torneo-hud text-[34px] leading-tight text-[#8cff59]">Poné tu tema</p>
        <p className="mt-3 text-[28px] leading-tight text-[#cfd8cc]">Escaneá y sumá tu canción</p>
      </div>
      <QRCodeSVG value={url} size={200} marginSize={QR_MARGEN} level="L" />
    </div>
  );
}

/** Texto del QR del encabezado: va a la izquierda del código, bien separado. */
function TextoJukebox() {
  return (
    <div>
      <p className="torneo-hud whitespace-nowrap text-[26px] leading-tight text-[#8cff59]">Poné tu tema</p>
      <p className="mt-1 whitespace-nowrap text-[22px] leading-tight text-[#cfd8cc]">Escaneá y sumá tu canción</p>
    </div>
  );
}

/** QR del encabezado del sorteo y el cuadro: alto como el encabezado, no le saca lugar a los cruces. */
function QrJukeboxMini() {
  const url = usarUrlJukebox();
  // El hueco reservado evita que el encabezado salte cuando aparece el QR (la URL se arma en el cliente).
  if (!url) return <div className="h-[136px] w-[136px] shrink-0" aria-hidden="true" />;
  return <QRCodeSVG value={url} size={136} marginSize={QR_MARGEN} level="L" className="shrink-0" />;
}

/** Se ve solo si la tele dejó de recibir el tablero: lo de pantalla puede estar viejo. */
function AvisoSinConexion() {
  return (
    <div
      role="status"
      className="torneo-hud absolute left-1/2 top-4 z-40 flex -translate-x-1/2 items-center gap-3 border border-[#ff3b4e]/60 bg-black/85 px-4 py-2 text-[16px] text-[#ff3b4e]"
    >
      <span className="h-2 w-2 animate-pulse bg-[#ff3b4e]" aria-hidden="true" />
      Sin conexión · reintentando
    </div>
  );
}

// ————————————————————————————
// Pantalla
// ————————————————————————————
/** La vista pura: recibe los datos ya resueltos (la usa también el modo demo, sin polling). */
export function PantallaVista({ datos, sinConexion = false }: { datos: DatosPantalla; sinConexion?: boolean }) {
  const escala = usarEscala();
  usarPantallaEncendida();

  const { tablero, previa } = datos;
  const cruces1 = useMemo(
    () =>
      tablero
        ? tablero.partidos.filter((p) => p.ronda === 1).sort((x, y) => x.posicion - y.posicion)
        : [],
    [tablero],
  );
  const jugadores = useMemo(
    () => new Map((tablero?.jugadores ?? []).map((j) => [j.id, j] as const)),
    [tablero],
  );

  // Fase 1: un jugador por paso (orden del sorteo); fase 2: un cruce por paso.
  const orden = useMemo(() => ordenRuleta(cruces1), [cruces1]);
  const total = tablero?.torneo.revealTotal ?? 0;
  const objetivo = tablero?.torneo.revealPaso ?? 0;
  // Al cargar la página (o recargarla) lo ya revelado se muestra sin animación.
  const [mostrado, setMostrado] = useState(datos.tablero?.torneo.revealPaso ?? 0);
  // El paso (1..total) que se está animando; uno por vez, en orden.
  const [escena, setEscena] = useState<number | null>(null);
  const escenaActiva = tablero ? escena : null;

  useEffect(() => {
    if (!tablero) {
      // Sin sorteo (o el ensayo se reinició): nada que mostrar ni animar.
      if (escena !== null) setEscena(null);
      if (mostrado !== 0) setMostrado(0);
      return;
    }
    if (escena !== null) return;
    if (objetivo < mostrado) setMostrado(objetivo);
    else if (objetivo > mostrado) setEscena(mostrado + 1);
  }, [tablero, objetivo, mostrado, escena]);

  const terminar = useCallback((paso: number) => {
    setMostrado(paso);
    setEscena(null);
  }, []);

  // Lo que se ve de fondo: hasta el paso anterior al que se está animando.
  const fondo = escenaActiva !== null ? escenaActiva - 1 : mostrado;
  const enCola = escenaActiva !== null ? Math.max(0, objetivo - escenaActiva) : 0;

  let vista: React.ReactNode;
  if (!tablero) {
    vista = <Espera previa={previa} />;
  } else if (tablero.torneo.estado === "finalizado" && escenaActiva === null && mostrado >= total) {
    vista = <Podio tablero={tablero} jugadores={jugadores} />;
  } else if (escenaActiva !== null ? escenaActiva <= orden.length : fondo <= orden.length) {
    // Terminada la ruleta, la grilla completa queda a la vista hasta que arranca el primer cruce.
    vista = (
      <GrillaEquipos orden={orden} jugadores={jugadores} vistos={Math.min(fondo, orden.length)} nombre={tablero.torneo.nombre} />
    );
  } else if (fondo < total || escenaActiva !== null) {
    vista = (
      <GrillaSorteo
        cruces={cruces1}
        jugadores={jugadores}
        revelados={fondo - orden.length}
        nombre={tablero.torneo.nombre}
      />
    );
  } else {
    vista = <Cuadro tablero={tablero} jugadores={jugadores} />;
  }

  let capa: React.ReactNode = null;
  if (tablero && escenaActiva !== null) {
    const paso = escenaActiva;
    if (paso <= orden.length) {
      capa = (
        <EscenaRuleta
          key={paso}
          jugador={jugadores.get(orden[paso - 1])}
          numero={paso}
          total={orden.length}
          enCola={enCola}
          alTerminar={() => terminar(paso)}
        />
      );
    } else {
      const cruce = cruces1[paso - orden.length - 1];
      capa = cruce ? (
        <EscenaCruce
          key={paso}
          partido={cruce}
          a={cruce.jugadorAId ? jugadores.get(cruce.jugadorAId) : undefined}
          b={cruce.jugadorBId ? jugadores.get(cruce.jugadorBId) : undefined}
          total={cruces1.length}
          enCola={enCola}
          alTerminar={() => terminar(paso)}
        />
      ) : null;
    }
  }
  // Mientras falten ruletas, los escudos del catálogo quedan cargados de antemano.
  const precargar = tablero !== null && mostrado < orden.length;

  const pantallaCompleta = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.();
  };

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center overflow-hidden bg-[#07090a]">
      <div
        className="relative shrink-0 overflow-hidden"
        style={{ width: ANCHO, height: ALTO, transform: `scale(${escala})` }}
      >
        {vista}
        {/* El QR grande solo donde hay lugar; en el sorteo y el cuadro va el chico del encabezado. */}
        {escenaActiva === null && (!tablero || tablero.torneo.estado === "finalizado") && <QrJukebox />}
        {precargar && <PrecargaEscudos />}
        {capa}
        {/* Arriba al centro: no pisa el botón de pantalla completa ni ningún QR. */}
        {sinConexion && <AvisoSinConexion />}
      </div>
      <button
        type="button"
        onClick={pantallaCompleta}
        className="torneo-hud absolute right-4 top-4 z-50 border border-[#8cff59]/40 bg-black/70 px-3 py-2 text-[11px] text-[#8cff59] opacity-0 transition-opacity hover:opacity-100 focus-visible:opacity-100"
      >
        Pantalla completa
      </button>
    </div>
  );
}

export default function Pantalla({ inicial }: { inicial: DatosPantalla }) {
  const { datos, sinConexion } = usarDatos(inicial);
  return <PantallaVista datos={datos} sinConexion={sinConexion} />;
}
