"use client";

import { useRef, type CSSProperties } from "react";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import RayoLava from "./_RayoLava";
import { azar, bezier, type Energia } from "./_escena";
import { usarMovimientoReducido } from "./_movimiento";

gsap.registerPlugin(useGSAP);

// three.js pesa: se baja aparte y solo en el cliente.
const PelotaRayo = dynamic(() => import("./_PelotaRayo"), { ssr: false });

// Curvas propias (las de fábrica son flojas). Salida fuerte y una con un mínimo asentamiento.
const SALIDA = bezier(0.23, 1, 0.32, 1);
const ATERRIZAJE = bezier(0.16, 1.08, 0.3, 1);
const VAIVEN = bezier(0.45, 0, 0.55, 1);

// Posiciones fijas calculadas con un hash: servidor y cliente pintan lo mismo (sin Math.random).
const ESTRELLAS = Array.from({ length: 64 }, (_, i) => {
  const brillo = azar(i, 4);
  return {
    x: (azar(i, 1) * 100).toFixed(2),
    y: (azar(i, 2) * 78).toFixed(2),
    r: (1 + azar(i, 3) * 1.4).toFixed(2),
    o: (0.35 + brillo * 0.6).toFixed(2),
    d: (2.4 + azar(i, 5) * 4).toFixed(2),
    w: (-azar(i, 6) * 6).toFixed(2),
  };
});
const BOKEH = Array.from({ length: 6 }, (_, i) => ({
  x: (50 + (azar(i, 7) * 2 - 1) * 26).toFixed(2),
  s: (1.4 + azar(i, 8) * 2.6).toFixed(2),
  d: (9 + azar(i, 9) * 6).toFixed(2),
  w: (-azar(i, 10) * 12).toFixed(2),
}));
// Luces del borde de la nave, sobre la mitad de adelante de la elipse.
const LUCES = Array.from({ length: 11 }, (_, i) => {
  const ang = (Math.PI * (i + 0.5)) / 11;
  return {
    cx: (100 - Math.cos(ang) * 84).toFixed(2),
    cy: (52 + Math.sin(ang) * 9.5).toFixed(2),
    roja: i === 2 || i === 8,
  };
});

function v(nombre: string, valor: string): CSSProperties {
  return { [nombre]: valor } as CSSProperties;
}

/**
 * Escena de abducción: la nave baja, el rayo se enciende con un parpadeo, la lava de luz empieza
 * a subir por el haz y la pelota alien levita adentro. Capas con parallax del mouse (solo con
 * puntero fino). Decorativa: aria-hidden, respeta prefers-reduced-motion y se pausa con la
 * pestaña oculta. `tele`: tamaño fijo para el lienzo de 1920x1080 de la pantalla del torneo
 * (sin depender del viewport) y el HUD legible a distancia.
 */
export default function EscenaOvni({ compacta = false, tele = false }: { compacta?: boolean; tele?: boolean }) {
  const raiz = useRef<HTMLDivElement>(null);
  const energia = useRef<Energia>({ haz: 0, alcance: 0 });
  const quieto = usarMovimientoReducido();

  useGSAP(
    () => {
      const q = gsap.utils.selector(raiz);
      const e = energia.current;

      if (quieto) {
        e.haz = 1;
        e.alcance = 1;
        gsap.set(q(".escena-entra"), { opacity: 1 });
        return;
      }

      e.haz = 0;
      e.alcance = 0;
      const maestro = gsap.timeline();

      // Entrada (~2.6 s). La nave cae con inercia y se asienta; el rayo baja y parpadea al
      // encenderse; la pelota sube desde la lava hasta su altura.
      const intro = gsap.timeline({ defaults: { ease: SALIDA } });
      intro
        .fromTo(q(".escena-hud"), { opacity: 0 }, { opacity: 1, duration: 0.8 }, 0.1)
        .fromTo(
          q(".escena-nave"),
          { yPercent: -170, rotation: -7, opacity: 0 },
          {
            yPercent: 0,
            rotation: 0,
            opacity: 1,
            duration: 1.5,
            ease: ATERRIZAJE,
          },
          0.1,
        )
        .fromTo(
          q(".escena-emisor"),
          { opacity: 0, scale: 0.7, transformOrigin: "50% 50%" },
          { opacity: 1, scale: 1, duration: 0.6 },
          1.0,
        )
        .to(e, { alcance: 1, duration: 1.0, ease: VAIVEN }, 1.1)
        .to(
          e,
          {
            keyframes: { haz: [0, 0.6, 0.12, 0.85, 0.3, 1], easeEach: "none" },
            duration: 0.75,
            ease: "none",
          },
          1.1,
        )
        .fromTo(
          q(".escena-pelota"),
          { yPercent: 46, scale: 0.9, opacity: 0 },
          { yPercent: 0, scale: 1, opacity: 1, duration: 1.7 },
          1.45,
        )
        .fromTo(
          q(".escena-reticula"),
          { opacity: 0, scale: 1.18 },
          { opacity: 1, scale: 1, duration: 0.55 },
          2.5,
        );
      maestro.add(intro, 0);

      // Bucles. Periodos distintos entre sí para que nunca se vea el "loop".
      const desde = 1.7;
      maestro
        .to(
          q(".escena-nave-flota"),
          {
            yPercent: -7,
            duration: 3.1,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
          },
          desde,
        )
        .to(
          q(".escena-nave-flota"),
          {
            rotation: 1.6,
            duration: 4.3,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
          },
          desde,
        )
        .to(
          q(".escena-glow"),
          {
            opacity: 0.55,
            scaleX: 0.9,
            duration: 2.3,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
          },
          desde,
        )
        .to(
          q(".escena-luz"),
          {
            opacity: 0.2,
            duration: 0.45,
            ease: "sine.inOut",
            stagger: { each: 0.09, repeat: -1, yoyo: true },
          },
          0.6,
        )
        .to(
          q(".escena-pelota-flota"),
          {
            yPercent: -6,
            duration: 2.7,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
          },
          desde + 1.2,
        )
        .to(
          q(".escena-reticula-flota"),
          {
            yPercent: -6,
            duration: 2.7,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
          },
          desde + 1.36,
        )
        // El rayo respira y cada tanto pega un pico; la pelota y la lava lo acusan.
        .to(
          e,
          {
            keyframes: {
              haz: [1, 0.86, 1, 1, 1.35, 0.95, 1],
              easeEach: "sine.inOut",
            },
            duration: 7,
            ease: "none",
            repeat: -1,
          },
          2.2,
        );

      // Pausa total con la pestaña oculta (los lienzos se pausan solos).
      const alCambiar = () => (document.hidden ? maestro.pause() : maestro.resume());
      document.addEventListener("visibilitychange", alCambiar);

      // Parallax: solo con mouse. Cada capa se mueve más cuanto más cerca está.
      let quitarPuntero = () => {};
      if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
        const capas = (
          [
            [".escena-capa-lejos", 5],
            [".escena-capa-medio", 11],
            [".escena-capa-cerca", 20],
            [".escena-capa-frente", 34],
          ] as const
        ).map(([sel, px]) => {
          const els = q(sel);
          return {
            px,
            x: gsap.quickTo(els, "x", { duration: 1.1, ease: "power3.out" }),
            y: gsap.quickTo(els, "y", { duration: 1.1, ease: "power3.out" }),
          };
        });
        const mover = (ev: PointerEvent) => {
          const nx = (ev.clientX / window.innerWidth) * 2 - 1;
          const ny = (ev.clientY / window.innerHeight) * 2 - 1;
          for (const c of capas) {
            c.x(-nx * c.px);
            c.y(-ny * c.px * 0.6);
          }
        };
        window.addEventListener("pointermove", mover, { passive: true });
        quitarPuntero = () => window.removeEventListener("pointermove", mover);
      }

      return () => {
        document.removeEventListener("visibilitychange", alCambiar);
        quitarPuntero();
      };
    },
    { scope: raiz, dependencies: [quieto], revertOnUpdate: true },
  );

  return (
    <div
      ref={raiz}
      aria-hidden="true"
      className={`torneo-escena${compacta ? " torneo-escena--compacta" : ""}${tele ? " torneo-escena--tele" : ""}`}
    >
      <div className="escena-capa escena-capa-lejos">
        {ESTRELLAS.map((s, i) => (
          <span
            key={i}
            className="escena-estrella"
            style={{
              left: `${s.x}%`,
              top: `${s.y}%`,
              width: `${s.r}px`,
              height: `${s.r}px`,
              ...v("--o", s.o),
              ...v("--d", `${s.d}s`),
              ...v("--w", `${s.w}s`),
            }}
          />
        ))}
      </div>

      <div className="escena-capa escena-capa-medio escena-capa-rayo">
        <RayoLava energia={energia} quieto={quieto} />
      </div>

      <div className="escena-capa escena-capa-medio">
        <div className="escena-glow escena-entra" />
        <div className="escena-nave escena-entra">
          <div className="escena-nave-flota">
            <Nave />
          </div>
        </div>
      </div>

      <div className="escena-capa escena-capa-cerca">
        <div className="escena-pelota escena-entra">
          <div className="escena-pelota-flota">
            <PelotaRayo energia={energia} quieto={quieto} />
          </div>
        </div>
        <div className="escena-reticula escena-entra">
          <div className="escena-reticula-flota">
            <span className="escena-reticula-esquinas" />
            <span className="escena-reticula-tag torneo-hud">OBJ-51 · en ascenso</span>
          </div>
        </div>
      </div>

      <div className="escena-capa escena-capa-frente">
        {BOKEH.map((b, i) => (
          <span
            key={i}
            className="escena-bokeh"
            style={{
              left: `${b.x}%`,
              ...v("--s", b.s),
              ...v("--d", `${b.d}s`),
              ...v("--w", `${b.w}s`),
            }}
          />
        ))}
      </div>

      <div className="escena-hud escena-entra torneo-hud">
        <span className="escena-esquina" data-pos="tl" />
        <span className="escena-esquina" data-pos="tr" />
        <span className="escena-esquina" data-pos="bl" />
        <span className="escena-esquina" data-pos="br" />
        <span className="escena-rec">
          <i />
          Rec
        </span>
        <span className="escena-cam">Cam 51 · Nevada</span>
        <span className="escena-coord">37.2350°N 115.8111°W</span>
      </div>
    </div>
  );
}

function Nave() {
  return (
    <svg className="escena-nave-svg" viewBox="0 0 200 76" fill="none">
      <defs>
        <linearGradient id="nave-casco" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a4c40" />
          <stop offset="0.45" stopColor="#141d18" />
          <stop offset="1" stopColor="#050806" />
        </linearGradient>
        <linearGradient id="nave-brillo" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#d6ffc2" stopOpacity="0" />
          <stop offset="0.35" stopColor="#d6ffc2" stopOpacity="0.55" />
          <stop offset="0.6" stopColor="#d6ffc2" stopOpacity="0.08" />
          <stop offset="1" stopColor="#d6ffc2" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="nave-cupula" cx="0.38" cy="0.3" r="0.85">
          <stop offset="0" stopColor="#c8ffad" stopOpacity="0.55" />
          <stop offset="0.5" stopColor="#3f8a2c" stopOpacity="0.45" />
          <stop offset="1" stopColor="#0b160d" stopOpacity="0.92" />
        </radialGradient>
        <radialGradient id="nave-emisor" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#f2ffe9" />
          <stop offset="0.45" stopColor="#8cff59" />
          <stop offset="1" stopColor="#8cff59" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Cúpula con el tripulante */}
      <path d="M66 46C66 21 81 8 100 8s34 13 34 38z" fill="url(#nave-cupula)" />
      <ellipse cx="100" cy="35" rx="9" ry="11.5" fill="#06100a" fillOpacity="0.85" />
      <path d="M90 47c1-6 5-9.5 10-9.5s9 3.5 10 9.5z" fill="#06100a" fillOpacity="0.85" />
      <ellipse
        cx="96.4"
        cy="34.5"
        rx="2.6"
        ry="1.5"
        fill="#8cff59"
        transform="rotate(18 96.4 34.5)"
      />
      <ellipse
        cx="103.6"
        cy="34.5"
        rx="2.6"
        ry="1.5"
        fill="#8cff59"
        transform="rotate(-18 103.6 34.5)"
      />
      <path
        d="M74 30c3-11 11-17 21-18"
        stroke="#ffffff"
        strokeOpacity="0.35"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M66 46C66 21 81 8 100 8s34 13 34 38"
        stroke="#8cff59"
        strokeOpacity="0.7"
        strokeWidth="1.1"
      />

      {/* Casco */}
      <ellipse cx="100" cy="51" rx="96" ry="16" fill="url(#nave-casco)" />
      <ellipse cx="100" cy="47" rx="80" ry="7" fill="url(#nave-brillo)" />
      <ellipse
        cx="100"
        cy="51"
        rx="96"
        ry="16"
        stroke="#8cff59"
        strokeOpacity="0.75"
        strokeWidth="1.1"
      />
      <path
        d="M8 54c22 9 58 13 92 13s70-4 92-13"
        stroke="#8cff59"
        strokeOpacity="0.28"
        strokeWidth="0.9"
      />

      {/* Luces del borde */}
      {LUCES.map((l, i) => (
        <circle
          key={i}
          className="escena-luz"
          cx={l.cx}
          cy={l.cy}
          r={l.roja ? 2 : 1.7}
          fill={l.roja ? "#ff3b4e" : "#b8ff94"}
        />
      ))}

      {/* Panza y emisor del rayo */}
      <ellipse
        cx="100"
        cy="63"
        rx="40"
        ry="6.5"
        fill="#060a08"
        stroke="#8cff59"
        strokeOpacity="0.35"
        strokeWidth="0.8"
      />
      <g className="escena-emisor">
        <ellipse cx="100" cy="66" rx="24" ry="6" fill="url(#nave-emisor)" />
        <ellipse cx="100" cy="65.5" rx="10" ry="2.4" fill="#f4ffee" />
      </g>
    </svg>
  );
}
