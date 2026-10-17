import type { CSSProperties } from "react";

/**
 * Un vinilo con su brazo, todo CSS + SVG (sin imágenes propias). La tapa del video hace de etiqueta.
 * Las clases `.vinilo` y `.brazo` quedan a mano para que GSAP las anime desde afuera.
 */
export default function Disco({
  tamano,
  etiqueta,
  girando = false,
  brazoAbajo = false,
  className = "",
}: {
  tamano: number;
  /** URL de la tapa; sin tapa la etiqueta es verde con "A51". */
  etiqueta: string | null;
  /** Gira con CSS (vuelta constante: lineal). Para animarlo con GSAP, dejalo en false. */
  girando?: boolean;
  /** Con la aguja sobre el disco. Cambia con transición: el brazo "baja" cuando arranca un tema. */
  brazoAbajo?: boolean;
  className?: string;
}) {
  const estiloGiro: CSSProperties | undefined = girando ? { animation: "a51-spin 2.4s linear infinite" } : undefined;

  return (
    <div className={`relative shrink-0 ${className}`} style={{ width: tamano, height: tamano }}>
      {/* Lo que gira: surcos + etiqueta. */}
      <div
        className="vinilo absolute inset-0 rounded-full shadow-[0_18px_40px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.05)]"
        style={{
          background: [
            // Borde de entrada (más liso) y zona muerta antes de la etiqueta, como un disco real.
            "radial-gradient(circle, transparent 30%, #050506 30.5%, #050506 33%, transparent 33.5%, transparent 95%, #111113 95.5%, #050506 100%)",
            "repeating-radial-gradient(circle at 50% 50%, #0b0b0c 0px, #0b0b0c 1.6px, #1d1d21 2.4px, #0b0b0c 3.2px)",
          ].join(","),
          ...estiloGiro,
        }}
      >
        {/* Una muesca en el borde: sin ella no se nota que gira si la tapa es pareja. */}
        <span
          className="absolute left-1/2 top-[1.5%] h-[3.5%] w-[1.2%] -translate-x-1/2 rounded-full bg-[#8cff59] shadow-[0_0_6px_#8cff59]"
          aria-hidden="true"
        />
        <div className="absolute inset-[31%] overflow-hidden rounded-full bg-[#8cff59] shadow-[inset_0_0_0_2px_rgba(0,0,0,0.55),inset_0_0_10px_rgba(0,0,0,0.35)]">
          {etiqueta ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={etiqueta} alt="" className="h-full w-full scale-[1.35] object-cover" />
          ) : (
            // El texto va arriba y abajo del agujero, nunca encima.
            <>
              <span
                className="font-display absolute inset-x-0 top-[17%] text-center font-bold leading-none text-[#07130a]"
                style={{ fontSize: tamano * 0.075 }}
              >
                A51
              </span>
              <span
                className="absolute inset-x-0 bottom-[19%] text-center font-mono font-bold leading-none tracking-[0.12em] text-[#07130a]/70"
                style={{ fontSize: Math.max(6, tamano * 0.034) }}
              >
                LADO A
              </span>
            </>
          )}
          <span className="absolute inset-[6%] rounded-full border border-black/15" aria-hidden="true" />
        </div>
        {/* Eje metálico. */}
        <span
          className="absolute inset-[47.5%] rounded-full shadow-[0_0_0_1px_rgba(0,0,0,0.6)]"
          style={{ background: "radial-gradient(circle at 35% 35%, #f4f4f5, #71717a 55%, #27272a)" }}
          aria-hidden="true"
        />
      </div>

      {/* El brillo no gira: la luz queda quieta y el disco pasa por debajo, como uno de verdad. */}
      <div
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          background: [
            "conic-gradient(from 30deg, transparent 0deg, rgba(255,255,255,0.14) 22deg, transparent 55deg, transparent 180deg, rgba(255,255,255,0.1) 202deg, transparent 235deg)",
            // Un tornasol tenue verde/rosa, el de los surcos cuando les pega la luz.
            "conic-gradient(from 120deg, transparent 0deg, rgba(140,255,89,0.07) 30deg, transparent 70deg, transparent 200deg, rgba(255,79,216,0.06) 230deg, transparent 270deg)",
          ].join(","),
          maskImage: "radial-gradient(circle, transparent 31%, #000 34%)",
          WebkitMaskImage: "radial-gradient(circle, transparent 31%, #000 34%)",
        }}
        aria-hidden="true"
      />

      <svg
        viewBox="0 0 100 100"
        className="pointer-events-none absolute inset-0 overflow-visible"
        style={{ width: tamano, height: tamano }}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="disco-tubo" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#a1a1aa" />
            <stop offset="0.45" stopColor="#f4f4f5" />
            <stop offset="1" stopColor="#71717a" />
          </linearGradient>
          <radialGradient id="disco-base" cx="0.35" cy="0.35" r="0.8">
            <stop offset="0" stopColor="#3f3f46" />
            <stop offset="1" stopColor="#09090b" />
          </radialGradient>
        </defs>
        {/* Base del brazo */}
        <circle cx="96" cy="4" r="9" fill="url(#disco-base)" stroke="#3f3f46" strokeWidth="0.8" />
        <g
          className="brazo"
          style={{
            transformBox: "view-box",
            transformOrigin: "96px 4px",
            transform: brazoAbajo ? "rotate(0deg)" : "rotate(-26deg)",
            transition: "transform 700ms cubic-bezier(0.77, 0, 0.175, 1)",
          }}
        >
          {/* Contrapeso, del otro lado del eje */}
          <rect x="94.2" y="-9" width="4" height="7" rx="1.2" transform="rotate(11 96 4)" fill="#3f3f46" stroke="#71717a" strokeWidth="0.5" />
          <path d="M96 4 L90 34 L79 61" fill="none" stroke="#18181b" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M96 4 L90 34 L79 61" fill="none" stroke="url(#disco-tubo)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          {/* Cápsula con la púa */}
          <g transform="rotate(24 78.5 61.5)">
            <rect x="74" y="58.6" width="9" height="6" rx="1.3" fill="#18181b" stroke="#8cff59" strokeWidth="0.7" />
            <rect x="75.4" y="60" width="6.2" height="2.2" rx="0.6" fill="#8cff59" />
          </g>
        </g>
        <circle cx="96" cy="4" r="3.6" fill="#27272a" stroke="#71717a" strokeWidth="0.9" />
        <circle cx="96" cy="4" r="1.6" fill="#8cff59" />
      </svg>
    </div>
  );
}
