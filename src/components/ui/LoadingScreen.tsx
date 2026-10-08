/**
 * Pantalla de carga entre rutas (la montan los loading.tsx de admin, login y pantalla).
 *
 * Un marciano A51 en SVG al que le pasa un escáner tipo Face ID: la línea barre
 * el rostro de arriba abajo, cada punto de referencia se enciende cuando la
 * línea lo cruza, la malla se va uniendo, el anillo marca el avance y al final
 * los corchetes "fijan" la cara. Glitch sutil y parpadeo cada tanto.
 *
 * Todo es CSS a propósito (no GSAP): loading.tsx se pinta en el HTML que llega
 * por streaming, antes de que hidrate React. Una animación con JS arrancaría
 * recién al hidratar, justo cuando la carga ya está terminando. Las animaciones
 * CSS corren desde el primer frame y solo tocan transform/opacity/dashoffset.
 *
 * Con prefers-reduced-motion queda una versión quieta con un pulso suave.
 */

const CICLO = 2.8; // segundos de una pasada del escáner
const Y_INICIO = 36; // donde arranca la línea (coronilla)
const Y_FIN = 198; // donde termina (debajo del mentón)
const F_INICIO = 0.04; // fracción del ciclo en que arranca el barrido
const F_BARRIDO = 0.7; // fracción del ciclo que dura el barrido
const F_FIJA = 0.78; // fracción en que los corchetes fijan la cara
const F_APAGA = 0.9; // fracción en que todo se apaga para la próxima pasada

const HEAD =
  "M120 38 C154 38 178 60 178 94 C178 128 158 160 138 182 C130 191 125 196 120 196 C115 196 110 191 102 182 C82 160 62 128 62 94 C62 60 86 38 120 38 Z";
const EYE_L =
  "M111 127 C104 133 88 130 79 120 C70 110 70 99 76 97 C86 94 104 104 110 116 C113 121 113 125 111 127 Z";
const EYE_R =
  "M129 127 C136 133 152 130 161 120 C170 110 170 99 164 97 C154 94 136 104 130 116 C127 121 127 125 129 127 Z";

const LANDMARKS: ReadonlyArray<readonly [number, number]> = [
  [120, 46], // 0 coronilla
  [80, 70], // 1 sien izq
  [160, 70], // 2 sien der
  [120, 80], // 3 frente
  [97, 98], // 4 ceja izq
  [143, 98], // 5 ceja der
  [74, 99], // 6 ojo ext izq
  [110, 126], // 7 ojo int izq
  [166, 99], // 8 ojo ext der
  [130, 126], // 9 ojo int der
  [120, 118], // 10 puente
  [82, 142], // 11 pómulo izq
  [158, 142], // 12 pómulo der
  [120, 150], // 13 nariz
  [110, 168], // 14 boca izq
  [130, 168], // 15 boca der
  [100, 180], // 16 mandíbula izq
  [140, 180], // 17 mandíbula der
  [120, 193], // 18 mentón
];

const EDGES: ReadonlyArray<readonly [number, number]> = [
  [0, 1], [0, 2], [0, 3], [1, 3], [2, 3], [1, 6], [2, 8], [1, 4], [2, 5],
  [3, 4], [3, 5], [4, 10], [5, 10], [4, 6], [5, 8], [4, 7], [5, 9], [7, 10],
  [9, 10], [6, 11], [8, 12], [7, 11], [9, 12], [7, 13], [9, 13], [10, 13],
  [11, 13], [12, 13], [11, 14], [12, 15], [13, 14], [13, 15], [14, 15],
  [11, 16], [12, 17], [14, 16], [15, 17], [16, 18], [17, 18], [14, 18], [15, 18],
];

/** Fracción del ciclo en que la línea del escáner pasa por la altura y. */
function fraccionEn(y: number): number {
  return F_INICIO + ((y - Y_INICIO) / (Y_FIN - Y_INICIO)) * F_BARRIDO;
}

function pct(f: number): string {
  return `${(Math.min(Math.max(f, 0), 1) * 100).toFixed(2)}%`;
}

/** Ticks del anillo exterior en un solo path (más barato que 72 elementos). */
function ticksPath(): string {
  const partes: string[] = [];
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    const largo = i % 6 === 0 ? 6 : 2.5;
    const r1 = 113;
    const r2 = r1 + largo;
    const x1 = 120 + Math.cos(a) * r1;
    const y1 = 120 + Math.sin(a) * r1;
    const x2 = 120 + Math.cos(a) * r2;
    const y2 = 120 + Math.sin(a) * r2;
    partes.push(`M${x1.toFixed(2)} ${y1.toFixed(2)}L${x2.toFixed(2)} ${y2.toFixed(2)}`);
  }
  return partes.join("");
}

const TICKS = ticksPath();
const RING_R = 106;
const RING_C = 2 * Math.PI * RING_R;

/**
 * Keyframes por punto y por segmento: cada uno se enciende exactamente cuando
 * la línea lo cruza y todos se apagan juntos al final de la pasada. Se generan
 * una vez al cargar el módulo.
 */
function keyframesSincronizados(): string {
  const reglas: string[] = [];

  LANDMARKS.forEach(([, y], i) => {
    const f = fraccionEn(y);
    reglas.push(
      `@keyframes a51ls-lm-${i}{0%,${pct(f)}{opacity:.14;transform:scale(.5)}` +
        `${pct(f + 0.015)}{opacity:1;transform:scale(1.9)}` +
        `${pct(f + 0.05)}{opacity:1;transform:scale(1)}` +
        `${pct(F_FIJA)}{opacity:1;transform:scale(1)}` +
        `${pct(F_FIJA + 0.02)}{opacity:1;transform:scale(1.35)}` +
        `${pct(F_FIJA + 0.05)}{opacity:.95;transform:scale(1)}` +
        `${pct(F_APAGA)},100%{opacity:.14;transform:scale(.5)}}`,
    );
    reglas.push(
      `@keyframes a51ls-ping-${i}{0%,${pct(f)}{opacity:0;transform:scale(.4)}` +
        `${pct(f + 0.01)}{opacity:.85;transform:scale(1)}` +
        `${pct(f + 0.09)},100%{opacity:0;transform:scale(3.2)}}`,
    );
  });

  EDGES.forEach(([a, b], i) => {
    const f = fraccionEn(Math.max(LANDMARKS[a][1], LANDMARKS[b][1]));
    reglas.push(
      `@keyframes a51ls-edge-${i}{0%,${pct(f)}{opacity:.05}` +
        `${pct(f + 0.03)}{opacity:.55}` +
        `${pct(F_FIJA)}{opacity:.42}` +
        `${pct(F_FIJA + 0.02)}{opacity:.7}` +
        `${pct(F_APAGA)},100%{opacity:.05}}`,
    );
  });

  return reglas.join("\n");
}

const STATUS = ["Escaneando…", "Mapeando rasgos…", "Verificando identidad…", "Enlazando con A51…"];

const CSS = `
.a51ls{position:fixed;inset:0;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;overflow:hidden;
  background:
    radial-gradient(ellipse 55% 45% at 50% 42%, rgba(140,255,89,.09) 0%, rgba(140,255,89,0) 70%),
    radial-gradient(ellipse 120% 90% at 50% 50%, rgba(0,0,0,0) 40%, rgba(0,0,0,.65) 100%),
    #0d0f0c;
  color:#8cff59;}
.a51ls::before{content:"";position:absolute;inset:0;pointer-events:none;opacity:.5;
  background-image:linear-gradient(rgba(140,255,89,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(140,255,89,.05) 1px,transparent 1px);
  background-size:28px 28px;background-position:center;
  -webkit-mask-image:radial-gradient(circle at 50% 42%,#000 0%,transparent 62%);mask-image:radial-gradient(circle at 50% 42%,#000 0%,transparent 62%);}
.a51ls::after{content:"";position:absolute;inset:0;pointer-events:none;opacity:.35;
  background:repeating-linear-gradient(0deg,rgba(0,0,0,.35) 0px,rgba(0,0,0,.35) 1px,transparent 1px,transparent 3px);}
.a51ls-svg{position:relative;z-index:1;display:block;width:clamp(220px,64vw,320px);height:auto;overflow:visible}
.a51ls-brackets,.a51ls-head,.a51ls-ghost,.a51ls-eyes,[class*="a51ls-lm-"],[class*="a51ls-ping-"]{transform-box:fill-box;transform-origin:center}
.a51ls-svg .a51ls-vb{transform-box:view-box;transform-origin:120px 120px}

.a51ls-ticks{animation:a51ls-spin 24s linear infinite}
.a51ls-arc{stroke-dasharray:${RING_C.toFixed(2)};animation:a51ls-arc ${CICLO}s linear infinite}
.a51ls-orbit{animation:a51ls-orbit ${CICLO}s linear infinite}
.a51ls-brackets{animation:a51ls-lock ${CICLO}s cubic-bezier(.2,.8,.2,1) infinite}
.a51ls-head{animation:a51ls-glitch 4.6s steps(1,end) infinite}
.a51ls-ghost{animation:a51ls-ghost 4.6s steps(1,end) infinite}
.a51ls-eyes{animation:a51ls-blink 5.3s ease-in-out infinite}
.a51ls-iris{animation:a51ls-iris ${CICLO}s ease-in-out infinite}
.a51ls-beam{animation:a51ls-beam ${CICLO}s linear infinite}
.a51ls-msg{position:absolute;left:0;right:0;opacity:0;animation:a51ls-msg ${CICLO * STATUS.length}s ease-out infinite backwards}
.a51ls-caret{display:inline-block;width:.55em;height:1em;margin-left:.25em;vertical-align:-.15em;background:#8cff59;animation:a51ls-caret 1s steps(1,end) infinite}
.a51ls-static{display:none}

@keyframes a51ls-spin{to{transform:rotate(360deg)}}
@keyframes a51ls-arc{
  0%,${pct(F_INICIO)}{stroke-dashoffset:${RING_C.toFixed(2)};opacity:1}
  ${pct(F_INICIO + F_BARRIDO)}{stroke-dashoffset:0;opacity:1}
  ${pct(F_APAGA)}{stroke-dashoffset:0;opacity:0}
  100%{stroke-dashoffset:${RING_C.toFixed(2)};opacity:0}}
@keyframes a51ls-orbit{
  0%,${pct(F_INICIO)}{transform:rotate(0deg);opacity:1}
  ${pct(F_INICIO + F_BARRIDO)}{transform:rotate(360deg);opacity:1}
  ${pct(F_FIJA)},100%{transform:rotate(360deg);opacity:0}}
@keyframes a51ls-lock{
  0%,${pct(F_INICIO + F_BARRIDO)}{transform:scale(1.07);opacity:.45}
  ${pct(F_FIJA)}{transform:scale(.97);opacity:1}
  ${pct(F_FIJA + 0.04)}{transform:scale(1);opacity:1}
  ${pct(F_APAGA)}{transform:scale(1.02);opacity:.7}
  100%{transform:scale(1.07);opacity:.45}}
@keyframes a51ls-beam{
  0%,${pct(F_INICIO * 0.5)}{transform:translateY(${Y_INICIO}px);opacity:0}
  ${pct(F_INICIO)}{transform:translateY(${Y_INICIO}px);opacity:1}
  ${pct(F_INICIO + F_BARRIDO)}{transform:translateY(${Y_FIN}px);opacity:1}
  ${pct(F_INICIO + F_BARRIDO + 0.04)},100%{transform:translateY(${Y_FIN}px);opacity:0}}
@keyframes a51ls-iris{
  0%,${pct(F_INICIO + F_BARRIDO)}{opacity:.55}
  ${pct(F_FIJA)}{opacity:1}
  ${pct(F_APAGA)},100%{opacity:.55}}
@keyframes a51ls-blink{0%,93%,100%{transform:scaleY(1)}95.5%{transform:scaleY(.08)}}
@keyframes a51ls-glitch{
  0%{transform:none}
  88%{transform:translate(2.5px,0) skewX(-5deg)}
  88.6%{transform:translate(-3px,0)}
  89.2%{transform:none}
  95%{transform:translate(1.5px,0)}
  95.4%{transform:none}}
@keyframes a51ls-ghost{
  0%{opacity:0;transform:none}
  88%{opacity:.7;transform:translate(-4px,1px)}
  88.6%{opacity:.5;transform:translate(4px,-1px)}
  89.2%{opacity:0;transform:none}
  95%{opacity:.45;transform:translate(3px,0)}
  95.4%{opacity:0;transform:none}}
@keyframes a51ls-msg{
  0%{opacity:0;transform:translateY(5px)}
  2.5%{opacity:1;transform:none}
  22%{opacity:1;transform:none}
  25%,100%{opacity:0;transform:translateY(-5px)}}
@keyframes a51ls-caret{0%{opacity:1}50%{opacity:0}}
@keyframes a51ls-soft{0%,100%{opacity:.55}50%{opacity:1}}

${keyframesSincronizados()}

${LANDMARKS.map(
  (_, i) =>
    `.a51ls-lm-${i}{animation:a51ls-lm-${i} ${CICLO}s linear infinite}.a51ls-ping-${i}{animation:a51ls-ping-${i} ${CICLO}s ease-out infinite}`,
).join("\n")}
${EDGES.map((_, i) => `.a51ls-edge-${i}{animation:a51ls-edge-${i} ${CICLO}s linear infinite}`).join("\n")}

@media (prefers-reduced-motion: reduce){
  .a51ls *,.a51ls *::before,.a51ls *::after{animation:none!important}
  .a51ls-beam,.a51ls-orbit,.a51ls-ghost,.a51ls-msg,.a51ls-caret,[class*="a51ls-ping-"]{display:none}
  [class*="a51ls-lm-"]{opacity:.9}
  [class*="a51ls-edge-"]{opacity:.3}
  .a51ls-arc{stroke-dashoffset:0;opacity:.35}
  .a51ls-brackets{opacity:.8}
  .a51ls .a51ls-iris,.a51ls .a51ls-halo{animation:a51ls-soft 2.6s ease-in-out infinite!important}
  .a51ls-static{display:inline}
}
`;

export default function LoadingScreen() {
  return (
    <div className="a51ls" role="status" aria-live="polite" aria-label="Cargando">
      <style>{CSS}</style>

      <svg
        className="a51ls-svg"
        viewBox="0 0 240 240"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <radialGradient id="a51ls-skin" cx="42%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#25301d" />
            <stop offset="55%" stopColor="#151b11" />
            <stop offset="100%" stopColor="#090c07" />
          </radialGradient>
          <linearGradient id="a51ls-eye" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#020302" />
            <stop offset="70%" stopColor="#061006" />
            <stop offset="100%" stopColor="#0e2a08" />
          </linearGradient>
          <radialGradient id="a51ls-iris" cx="50%" cy="70%" r="60%">
            <stop offset="0%" stopColor="#8cff59" stopOpacity="0.85" />
            <stop offset="55%" stopColor="#8cff59" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#8cff59" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="a51ls-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#8cff59" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#8cff59" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="a51ls-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#8cff59" stopOpacity="0" />
            <stop offset="20%" stopColor="#8cff59" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#eaffdc" stopOpacity="1" />
            <stop offset="80%" stopColor="#8cff59" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#8cff59" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="a51ls-trail" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8cff59" stopOpacity="0" />
            <stop offset="100%" stopColor="#8cff59" stopOpacity="0.28" />
          </linearGradient>
          <clipPath id="a51ls-clip">
            <path d={HEAD} />
          </clipPath>
        </defs>

        {/* Anillo: ticks que giran + arco de progreso sincronizado con el barrido */}
        <path className="a51ls-ticks a51ls-vb" d={TICKS} stroke="#8cff59" strokeOpacity="0.22" strokeWidth="1" />
        <circle cx="120" cy="120" r={RING_R} fill="none" stroke="#8cff59" strokeOpacity="0.1" strokeWidth="2" />
        <g transform="rotate(-90 120 120)">
          <circle
            className="a51ls-arc"
            cx="120"
            cy="120"
            r={RING_R}
            fill="none"
            stroke="#8cff59"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
        </g>
        <g className="a51ls-orbit a51ls-vb">
          <circle cx="120" cy={120 - RING_R} r="7" fill="url(#a51ls-halo)" />
          <circle cx="120" cy={120 - RING_R} r="2.6" fill="#eaffdc" />
        </g>

        {/* Halo detrás de la cabeza */}
        <ellipse className="a51ls-halo" cx="120" cy="112" rx="80" ry="86" fill="url(#a51ls-halo)" opacity="0.6" />

        {/* Corchetes tipo Face ID: se cierran cuando termina la pasada */}
        <path
          className="a51ls-brackets"
          d="M56 50 V34 H72 M168 34 H184 V50 M184 186 V202 H168 M72 202 H56 V186"
          fill="none"
          stroke="#8cff59"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Cabeza (con glitch) */}
        <path
          className="a51ls-ghost"
          d={HEAD}
          fill="none"
          stroke="#b6ff84"
          strokeWidth="1.2"
          opacity="0"
        />
        <g className="a51ls-head">
          <path d={HEAD} fill="url(#a51ls-skin)" stroke="#8cff59" strokeOpacity="0.55" strokeWidth="1.3" />
          {/* contorno interior sutil */}
          <path
            d="M120 46 C148 46 168 64 169 92"
            fill="none"
            stroke="#b6ff84"
            strokeOpacity="0.18"
            strokeWidth="1"
            strokeLinecap="round"
          />

          {/* Malla facial: cada segmento se une al pasar la línea */}
          <g stroke="#8cff59" strokeWidth="0.7" strokeLinecap="round">
            {EDGES.map(([a, b], i) => (
              <line
                key={i}
                className={`a51ls-edge-${i}`}
                x1={LANDMARKS[a][0]}
                y1={LANDMARKS[a][1]}
                x2={LANDMARKS[b][0]}
                y2={LANDMARKS[b][1]}
                opacity="0.05"
              />
            ))}
          </g>

          {/* Ojos almendrados */}
          <g className="a51ls-eyes">
            {[EYE_L, EYE_R].map((d) => (
              <g key={d}>
                <path d={d} fill="url(#a51ls-eye)" stroke="#8cff59" strokeOpacity="0.85" strokeWidth="1.3" />
                <path className="a51ls-iris" d={d} fill="url(#a51ls-iris)" opacity="0.55" />
              </g>
            ))}
            <ellipse cx="85" cy="106" rx="5" ry="2.6" fill="#eaffdc" fillOpacity="0.85" transform="rotate(32 85 106)" />
            <circle cx="98" cy="116" r="1.3" fill="#eaffdc" fillOpacity="0.7" />
            <ellipse cx="155" cy="106" rx="5" ry="2.6" fill="#eaffdc" fillOpacity="0.85" transform="rotate(-32 155 106)" />
            <circle cx="142" cy="116" r="1.3" fill="#eaffdc" fillOpacity="0.7" />
          </g>

          {/* Nariz y boca mínimas */}
          <path d="M116.5 149 v3 M123.5 149 v3" stroke="#8cff59" strokeOpacity="0.5" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M111 168 Q120 171 129 168" fill="none" stroke="#8cff59" strokeOpacity="0.5" strokeWidth="1.2" strokeLinecap="round" />
        </g>

        {/* Puntos de referencia */}
        <g>
          {LANDMARKS.map(([x, y], i) => (
            <g key={i}>
              <circle className={`a51ls-ping-${i}`} cx={x} cy={y} r="3" fill="none" stroke="#8cff59" strokeWidth="0.8" opacity="0" />
              <circle className={`a51ls-lm-${i}`} cx={x} cy={y} r="1.9" fill="#d9ffc4" opacity="0.14" />
            </g>
          ))}
        </g>

        {/* Línea de escaneo: la estela se recorta a la cabeza, la línea la desborda */}
        <g clipPath="url(#a51ls-clip)">
          <g className="a51ls-beam a51ls-vb">
            <rect x="56" y="-30" width="128" height="30" fill="url(#a51ls-trail)" />
          </g>
        </g>
        <g className="a51ls-beam a51ls-vb">
          <rect x="44" y="-1.5" width="152" height="3" fill="url(#a51ls-line)" opacity="0.35" />
          <rect x="44" y="-0.6" width="152" height="1.2" fill="url(#a51ls-line)" />
        </g>
      </svg>

      <div
        aria-hidden="true"
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          fontFamily: 'var(--font-geist-mono), "Courier New", monospace',
          textTransform: "uppercase",
        }}
      >
        <div style={{ position: "relative", height: 18, width: 280, textAlign: "center", fontSize: 12, letterSpacing: "0.28em", color: "#b6ff84" }}>
          {STATUS.map((txt, i) => (
            <span key={txt} className="a51ls-msg" style={{ animationDelay: `${i * CICLO}s` }}>
              {txt}
              <span className="a51ls-caret" />
            </span>
          ))}
          <span className="a51ls-static">Cargando…</span>
        </div>
        <span style={{ fontSize: 9, letterSpacing: "0.55em", paddingLeft: "0.55em", color: "rgba(140,255,89,0.45)" }}>
          A51 · Barber
        </span>
      </div>
    </div>
  );
}
