// Text effect, adaptado de Motion Primitives (https://motion-primitives.com, licencia MIT).
// Acá sin librería: cada palabra es un span con su animation-delay (CSS en globals.css).

import type { CSSProperties } from "react";

/**
 * El texto aparece palabra por palabra (fundido, desenfoque y una subida corta). Para titulares que
 * se arman una vez, no para textos de todos los días. Los lectores de pantalla leen el texto
 * entero; con movimiento reducido aparece de una.
 */
export default function TextEffect({
  texto,
  className = "",
  retrasoMs = 0,
  pasoMs = 90,
}: {
  texto: string;
  className?: string;
  retrasoMs?: number;
  pasoMs?: number;
}) {
  const palabras = texto.split(/\s+/).filter(Boolean);
  return (
    <span className={className}>
      <span className="sr-only">{texto}</span>
      {palabras.map((palabra, i) => (
        <span key={i} aria-hidden="true">
          <span
            className="a51-palabra"
            style={{ animationDelay: `${retrasoMs + i * pasoMs}ms` } as CSSProperties}
          >
            {palabra}
          </span>
          {i < palabras.length - 1 ? " " : null}
        </span>
      ))}
    </span>
  );
}
