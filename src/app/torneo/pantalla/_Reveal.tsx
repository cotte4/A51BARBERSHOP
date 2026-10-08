"use client";

import { useEffect, useMemo, useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import Escudo from "@/components/torneo/Escudo";
import { CATALOGO_CLUBES, clubDelCatalogo, coloresDeEquipo } from "@/lib/torneo-escudos";
import { conAlfa, cuerpoPorLargo, VERDE, type Jugador, type Partido } from "./_comun";

gsap.registerPlugin(useGSAP);

// Las escenas se dibujan sobre el lienzo de 1920x1080 de la tele (ver _Pantalla).
const ANCHO = 1920;

/**
 * Si Pinky tocó "Siguiente" varias veces mientras corría una escena, las que esperan aceleran
 * para que la tele no quede atrasada: con una en cola va al doble; con tres o más, a 4x.
 */
function velocidad(enCola: number): number {
  if (enCola >= 3) return 4;
  if (enCola >= 1) return 2;
  return 1;
}

function usarVelocidad(tl: React.RefObject<gsap.core.Timeline | null>, enCola: number) {
  useEffect(() => {
    tl.current?.timeScale(velocidad(enCola));
  }, [tl, enCola]);
}

// ————————————————————————————
// Fase 1: la ruleta de equipos (un jugador por toque)
// ————————————————————————————
const CELDA = 300;
const ESCUDO_TIRA = 210;
/** Lugar del equipo del jugador en la tira: antes pasan ~44 escudos girando. */
const DESTINO = 44;
const DESPUES = 4;

/** Azar reproducible y chico: la misma escena arma siempre la misma tira (sin saltos al re-renderizar). */
function azarDesde(semilla: number): () => number {
  let s = (semilla * 2654435761) >>> 0;
  return () => {
    s = (Math.imul(s ^ (s >>> 15), 2246822519) + 0x9e3779b9) >>> 0;
    return s / 4294967296;
  };
}

/** Los escudos que giran: el catálogo mezclado, sin el equipo ganador, que cae en DESTINO. */
function armarTira(equipo: string, semilla: number): string[] {
  const canonico = clubDelCatalogo(equipo)?.nombre ?? equipo;
  const otros = CATALOGO_CLUBES.map((c) => c.nombre).filter((n) => n !== canonico);
  const azar = azarDesde(semilla);
  const tira: string[] = [];
  let mezcla: string[] = [];
  while (tira.length < DESTINO + 1 + DESPUES) {
    mezcla = [...otros];
    for (let i = mezcla.length - 1; i > 0; i--) {
      const j = Math.floor(azar() * (i + 1));
      [mezcla[i], mezcla[j]] = [mezcla[j], mezcla[i]];
    }
    for (const n of mezcla) if (tira[tira.length - 1] !== n) tira.push(n);
  }
  tira.length = DESTINO + 1 + DESPUES;
  tira[DESTINO] = equipo;
  return tira;
}

export function EscenaRuleta({
  jugador,
  numero,
  total,
  enCola,
  alTerminar,
}: {
  jugador: Jugador | undefined;
  /** 1..total: qué jugador del sorteo es. */
  numero: number;
  total: number;
  enCola: number;
  alTerminar: () => void;
}) {
  const raiz = useRef<HTMLDivElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const equipo = jugador?.equipo ?? "";
  const nombre = jugador?.nombre ?? "—";
  const colores = coloresDeEquipo(equipo || null);
  const tira = useMemo(() => armarTira(equipo, numero), [equipo, numero]);

  useGSAP(
    () => {
      const el = raiz.current;
      if (!el) return;
      const q = gsap.utils.selector(el);
      const tiraEl = q(".tira")[0] as HTMLElement | undefined;
      const celdas = q(".celda") as HTMLElement[];
      const marco = q(".marco");
      const centro = ANCHO / 2;
      const xDe = (i: number) => centro - (i * CELDA + CELDA / 2);
      const pos = { x: xDe(2) };
      let enMarco = -1;

      // Cada cuadro: mueve la tira y agranda el escudo que pasa por el marco.
      const pintar = () => {
        if (tiraEl) tiraEl.style.transform = `translate3d(${pos.x}px,0,0)`;
        celdas.forEach((celda, i) => {
          const d = Math.min(3, Math.abs(pos.x + i * CELDA + CELDA / 2 - centro) / CELDA);
          celda.style.transform = `scale(${1.22 - d * 0.2})`;
          celda.style.opacity = String(1 - d * 0.27);
        });
        const actual = Math.round((centro - pos.x - CELDA / 2) / CELDA);
        if (actual !== enMarco) {
          enMarco = actual;
          // El "tic" de la ruleta: el marco late con cada escudo que entra.
          gsap.fromTo(marco, { scale: 1.07 }, { scale: 1, duration: 0.14, ease: "power2.out", overwrite: true });
        }
      };
      pintar();

      gsap.to(q(".rayos-giro"), { rotate: 360, duration: 18, ease: "none", repeat: -1 });

      const t = gsap.timeline({ onComplete: alTerminar });
      tl.current = t;
      t.fromTo(q(".fondo"), { opacity: 0 }, { opacity: 1, duration: 0.35 })
        .fromTo(q(".rotulo"), { opacity: 0, y: -24 }, { opacity: 1, y: 0, duration: 0.35, ease: "power3.out" }, "<0.1")
        .fromTo(
          q(".alias"),
          { opacity: 0, scale: 1.6, filter: "blur(18px)" },
          { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.6, ease: "expo.out" },
          "<0.1",
        )
        .fromTo(q(".ventana"), { opacity: 0, scaleY: 0.2 }, { opacity: 1, scaleY: 1, duration: 0.4, ease: "power3.out" }, "<0.2")
        // Gira rápido y desacelera hasta quedar a medio escudo...
        .to(pos, { x: xDe(DESTINO) + CELDA * 0.62, duration: 2.5, ease: "power2.out", onUpdate: pintar }, "<0.1")
        // ...y se arrastra el último tramo: la tensión de si entra o no.
        .to(pos, { x: xDe(DESTINO), duration: 0.95, ease: "power1.inOut", onUpdate: pintar })
        .addLabel("frena")
        .fromTo(q(".destello"), { opacity: 0.95 }, { opacity: 0, immediateRender: false, duration: 0.7, ease: "power2.out" }, "frena")
        .fromTo(q(".temblor"), { x: -18, y: 10 }, { x: 0, y: 0, immediateRender: false, duration: 0.7, ease: "elastic.out(1.3, 0.25)" }, "frena")
        .to(q(".ventana"), { opacity: 0, duration: 0.25 }, "frena")
        .fromTo(q(".tinte"), { opacity: 0 }, { opacity: 1, duration: 0.5 }, "frena")
        .fromTo(q(".rayos"), { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1, duration: 0.8, ease: "power3.out" }, "frena")
        .fromTo(q(".ganador"), { opacity: 0, scale: 0.55 }, { opacity: 1, scale: 1, duration: 0.6, ease: "back.out(2.2)" }, "frena")
        .fromTo(q(".equipo"), { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.45, ease: "power3.out" }, "frena+=0.2")
        // Quieto un momento para leer quién le tocó a quién.
        .to({}, { duration: 1.4 })
        .to(q(".temblor, .tinte, .rayos"), { opacity: 0, duration: 0.4, ease: "power2.in" })
        .to(q(".fondo"), { opacity: 0, duration: 0.3 }, "<0.15");
    },
    { scope: raiz },
  );
  usarVelocidad(tl, enCola);

  return (
    <div ref={raiz} className="absolute inset-0 z-30 overflow-hidden">
      <div className="fondo absolute inset-0 bg-[#050607]/[0.97]" />
      <div
        className="tinte absolute inset-0 opacity-0"
        style={{
          background: `radial-gradient(55% 60% at 50% 56%, ${conAlfa(colores.primario, 0.55)}, ${conAlfa(colores.secundario, 0.22)} 48%, transparent 78%)`,
        }}
      />
      <div className="rayos pointer-events-none absolute left-[160px] top-[-200px] h-[1600px] w-[1600px] opacity-0 [mask-image:radial-gradient(circle,black_10%,transparent_62%)]">
        <div
          className="rayos-giro h-full w-full"
          style={{
            background: `repeating-conic-gradient(${conAlfa(colores.vivo, 0.28)} 0deg 7deg, transparent 7deg 22deg)`,
          }}
        />
      </div>

      <div className="temblor absolute inset-0">
        <p className="rotulo torneo-hud absolute inset-x-0 top-[70px] text-center text-[30px]" style={{ color: VERDE }}>
          Jugador {numero} de {total}
        </p>
        <div className="alias absolute inset-x-0 top-[120px] flex h-[190px] items-center justify-center">
          <span
            className="torneo-titulo whitespace-nowrap font-extrabold italic text-white [text-shadow:0_0_40px_rgba(0,0,0,0.8)]"
            style={{ fontSize: cuerpoPorLargo(nombre.length, [[8, 168], [12, 138], [16, 112]], 96) }}
          >
            {nombre}
          </span>
        </div>

        {/* La ventana de la ruleta: los escudos pasan por el marco del centro. */}
        <div className="ventana absolute inset-x-0 top-[400px] h-[360px]">
          <div className="absolute inset-0 [mask-image:linear-gradient(to_right,transparent,black_22%,black_78%,transparent)]">
            <div className="absolute inset-y-0 left-0 border-y border-[#8cff59]/20 bg-black/50" style={{ width: ANCHO }} />
            <div className="tira absolute inset-y-0 left-0 flex items-center will-change-transform">
              {tira.map((club, i) => (
                <div
                  key={i}
                  className="celda flex shrink-0 items-center justify-center"
                  style={{ width: CELDA, height: CELDA }}
                >
                  <Escudo equipo={club} tamano={ESCUDO_TIRA} cargaInmediata />
                </div>
              ))}
            </div>
          </div>
          <div
            className="marco absolute left-1/2 top-1/2 h-[340px] w-[310px] -translate-x-1/2 -translate-y-1/2 border-[3px]"
            style={{ borderColor: VERDE, boxShadow: `0 0 36px ${conAlfa(VERDE, 0.45)}, inset 0 0 36px ${conAlfa(VERDE, 0.2)}` }}
          >
            {/* Flechas arriba y abajo que apuntan al escudo elegido. */}
            <span
              className="absolute left-1/2 top-[-24px] h-[18px] w-[32px] -translate-x-1/2 [clip-path:polygon(0_0,100%_0,50%_100%)]"
              style={{ background: VERDE }}
            />
            <span
              className="absolute bottom-[-24px] left-1/2 h-[18px] w-[32px] -translate-x-1/2 [clip-path:polygon(50%_0,100%_100%,0_100%)]"
              style={{ background: VERDE }}
            />
          </div>
        </div>

        {/* El equipo que le tocó: escudo grande con su color. */}
        <div className="ganador absolute inset-x-0 top-[370px] flex justify-center opacity-0">
          <div style={{ filter: `drop-shadow(0 0 60px ${conAlfa(colores.vivo, 0.65)})` }}>
            <Escudo equipo={equipo || null} tamano={400} cargaInmediata />
          </div>
        </div>
        <p
          className="equipo torneo-titulo absolute inset-x-0 top-[800px] whitespace-nowrap text-center text-[92px] font-extrabold italic opacity-0"
          style={{ color: colores.vivo, textShadow: `0 0 50px ${conAlfa(colores.vivo, 0.55)}` }}
        >
          {equipo}
        </p>
      </div>

      <div
        className="destello pointer-events-none absolute inset-0 opacity-0"
        style={{ background: `radial-gradient(circle at 50% 56%, #ffffff, ${conAlfa(colores.vivo, 0.7)} 40%, transparent 80%)` }}
      />
    </div>
  );
}

// ————————————————————————————
// Fase 2: los cruces (uno por toque)
// ————————————————————————————
const CHISPAS = 18;

function NombreCruce({ jugador, color }: { jugador: Jugador | undefined; color: string }) {
  const nombre = jugador?.nombre ?? "—";
  return (
    <div className="flex flex-col items-center px-10 text-center">
      <span
        className="torneo-titulo max-w-full whitespace-nowrap font-extrabold italic text-white [text-shadow:0_4px_30px_rgba(0,0,0,0.85)]"
        style={{ fontSize: cuerpoPorLargo(nombre.length, [[9, 112], [12, 92], [16, 74]], 60) }}
      >
        {nombre}
      </span>
      {jugador?.equipo && (
        <span
          className="torneo-hud mt-5 whitespace-nowrap text-[34px] [text-shadow:0_2px_16px_rgba(0,0,0,0.9)]"
          style={{ color }}
        >
          {jugador.equipo}
        </span>
      )}
    </div>
  );
}

export function EscenaCruce({
  partido,
  a,
  b,
  total,
  enCola,
  alTerminar,
}: {
  partido: Partido;
  a: Jugador | undefined;
  b: Jugador | undefined;
  total: number;
  enCola: number;
  alTerminar: () => void;
}) {
  const raiz = useRef<HTMLDivElement>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);
  const colA = coloresDeEquipo(a?.equipo ?? null);
  const colB = coloresDeEquipo(b?.equipo ?? null);
  const bye = partido.esBye;

  useGSAP(
    () => {
      const el = raiz.current;
      if (!el) return;
      const q = gsap.utils.selector(el);
      const angulo = (i: number) => (i / CHISPAS) * Math.PI * 2 + 0.3;

      const t = gsap.timeline({ onComplete: alTerminar });
      tl.current = t;
      t.fromTo(q(".fondo"), { opacity: 0 }, { opacity: 1, duration: 0.35 })
        // Los colores de cada club entran barriendo desde su lado.
        .fromTo(q(".panel-a"), { xPercent: -100 }, { xPercent: 0, duration: 0.75, ease: "power4.out" }, "<0.1")
        .fromTo(q(".panel-b"), { xPercent: 100 }, { xPercent: 0, duration: 0.75, ease: "power4.out" }, "<0.15")
        .fromTo(q(".rotulo"), { opacity: 0, y: -24 }, { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" }, "<0.2")
        // Los escudos se lanzan uno contra el otro...
        .fromTo(
          q(".escudo-a"),
          { x: -900, rotate: -40, scale: 0.7, opacity: 0 },
          { x: bye ? 0 : 310, rotate: 0, scale: 1.08, opacity: 1, duration: 0.8, ease: bye ? "power3.out" : "power3.in" },
          "+=0.2",
        )
        .fromTo(
          q(".escudo-b"),
          { x: 900, rotate: 40, scale: 0.7, opacity: 0 },
          { x: -310, rotate: 0, scale: 1.08, opacity: 1, duration: 0.8, ease: "power3.in" },
          "<",
        )
        // ...y chocan en el medio.
        .addLabel("choque")
        .fromTo(q(".destello"), { opacity: 0.95 }, { opacity: 0, immediateRender: false, duration: 0.75, ease: "power2.out" }, "choque")
        .fromTo(q(".temblor"), { x: -24, y: 12 }, { x: 0, y: 0, immediateRender: false, duration: 0.75, ease: "elastic.out(1.4, 0.22)" }, "choque")
        .fromTo(q(".onda"), { scale: 0, opacity: 1 }, { scale: 5, opacity: 0, immediateRender: false, duration: 0.85, ease: "power2.out" }, "choque")
        .fromTo(
          q(".chispa"),
          { x: 0, y: 0, opacity: 1, scale: 1 },
          {
            x: (i: number) => Math.cos(angulo(i)) * (260 + (i % 3) * 120),
            y: (i: number) => Math.sin(angulo(i)) * (200 + (i % 4) * 80),
            opacity: 0,
            scale: 0.3,
            duration: 0.95,
            immediateRender: false,
            ease: "power3.out",
          },
          "choque",
        )
        .to(q(".escudo-a"), { x: 0, rotate: -6, scale: 1, duration: 0.7, ease: "power3.out" }, "choque")
        .to(q(".escudo-b"), { x: 0, rotate: 6, scale: 1, duration: 0.7, ease: "power3.out" }, "choque")
        .fromTo(q(".vs"), { scale: 6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(2)" }, "choque+=0.1")
        .to(q(".escudo-a, .escudo-b"), { rotate: 0, duration: 0.5, ease: "power2.out" }, "choque+=0.7")
        .fromTo(
          q(".nombre"),
          { opacity: 0, y: 50 },
          { opacity: 1, y: 0, duration: 0.55, ease: "power3.out", stagger: 0.2 },
          "choque+=0.45",
        )
        // El cruce se queda a la vista para leerlo con calma.
        .to({}, { duration: 2.8 })
        .to(q(".temblor"), { opacity: 0, duration: 0.45, ease: "power2.in" })
        .to(q(".panel-a"), { xPercent: -100, duration: 0.5, ease: "power3.in" }, "<")
        .to(q(".panel-b"), { xPercent: 100, duration: 0.5, ease: "power3.in" }, "<")
        .to(q(".fondo"), { opacity: 0, duration: 0.3 });
    },
    { scope: raiz },
  );
  usarVelocidad(tl, enCola);

  const panel = (c: ReturnType<typeof coloresDeEquipo>, hacia: "right" | "left") =>
    `linear-gradient(to ${hacia}, ${conAlfa(c.primario, 0.68)}, ${conAlfa(c.secundario, 0.4)} 55%, ${conAlfa(c.primario, 0.1)})`;

  return (
    <div ref={raiz} className="absolute inset-0 z-30 overflow-hidden">
      <div className="fondo absolute inset-0 bg-[#050607]/[0.97]" />
      {/* Mitad de cada club, cortadas en diagonal; un velo oscuro abajo para que los nombres se lean. */}
      <div
        className="panel-a absolute inset-y-0 left-0 w-[1110px] [clip-path:polygon(0_0,100%_0,77%_100%,0_100%)]"
        style={{ background: panel(colA, "right") }}
      />
      <div
        className="panel-b absolute inset-y-0 right-0 w-[1110px] [clip-path:polygon(23%_0,100%_0,100%_100%,0_100%)]"
        style={{ background: bye ? "transparent" : panel(colB, "left") }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.15)_40%,rgba(0,0,0,0.7))]" />

      <div className="temblor absolute inset-0">
        <p className="rotulo torneo-hud absolute inset-x-0 top-[70px] text-center text-[32px]" style={{ color: VERDE }}>
          Cruce {partido.posicion} de {total}
        </p>

        <div className="escudo-a absolute left-[320px] top-[230px] opacity-0">
          <div style={{ filter: `drop-shadow(0 0 50px ${conAlfa(colA.vivo, 0.6)})` }}>
            <Escudo equipo={a?.equipo ?? null} tamano={320} cargaInmediata />
          </div>
        </div>
        {!bye && (
          <div className="escudo-b absolute left-[1280px] top-[230px] opacity-0">
            <div style={{ filter: `drop-shadow(0 0 50px ${conAlfa(colB.vivo, 0.6)})` }}>
              <Escudo equipo={b?.equipo ?? null} tamano={320} cargaInmediata />
            </div>
          </div>
        )}

        <div className="onda pointer-events-none absolute left-[860px] top-[290px] h-[200px] w-[200px] rounded-full border-[6px] border-white opacity-0" />
        {Array.from({ length: CHISPAS }, (_, i) => (
          <span
            key={i}
            className="chispa pointer-events-none absolute left-[952px] top-[382px] h-4 w-4 rotate-45 opacity-0"
            style={{ background: i % 2 === 0 ? colA.vivo : bye ? VERDE : colB.vivo, boxShadow: "0 0 18px rgba(255,255,255,0.8)" }}
          />
        ))}
        <div className="vs absolute left-0 top-[300px] flex h-[180px] w-full items-center justify-center opacity-0">
          <span
            className="torneo-hud text-[150px] leading-none text-[#ff3b4e]"
            style={{ textShadow: "0 0 50px rgba(255,59,78,0.75), 0 0 2px #fff" }}
          >
            {bye ? "»" : "VS"}
          </span>
        </div>

        <div className="nombre absolute left-0 top-[610px] w-[960px] opacity-0">
          <NombreCruce jugador={a} color={colA.vivo} />
        </div>
        <div className="nombre absolute left-[960px] top-[610px] w-[960px] opacity-0">
          {bye ? (
            <div className="flex flex-col items-center pt-6 text-center">
              <span className="torneo-titulo text-[96px] font-extrabold italic text-white/80">Pase directo</span>
              <span className="torneo-hud mt-5 text-[30px]" style={{ color: VERDE }}>
                Avanza a la ronda 2
              </span>
            </div>
          ) : (
            <NombreCruce jugador={b} color={colB.vivo} />
          )}
        </div>
      </div>

      <div
        className="destello pointer-events-none absolute inset-0 opacity-0"
        style={{
          background: `radial-gradient(circle at 50% 38%, #ffffff, ${conAlfa(colA.vivo, 0.55)} 30%, ${conAlfa(bye ? VERDE : colB.vivo, 0.35)} 55%, transparent 85%)`,
        }}
      />
    </div>
  );
}

/** Carga los escudos del catálogo antes de la primera ruleta, para que ninguno aparezca tarde. */
export function PrecargaEscudos() {
  return (
    <div className="pointer-events-none absolute left-0 top-0 h-px w-px overflow-hidden opacity-0" aria-hidden="true">
      {CATALOGO_CLUBES.map((c) => (
        <Escudo key={c.slug} equipo={c.nombre} tamano={ESCUDO_TIRA} cargaInmediata />
      ))}
    </div>
  );
}
