"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import Escudo from "@/components/torneo/Escudo";
import { fueAPenales } from "@/lib/torneo";
import { coloresDeEquipo } from "@/lib/torneo-escudos";
import type { TableroPublico } from "@/lib/torneo-juego";
import { crearLimitador60, usarMovimientoReducido } from "../_movimiento";
import { conAlfa, cuerpoPorLargo, VERDE, type Jugador } from "./_comun";

gsap.registerPlugin(useGSAP);

// Se dibuja sobre el lienzo de 1920x1080 de la tele (ver _Pantalla).
const ANCHO = 1920;
const ALTO = 1080;

// ————————————————————————————
// Confeti en un lienzo 2D: cientos de papelitos sin tocar el DOM, a 60 fps como máximo.
// ————————————————————————————
type Pieza = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Giro en el plano y su velocidad. */
  giro: number;
  vGiro: number;
  /** Vuelta sobre su eje (el papelito que se da vuelta y titila) y su velocidad. */
  vuelta: number;
  vVuelta: number;
  /** Bamboleo lateral al caer. */
  fase: number;
  ancho: number;
  alto: number;
  /** Velocidad de caída máxima: unos flotan más que otros. */
  caida: number;
  color: string;
};

type Confeti = {
  /** Un estallido desde (x, y): `angulo` y `apertura` en radianes (0 = derecha, -π/2 = arriba). */
  rafaga: (x: number, y: number, n: number, angulo: number, apertura: number, fuerza: number) => void;
  /** Papelitos por segundo que caen desde arriba (0 = corta la lluvia). */
  lluvia: (porSegundo: number) => void;
  destruir: () => void;
};

const MAX_PIEZAS = 420;
const GRAVEDAD = 1300;

function crearConfeti(lienzo: HTMLCanvasElement, colores: string[]): Confeti {
  const ctx = lienzo.getContext("2d");
  if (!ctx) return { rafaga: () => {}, lluvia: () => {}, destruir: () => {} };

  const piezas: Pieza[] = [];
  let porSegundo = 0;
  let acumulado = 0;
  let ultimo = performance.now();
  let cuadro = 0;
  let limpio = true;
  const toca = crearLimitador60();
  const entre = (a: number, b: number) => a + Math.random() * (b - a);

  const nueva = (x: number, y: number, vx: number, vy: number) => {
    if (piezas.length >= MAX_PIEZAS) return;
    const cinta = Math.random() < 0.22;
    piezas.push({
      x,
      y,
      vx,
      vy,
      giro: entre(0, Math.PI * 2),
      vGiro: entre(-6, 6),
      vuelta: entre(0, Math.PI * 2),
      vVuelta: entre(5, 13),
      fase: entre(0, Math.PI * 2),
      ancho: cinta ? entre(3, 4.5) : entre(9, 15),
      alto: cinta ? entre(16, 24) : entre(5, 8),
      caida: entre(150, 260),
      color: colores[Math.floor(Math.random() * colores.length)],
    });
  };

  const paso = (ahora: number) => {
    cuadro = requestAnimationFrame(paso);
    if (document.hidden) {
      ultimo = ahora;
      return;
    }
    if (!toca(ahora)) return;
    // dt acotado: tras una pausa larga los papelitos no saltan de lugar.
    const dt = Math.min((ahora - ultimo) / 1000, 1 / 30);
    ultimo = ahora;

    acumulado += porSegundo * dt;
    while (acumulado >= 1) {
      acumulado -= 1;
      nueva(entre(-20, ANCHO + 20), -20, entre(-40, 40), entre(60, 160));
    }
    if (piezas.length === 0) {
      // Nada que dibujar: se limpia una vez y el lienzo queda en paz.
      if (!limpio) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, ANCHO, ALTO);
        limpio = true;
      }
      return;
    }
    limpio = false;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ANCHO, ALTO);

    const freno = Math.exp(-1.9 * dt);
    for (let i = piezas.length - 1; i >= 0; i--) {
      const p = piezas[i];
      p.vx *= freno;
      p.vy = Math.min(p.vy * (p.vy < 0 ? freno : 1) + GRAVEDAD * dt, p.caida);
      p.fase += dt * 2.4;
      p.x += (p.vx + Math.sin(p.fase) * 38) * dt;
      p.y += p.vy * dt;
      p.giro += p.vGiro * dt;
      p.vuelta += p.vVuelta * dt;
      if (p.y > ALTO + 30 || p.x < -80 || p.x > ANCHO + 80) {
        // Sacar sin reordenar todo: el último ocupa su lugar.
        piezas[i] = piezas[piezas.length - 1];
        piezas.pop();
        continue;
      }
      const c = Math.cos(p.giro);
      const s = Math.sin(p.giro);
      const k = Math.cos(p.vuelta);
      ctx.setTransform(c, s, -s * k, c * k, p.x, p.y);
      // De canto se ve más oscuro: así "titila" como el papel de verdad.
      ctx.globalAlpha = 0.55 + 0.45 * Math.abs(k);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.ancho / 2, -p.alto / 2, p.ancho, p.alto);
    }
    ctx.globalAlpha = 1;
  };
  cuadro = requestAnimationFrame(paso);

  return {
    rafaga(x, y, n, angulo, apertura, fuerza) {
      for (let i = 0; i < n; i++) {
        const a = angulo + entre(-apertura / 2, apertura / 2);
        const v = fuerza * entre(0.45, 1);
        nueva(x + entre(-12, 12), y + entre(-12, 12), Math.cos(a) * v, Math.sin(a) * v);
      }
    },
    lluvia(n) {
      porSegundo = n;
    },
    destruir() {
      cancelAnimationFrame(cuadro);
      piezas.length = 0;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, ANCHO, ALTO);
    },
  };
}

// ————————————————————————————
// La escena de cierre: el campeón
// ————————————————————————————
function Segundo({ rotulo, jugador, cuerpo }: { rotulo: string; jugador: Jugador | undefined; cuerpo: number }) {
  return (
    <div className="segundo opacity-0">
      <p className="torneo-hud text-[22px] text-[#8cff59]">{rotulo}</p>
      <div className="mt-2 flex items-center justify-center gap-4">
        <Escudo equipo={jugador?.equipo ?? null} tamano={56} />
        <p className="torneo-titulo whitespace-nowrap font-extrabold italic text-white" style={{ fontSize: cuerpo }}>
          {jugador?.nombre}
        </p>
      </div>
    </div>
  );
}

/**
 * Cierre del torneo: el escudo del campeón cae y golpea, estalla el confeti con los colores del
 * club, los rayos giran detrás y dos reflectores barren la tele. Después queda vivo (rayos,
 * reflectores, lluvia de confeti y un latido cada tanto) mientras la tele siga en el podio.
 * Con movimiento reducido se muestra todo quieto, sin confeti.
 */
export function Podio({ tablero, jugadores }: { tablero: TableroPublico; jugadores: Map<string, Jugador> }) {
  const raiz = useRef<HTMLDivElement>(null);
  const lienzo = useRef<HTMLCanvasElement>(null);
  const quieto = usarMovimientoReducido();

  const { campeonId, subcampeonId, tercerosIds } = tablero.podio;
  const campeon = campeonId ? jugadores.get(campeonId) : undefined;
  const subcampeon = subcampeonId ? jugadores.get(subcampeonId) : undefined;
  const colores = coloresDeEquipo(campeon?.equipo ?? null);
  const rondas = Math.max(...tablero.partidos.map((p) => p.ronda));
  const final = tablero.partidos.find((p) => p.ronda === rondas);
  // Los goles de la final, siempre desde el lado del campeón: "3 – 1".
  const golesFinal =
    final && final.marcadorA !== null && final.marcadorB !== null
      ? final.ganadorId === final.jugadorAId
        ? [final.marcadorA, final.marcadorB]
        : [final.marcadorB, final.marcadorA]
      : null;
  const nombreCampeon = campeon?.nombre ?? "";
  // Debajo del campeón entran tres nombres en fila: si alguno es largo, bajan los tres juntos.
  const segundos = [subcampeon, ...tercerosIds.map((id) => jugadores.get(id))];
  const largoMayor = Math.max(0, ...segundos.map((j) => j?.nombre.length ?? 0));
  const cuerpoSegundos = cuerpoPorLargo(largoMayor, [[10, 64], [14, 52]], 42);

  useGSAP(
    () => {
      const el = raiz.current;
      if (!el) return;
      const q = gsap.utils.selector(el);
      const animados = q(".escudo, .rotulo, .alias, .equipo, .final, .segundo, .premios, .tinte, .rayos, .reflector");

      if (quieto) {
        gsap.set(animados, { opacity: 1 });
        return;
      }

      // Centro del escudo en coordenadas del lienzo (la tele está escalada: se divide por la escala).
      const centroEscudo = () => {
        const r = el.getBoundingClientRect();
        const e = (q(".escudo")[0] as HTMLElement | undefined)?.getBoundingClientRect();
        const escala = r.width / ANCHO || 1;
        if (!e) return { x: ANCHO / 2, y: 220 };
        return { x: (e.left + e.width / 2 - r.left) / escala, y: (e.top + e.height / 2 - r.top) / escala };
      };

      const paleta = [colores.vivo, colores.primario, colores.secundario, VERDE, "#ffffff", colores.vivo];
      const confeti = lienzo.current ? crearConfeti(lienzo.current, paleta) : null;
      const estallido = (grande: boolean) => {
        if (!confeti) return;
        const c = centroEscudo();
        confeti.rafaga(c.x, c.y, grande ? 170 : 60, -Math.PI / 2, Math.PI * 2, grande ? 1250 : 850);
        if (grande) {
          // Dos cañones desde las esquinas de abajo, cruzándose sobre el escudo.
          confeti.rafaga(40, ALTO, 90, -Math.PI / 2 + 0.55, 0.5, 1900);
          confeti.rafaga(ANCHO - 40, ALTO, 90, -Math.PI / 2 - 0.55, 0.5, 1900);
        }
      };

      const t = gsap.timeline();
      t.fromTo(q(".tinte"), { opacity: 0 }, { opacity: 1, duration: 0.8 })
        .fromTo(q(".rayos"), { opacity: 0, scale: 0.3 }, { opacity: 1, scale: 1, duration: 1.1, ease: "power3.out" }, "<")
        .fromTo(q(".reflector-a"), { opacity: 0, rotate: -70 }, { opacity: 1, rotate: -26, duration: 1.1, ease: "power3.out" }, "<0.1")
        .fromTo(q(".reflector-b"), { opacity: 0, rotate: 70 }, { opacity: 1, rotate: 26, duration: 1.1, ease: "power3.out" }, "<")
        // El escudo cae desde arriba con todo su peso...
        .fromTo(
          q(".escudo"),
          { opacity: 0, y: -560, scale: 0.5, rotate: -14 },
          { opacity: 1, y: 0, scale: 1.14, rotate: 0, duration: 0.75, ease: "power3.in" },
          "-=0.55",
        )
        // ...y golpea: destello, temblor, onda y confeti.
        .addLabel("golpe")
        .call(() => estallido(true), [], "golpe")
        .fromTo(q(".destello"), { opacity: 0.95 }, { opacity: 0, immediateRender: false, duration: 0.85, ease: "power2.out" }, "golpe")
        .fromTo(q(".temblor"), { x: -22, y: 12 }, { x: 0, y: 0, immediateRender: false, duration: 0.8, ease: "elastic.out(1.3, 0.25)" }, "golpe")
        .fromTo(q(".onda"), { scale: 0, opacity: 1 }, { scale: 6, opacity: 0, immediateRender: false, duration: 1, ease: "power2.out" }, "golpe")
        .to(q(".escudo"), { scale: 1, duration: 0.6, ease: "back.out(3)" }, "golpe")
        .fromTo(q(".rotulo"), { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" }, "golpe+=0.15")
        .fromTo(
          q(".alias"),
          { opacity: 0, scale: 1.6, filter: "blur(18px)" },
          { opacity: 1, scale: 1, filter: "blur(0px)", duration: 0.7, ease: "expo.out" },
          "golpe+=0.25",
        )
        .fromTo(q(".equipo"), { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, "golpe+=0.55")
        .fromTo(q(".final"), { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, "golpe+=0.75")
        .fromTo(
          q(".segundo"),
          { opacity: 0, y: 40 },
          { opacity: 1, y: 0, duration: 0.5, stagger: 0.12, ease: "power3.out" },
          "golpe+=0.95",
        )
        .fromTo(q(".premios"), { opacity: 0 }, { opacity: 1, duration: 0.6 }, "golpe+=1.3")
        .call(() => confeti?.lluvia(16), [], "golpe+=1.4");

      // Lo que queda vivo mientras la tele siga en el podio. Periodos distintos: no se ve el loop.
      gsap.to(q(".rayos-giro"), { rotate: 360, duration: 30, ease: "none", repeat: -1 });
      gsap.to(q(".halo"), { scale: 1.12, opacity: 0.75, duration: 1.7, ease: "sine.inOut", yoyo: true, repeat: -1 });
      gsap.to(q(".reflector-a"), { rotate: -8, duration: 3.6, ease: "sine.inOut", yoyo: true, repeat: -1, delay: 2.4 });
      gsap.to(q(".reflector-b"), { rotate: 8, duration: 4.3, ease: "sine.inOut", yoyo: true, repeat: -1, delay: 2.4 });
      // Un latido cada ~9 s: el escudo late, sale una onda y otra tanda de confeti.
      gsap
        .timeline({ repeat: -1, repeatDelay: 8, delay: 9 })
        .to(q(".escudo"), { scale: 1.08, duration: 0.16, ease: "power2.out" })
        .call(() => estallido(false))
        .fromTo(q(".onda"), { scale: 0, opacity: 0.8 }, { scale: 5, opacity: 0, duration: 0.9, ease: "power2.out" }, "<")
        .to(q(".escudo"), { scale: 1, duration: 0.6, ease: "elastic.out(1.2, 0.35)" }, "<");

      return () => confeti?.destruir();
    },
    { scope: raiz, dependencies: [quieto, campeonId], revertOnUpdate: true },
  );

  return (
    <div ref={raiz} className="absolute inset-0 overflow-hidden">
      {/* Fondo con los colores del club campeón. */}
      <div
        className="tinte absolute inset-0 opacity-0"
        style={{
          background: `radial-gradient(60% 55% at 50% 30%, ${conAlfa(colores.primario, 0.5)}, ${conAlfa(colores.secundario, 0.2)} 50%, transparent 80%)`,
        }}
      />
      {/* Reflectores de estadio desde las esquinas de abajo. */}
      {(["a", "b"] as const).map((lado) => (
        <div
          key={lado}
          className={`reflector reflector-${lado} pointer-events-none absolute bottom-[-60px] h-[1500px] w-[420px] origin-bottom opacity-0 [clip-path:polygon(46%_100%,54%_100%,100%_0,0_0)] ${lado === "a" ? "left-[120px]" : "right-[120px]"}`}
          style={{ background: `linear-gradient(to top, ${conAlfa(colores.vivo, 0.42)}, ${conAlfa(colores.vivo, 0.1)} 55%, transparent 85%)` }}
        />
      ))}

      <div className="temblor absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className="relative mb-4">
          {/* Rayos que giran detrás del escudo (el mismo recurso que la ruleta), centrados en él. */}
          <div className="rayos pointer-events-none absolute left-1/2 top-1/2 -ml-[800px] -mt-[800px] h-[1600px] w-[1600px] opacity-0 [mask-image:radial-gradient(circle,black_8%,transparent_60%)]">
            <div
              className="rayos-giro h-full w-full"
              style={{ background: `repeating-conic-gradient(${conAlfa(colores.vivo, 0.3)} 0deg 6deg, transparent 6deg 20deg)` }}
            />
          </div>
          <div
            className="halo pointer-events-none absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-50"
            style={{ background: `radial-gradient(circle, ${conAlfa(colores.vivo, 0.55)}, transparent 65%)` }}
          />
          <div className="onda pointer-events-none absolute left-1/2 top-1/2 -ml-[60px] -mt-[60px] h-[120px] w-[120px] rounded-full border-[6px] border-white opacity-0" />
          {/* La sombra va adentro: el escudo se mueve (transform) sin recalcular el filtro en cada cuadro. */}
          <div className="escudo relative opacity-0 will-change-transform">
            <div style={{ filter: `drop-shadow(0 0 50px ${conAlfa(colores.vivo, 0.7)})` }}>
              {campeon?.equipo ? (
                <Escudo equipo={campeon.equipo} tamano={250} cargaInmediata />
              ) : (
                <div className="h-[250px] w-[250px]" />
              )}
            </div>
          </div>
        </div>
        <p className="rotulo torneo-hud flex items-center gap-6 text-[34px] text-[#8cff59] opacity-0">
          <span className="h-px w-24 bg-gradient-to-r from-transparent to-[#8cff59]" />
          Campeón
          <span className="h-px w-24 bg-gradient-to-l from-transparent to-[#8cff59]" />
        </p>
        <h1
          className="alias torneo-titulo mt-4 whitespace-nowrap font-extrabold italic text-white opacity-0"
          style={{
            textShadow: `0 0 70px ${conAlfa(colores.vivo, 0.65)}, 0 4px 30px rgba(0,0,0,0.8)`,
            fontSize: cuerpoPorLargo(nombreCampeon.length, [[10, 200], [14, 160]], 128),
          }}
        >
          {nombreCampeon}
        </h1>
        {campeon?.equipo && (
          <p
            className="equipo torneo-hud mt-4 text-[44px] opacity-0"
            style={{ color: colores.vivo, textShadow: `0 0 30px ${conAlfa(colores.vivo, 0.5)}` }}
          >
            {campeon.equipo}
          </p>
        )}
        {golesFinal && subcampeon && (
          <p className="final torneo-hud mt-6 flex items-baseline justify-center gap-5 text-[30px] text-white/80 opacity-0">
            <span className="text-[#8cff59]">Final</span>
            <span className="torneo-titulo text-[56px] font-extrabold tabular-nums text-white">
              {golesFinal[0]} – {golesFinal[1]}
            </span>
            {final && fueAPenales(final) ? <span className="text-[#8cff59]">pen.</span> : null}
            <span>vs</span>
            <span className="torneo-titulo text-[44px] font-extrabold italic text-white">{subcampeon.nombre}</span>
          </p>
        )}
        <div className="mt-12 flex gap-24">
          {subcampeon && <Segundo rotulo="Subcampeón" jugador={subcampeon} cuerpo={cuerpoSegundos} />}
          {tercerosIds.map((id) => (
            <Segundo key={id} rotulo="Semifinalista" jugador={jugadores.get(id)} cuerpo={cuerpoSegundos} />
          ))}
        </div>
        {tablero.torneo.premiosTexto && (
          <p className="premios torneo-hud mt-10 max-w-[1500px] whitespace-pre-line text-[24px] text-white/70 opacity-0">
            {tablero.torneo.premiosTexto}
          </p>
        )}
      </div>

      {/* El confeti cae por delante de todo; los papelitos son chicos y no tapan el alias. */}
      <canvas
        ref={lienzo}
        width={ANCHO}
        height={ALTO}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full"
      />
      <div
        className="destello pointer-events-none absolute inset-0 opacity-0"
        style={{ background: `radial-gradient(circle at 50% 24%, #ffffff, ${conAlfa(colores.vivo, 0.6)} 35%, transparent 80%)` }}
      />
    </div>
  );
}
