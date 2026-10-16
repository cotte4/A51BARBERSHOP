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
        className="vinilo absolute inset-0 rounded-full shadow-[0_18px_40px_rgba(0,0,0,0.55),inset_0_0_0_2px_rgba(255,255,255,0.06)]"
        style={{
          background:
            "repeating-radial-gradient(circle at 50% 50%, #0b0b0c 0px, #0b0b0c 2px, #222226 3px, #0b0b0c 4px)",
          ...estiloGiro,
        }}
      >
        <div className="absolute inset-[31%] overflow-hidden rounded-full border-2 border-black/60 bg-[#8cff59]">
          {etiqueta ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={etiqueta} alt="" className="h-full w-full scale-[1.35] object-cover" />
          ) : (
            <span className="font-display flex h-full w-full items-center justify-center text-[0.9em] font-bold text-[#07130a]">
              A51
            </span>
          )}
        </div>
        {/* Una marca en la etiqueta: sin ella no se nota que gira si la tapa es pareja. */}
        <span className="absolute left-1/2 top-[33%] h-[5%] w-[1.5%] -translate-x-1/2 rounded-full bg-white/70" aria-hidden="true" />
        <span className="absolute inset-[48.5%] rounded-full bg-zinc-950" aria-hidden="true" />
      </div>

      {/* El brillo no gira: la luz queda quieta y el disco pasa por debajo, como uno de verdad. */}
      <div
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{
          background:
            "conic-gradient(from 30deg, transparent 0deg, rgba(255,255,255,0.13) 25deg, transparent 60deg, transparent 180deg, rgba(255,255,255,0.09) 205deg, transparent 240deg)",
        }}
        aria-hidden="true"
      />

      <svg
        viewBox="0 0 100 100"
        className="pointer-events-none absolute inset-0 overflow-visible"
        style={{ width: tamano, height: tamano }}
        aria-hidden="true"
      >
        <g
          className="brazo"
          style={{
            transformBox: "view-box",
            transformOrigin: "96px 4px",
            transform: brazoAbajo ? "rotate(0deg)" : "rotate(-26deg)",
            transition: "transform 700ms cubic-bezier(0.77, 0, 0.175, 1)",
          }}
        >
          <path d="M96 4 L90 34 L79 61" fill="none" stroke="#d4d4d8" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="74.5" y="59" width="8" height="5" rx="1.2" transform="rotate(24 78.5 61.5)" fill="#8cff59" />
        </g>
        <circle cx="96" cy="4" r="5.5" fill="#27272a" stroke="#52525b" strokeWidth="1.5" />
        <circle cx="96" cy="4" r="2" fill="#8cff59" />
      </svg>
    </div>
  );
}
