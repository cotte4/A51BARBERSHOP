"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { QRCodeSVG } from "qrcode.react";
import type { DatosPantalla, TableroPublico } from "@/lib/torneo-juego";

gsap.registerPlugin(useGSAP);

// Se diseña a 1920x1080 y se escala para entrar en cualquier tele o monitor.
const ANCHO = 1920;
const ALTO = 1080;
const POLL_MS = 3000;
// Un fallo suelto es un parpadeo del Wi-Fi; tres seguidos (~9 s) ya es para avisar.
const FALLOS_PARA_AVISAR = 3;

type Partido = TableroPublico["partidos"][number];
type Jugador = TableroPublico["jugadores"][number];
type Escena = { cruces: Partido[]; hasta: number };

const VERDE = "#8cff59";

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
function Lado({
  jugador,
  grande,
  medio,
  alinear,
  estado,
}: {
  jugador: Jugador | undefined;
  grande?: boolean;
  medio?: boolean;
  alinear: "izq" | "der";
  estado?: "ganador" | "perdedor" | null;
}) {
  const color = estado === "perdedor" ? "text-white/35" : "text-white";
  return (
    <div className={`flex flex-col ${alinear === "der" ? "items-end text-right" : "items-start text-left"}`}>
      <span
        className={`torneo-titulo font-extrabold italic ${color} ${grande ? "text-[110px]" : medio ? "text-[56px]" : "text-[40px]"}`}
        style={estado === "ganador" ? { color: VERDE } : undefined}
      >
        {jugador?.nombre ?? "—"}
      </span>
      {jugador?.equipo && (
        <span
          className={`torneo-hud ${grande ? "mt-3 text-[30px]" : medio ? "mt-1 text-[20px]" : "mt-1 text-[16px]"} ${
            estado === "perdedor" ? "text-[#8cff59]/30" : "text-[#8cff59]"
          }`}
        >
          {jugador.equipo}
        </span>
      )}
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
      <div className="flex h-[200px] items-center justify-center border border-dashed border-[#8cff59]/20 bg-black/30 [clip-path:polygon(0_0,calc(100%-24px)_0,100%_24px,100%_100%,24px_100%,0_calc(100%-24px))]">
        <span className="torneo-hud text-[26px] text-[#8cff59]/30">Cruce {partido.posicion}</span>
      </div>
    );
  }
  const a = partido.jugadorAId ? jugadores.get(partido.jugadorAId) : undefined;
  const b = partido.jugadorBId ? jugadores.get(partido.jugadorBId) : undefined;
  return (
    <div className="flex h-[200px] items-center justify-between gap-6 border border-[#8cff59]/40 bg-[linear-gradient(120deg,rgba(140,255,89,0.12),rgba(0,0,0,0.55))] px-10 [clip-path:polygon(0_0,calc(100%-24px)_0,100%_24px,100%_100%,24px_100%,0_calc(100%-24px))]">
      <Lado jugador={a} medio alinear="izq" />
      <span className="torneo-hud text-[34px] text-[#ff3b4e]">{partido.esBye ? "Pase directo" : "VS"}</span>
      {partido.esBye ? <div /> : <Lado jugador={b} medio alinear="der" />}
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
    <header className={`flex items-end justify-between px-24 ${compacto ? "pt-8" : "pt-14"}`}>
      <div>
        <p className="torneo-hud text-[22px] text-[#8cff59]">A51 · Señal interceptada</p>
        <h1
          className={`torneo-titulo mt-1 font-extrabold italic text-white ${compacto ? "text-[64px]" : "text-[84px]"}`}
        >
          {titulo}
        </h1>
      </div>
      <div className="flex items-end gap-8">
        <p className="torneo-hud pb-3 text-[24px] text-white/70">{detalle}</p>
        {qr && <QrJukeboxMini compacto={compacto} />}
      </div>
    </header>
  );
}

// Three.js solo se descarga en la espera, y nunca en el servidor.
const PelotaAlien = dynamic(() => import("./_PelotaAlien"), { ssr: false });

function Espera({ previa }: { previa: DatosPantalla["previa"] }) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <div className="-mb-12 -mt-16">
        <PelotaAlien tamano={440} />
      </div>
      <p className="torneo-hud text-[28px] text-[#8cff59]">A51 · Señal interceptada</p>
      <h1 className="torneo-titulo mt-6 text-[170px] font-extrabold italic text-white">
        {previa ? previa.nombre : "El torneo abre pronto"}
      </h1>
      {previa && (
        <p className="torneo-hud mt-10 text-[34px] text-white/80">
          {previa.pagados} de {previa.cupo} lugares confirmados
        </p>
      )}
      <p className="torneo-hud mt-16 animate-pulse text-[26px] text-[#8cff59]">Esperando el sorteo</p>
    </div>
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
      <div className="grid flex-1 grid-cols-2 content-center gap-x-10 gap-y-6 px-24 pb-16">
        {cruces.map((c, i) => (
          <TarjetaCruce key={c.id} partido={c} jugadores={jugadores} revelado={i < revelados} />
        ))}
      </div>
    </div>
  );
}

function Fila({
  jugador,
  estado,
}: {
  jugador: Jugador | undefined;
  estado: "ganador" | "perdedor" | null;
}) {
  const apagado = estado === "perdedor";
  return (
    <div className="flex h-[42px] items-baseline justify-between gap-3 overflow-hidden">
      <span
        className={`torneo-titulo whitespace-nowrap text-[32px] font-extrabold italic ${apagado ? "text-white/35" : "text-white"}`}
        style={estado === "ganador" ? { color: VERDE } : undefined}
      >
        {jugador?.nombre ?? "—"}
      </span>
      {jugador?.equipo && (
        <span className={`torneo-hud truncate text-[14px] ${apagado ? "text-[#8cff59]/30" : "text-[#8cff59]"}`}>
          {jugador.equipo}
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
      <div className="flex min-h-0 flex-1 gap-8 px-24 pb-10 pt-4">
        {columnas.map((ronda) => (
          <div key={ronda} className="flex flex-1 flex-col">
            <p className="torneo-hud mb-4 text-center text-[20px] text-[#8cff59]">{nombreRonda(ronda, rondas)}</p>
            <div className="flex min-h-0 flex-1 flex-col justify-around">
              {tablero.partidos
                .filter((p) => p.ronda === ronda)
                .sort((x, y) => x.posicion - y.posicion)
                .map((p) => {
                  const a = p.jugadorAId ? jugadores.get(p.jugadorAId) : undefined;
                  const b = p.jugadorBId ? jugadores.get(p.jugadorBId) : undefined;
                  const estadoDe = (id: string | null) =>
                    p.ganadorId && id ? (p.ganadorId === id ? "ganador" : "perdedor") : null;
                  return (
                    <div
                      key={p.id}
                      className={`border bg-black/45 px-4 py-1 ${
                        p.estado === "listo"
                          ? "border-[#8cff59]/70 shadow-[0_0_24px_rgba(140,255,89,0.25)]"
                          : "border-white/10"
                      }`}
                    >
                      <Fila jugador={a} estado={estadoDe(p.jugadorAId)} />
                      <div className="h-px bg-white/10" />
                      {p.esBye ? (
                        <div className="flex h-[42px] items-center">
                          <span className="torneo-hud text-[14px] text-white/40">Pase directo</span>
                        </div>
                      ) : (
                        <Fila jugador={b} estado={estadoDe(p.jugadorBId)} />
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

function Podio({ tablero, jugadores }: { tablero: TableroPublico; jugadores: Map<string, Jugador> }) {
  const { campeonId, subcampeonId, tercerosIds } = tablero.podio;
  const campeon = campeonId ? jugadores.get(campeonId) : undefined;
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <p className="torneo-hud text-[34px] text-[#8cff59]">Campeón</p>
      <h1
        className="torneo-titulo mt-6 text-[230px] font-extrabold italic"
        style={{ color: VERDE, textShadow: "0 0 80px rgba(140,255,89,0.55)" }}
      >
        {campeon?.nombre}
      </h1>
      {campeon?.equipo && <p className="torneo-hud mt-4 text-[44px] text-white">{campeon.equipo}</p>}
      <div className="mt-20 flex gap-24">
        {subcampeonId && (
          <div>
            <p className="torneo-hud text-[22px] text-[#8cff59]">Subcampeón</p>
            <p className="torneo-titulo mt-2 text-[64px] font-extrabold italic text-white">
              {jugadores.get(subcampeonId)?.nombre}
            </p>
          </div>
        )}
        {tercerosIds.map((id) => (
          <div key={id}>
            <p className="torneo-hud text-[22px] text-[#8cff59]">Semifinalista</p>
            <p className="torneo-titulo mt-2 text-[64px] font-extrabold italic text-white">
              {jugadores.get(id)?.nombre}
            </p>
          </div>
        ))}
      </div>
      {tablero.torneo.premiosTexto && (
        <p className="torneo-hud mt-16 max-w-[1500px] whitespace-pre-line text-[24px] text-white/70">
          {tablero.torneo.premiosTexto}
        </p>
      )}
    </div>
  );
}

// ————————————————————————————
// Reveal de cruces: de a dos, uno por vez, a pantalla completa
// ————————————————————————————
function EscenaReveal({
  escena,
  jugadores,
  alTerminar,
}: {
  escena: Escena;
  jugadores: Map<string, Jugador>;
  alTerminar: () => void;
}) {
  const raiz = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = raiz.current;
      if (!el) return;
      const q = gsap.utils.selector(el);
      const tl = gsap.timeline({ onComplete: alTerminar });

      tl.fromTo(q(".fondo"), { opacity: 0 }, { opacity: 1, duration: 0.4 });
      q(".par").forEach((par) => {
        const a = par.querySelector(".lado-a");
        const b = par.querySelector(".lado-b");
        const vs = par.querySelector(".vs");
        tl.set(par, { opacity: 1 })
          .fromTo(
            a,
            { x: -1500, skewX: -24, opacity: 0 },
            { x: 0, skewX: 0, opacity: 1, duration: 0.7, ease: "power4.out" },
          )
          .fromTo(
            b,
            { x: 1500, skewX: 24, opacity: 0 },
            { x: 0, skewX: 0, opacity: 1, duration: 0.7, ease: "power4.out" },
            "<0.12",
          )
          .fromTo(vs, { scale: 5, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: "back.out(2.2)" }, "-=0.25")
          .fromTo(el, { x: -18, y: 8 }, { x: 0, y: 0, duration: 0.55, ease: "elastic.out(1.4, 0.25)" }, "<")
          .to({}, { duration: 2.3 })
          .to(par, { opacity: 0, y: -70, duration: 0.45, ease: "power2.in" });
      });
      tl.to(q(".fondo"), { opacity: 0, duration: 0.4 });
    },
    { scope: raiz, dependencies: [escena] },
  );

  return (
    <div ref={raiz} className="absolute inset-0 z-30">
      <div className="fondo absolute inset-0 bg-black/90" />
      {escena.cruces.map((c) => {
        const a = c.jugadorAId ? jugadores.get(c.jugadorAId) : undefined;
        const b = c.jugadorBId ? jugadores.get(c.jugadorBId) : undefined;
        return (
          <div key={c.id} className="par absolute inset-0 flex items-center justify-center gap-16 px-24 opacity-0">
            <div className="lado-a flex-1">
              <Lado jugador={a} grande alinear="izq" />
            </div>
            <div className="vs torneo-hud text-[120px] text-[#ff3b4e]">{c.esBye ? "•" : "VS"}</div>
            <div className="lado-b flex-1">
              {c.esBye ? (
                <p className="torneo-hud text-right text-[60px] text-white/70">Pase directo</p>
              ) : (
                <Lado jugador={b} grande alinear="der" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function usarUrlJukebox(): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => setUrl(`${window.location.origin}/jukebox`), []);
  return url;
}

/** QR chico en la esquina: los jugadores proponen canciones para el parlante desde el celular. */
function QrJukebox() {
  const url = usarUrlJukebox();
  if (!url) return null;
  return (
    <div className="pointer-events-none absolute bottom-6 right-6 z-20 flex items-center gap-4 border border-[#8cff59]/40 bg-black/80 px-4 py-3">
      <div className="text-right">
        <p className="torneo-hud text-[11px] text-[#8cff59]">Poné tu tema</p>
        <p className="mt-1 text-sm text-[#cfd8cc]">Escaneá y sumá tu canción</p>
      </div>
      <div className="bg-white p-1.5">
        <QRCodeSVG value={url} size={96} />
      </div>
    </div>
  );
}

/** Versión de encabezado para el sorteo y el cuadro: no le saca lugar a los cruces. */
function QrJukeboxMini({ compacto }: { compacto?: boolean }) {
  const url = usarUrlJukebox();
  if (!url) return null;
  // En el cuadro va sin margen abajo: así no le suma ni un píxel al encabezado compacto.
  return (
    <div className={`flex flex-col items-center gap-1.5 ${compacto ? "" : "pb-3"}`}>
      <div className="border border-[#8cff59]/40 bg-white p-1">
        <QRCodeSVG value={url} size={64} />
      </div>
      <p className="torneo-hud whitespace-nowrap text-[12px] leading-none text-[#8cff59]">Poné tu tema</p>
    </div>
  );
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

  const objetivo = tablero?.torneo.revealPaso ?? 0;
  // Al cargar la página (o recargarla) los cruces ya revelados se muestran sin animación.
  const [mostrado, setMostrado] = useState(datos.tablero?.torneo.revealPaso ?? 0);
  const [escena, setEscena] = useState<Escena | null>(null);

  useEffect(() => {
    if (escena) return;
    if (objetivo < mostrado) {
      setMostrado(objetivo);
      return;
    }
    if (objetivo > mostrado) {
      const nuevos = cruces1.slice(mostrado, objetivo);
      if (nuevos.length > 0) setEscena({ cruces: nuevos, hasta: objetivo });
      else setMostrado(objetivo);
    }
  }, [objetivo, mostrado, escena, cruces1]);

  const terminar = () => {
    setMostrado(escena?.hasta ?? objetivo);
    setEscena(null);
  };

  let vista: React.ReactNode;
  if (!tablero) {
    vista = <Espera previa={previa} />;
  } else if (tablero.torneo.estado === "finalizado" && !escena) {
    vista = <Podio tablero={tablero} jugadores={jugadores} />;
  } else if (mostrado < cruces1.length || escena) {
    vista = (
      <GrillaSorteo cruces={cruces1} jugadores={jugadores} revelados={mostrado} nombre={tablero.torneo.nombre} />
    );
  } else {
    vista = <Cuadro tablero={tablero} jugadores={jugadores} />;
  }

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
        {!escena && (!tablero || tablero.torneo.estado === "finalizado") && <QrJukebox />}
        {escena && <EscenaReveal escena={escena} jugadores={jugadores} alTerminar={terminar} />}
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
