"use client";

import { useState } from "react";
import Image from "next/image";
import { escudoDeEquipo, inicialesEquipo } from "@/lib/torneo-escudos";

// Mismo margen que un escudo redondo normalizado (~11 %): el genérico ocupa el mismo lugar que uno real.
const MARGEN = 0.11;

/** Escudo para un equipo sin PNG (torneos viejos o el ensayo): iniciales en un escudo neón. */
function EscudoGenerico({ equipo, tamano }: { equipo: string; tamano: number }) {
  const iniciales = inicialesEquipo(equipo);
  return (
    <svg
      viewBox="0 0 100 100"
      width={tamano}
      height={tamano}
      aria-hidden="true"
      className="shrink-0"
      style={{ padding: tamano * MARGEN }}
    >
      <path
        d="M50 4 L92 18 L88 62 Q82 84 50 96 Q18 84 12 62 L8 18 Z"
        fill="rgba(140,255,89,0.12)"
        stroke="#8cff59"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      <text
        x="50"
        y="56"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#8cff59"
        fontSize={iniciales.length > 2 ? 26 : 32}
        fontWeight="800"
        // var() no anda como atributo de presentación SVG: va por style.
        style={{ fontFamily: "var(--font-hud), monospace" }}
      >
        {iniciales}
      </text>
    </svg>
  );
}

/**
 * Escudo cuadrado de tamaño fijo. Decorativo: el nombre del equipo ya se lee al lado.
 * Sin PNG para ese nombre, o si el archivo falla, cae al genérico del mismo tamaño
 * para que las filas nunca se desalineen.
 */
export default function Escudo({
  equipo,
  tamano,
  className = "",
  cargaInmediata = false,
}: {
  equipo: string | null;
  tamano: number;
  className?: string;
  /** Carga el PNG ya, aunque esté fuera de cuadro (la ruleta de la tele no puede frenar en un hueco). */
  cargaInmediata?: boolean;
}) {
  const [fallo, setFallo] = useState(false);
  if (!equipo) return null;
  const src = fallo ? null : escudoDeEquipo(equipo);

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ width: tamano, height: tamano }}
      aria-hidden="true"
    >
      {src ? (
        <Image
          src={src}
          alt=""
          width={tamano}
          height={tamano}
          loading={cargaInmediata ? "eager" : undefined}
          onError={() => setFallo(true)}
          // Un borde claro casi invisible: los escudos oscuros (Tottenham, Inter) no se pierden en el negro.
          className="h-full w-full object-contain [filter:drop-shadow(0_0_1.5px_rgba(255,255,255,0.55))]"
          draggable={false}
        />
      ) : (
        <EscudoGenerico equipo={equipo} tamano={tamano} />
      )}
    </span>
  );
}
