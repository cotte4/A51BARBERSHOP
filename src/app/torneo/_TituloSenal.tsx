import { Fragment, type CSSProperties } from "react";

/**
 * Título que entra letra por letra (CSS puro: corre fuera del hilo principal y no depende de
 * que cargue JS) y cada tanto tiene un glitch corto. Se renderiza en el servidor ya partido,
 * así no hay salto de layout. Los lectores de pantalla leen el texto entero, no las letras.
 */
export default function TituloSenal({
  texto,
  className = "",
  retraso = 0,
}: {
  texto: string;
  className?: string;
  /** Milisegundos antes de la primera letra. */
  retraso?: number;
}) {
  const palabras = texto.split(" ");
  // Índice global de cada letra (para el escalonado), calculado antes de pintar.
  const inicios = palabras.map((_, p) =>
    palabras.slice(0, p).reduce((suma, w) => suma + Array.from(w).length, 0),
  );

  return (
    <h1 className={`torneo-titulo torneo-senal ${className}`}>
      <span className="sr-only">{texto}</span>
      <span
        aria-hidden="true"
        className="torneo-senal-cuerpo"
        data-texto={texto}
        style={{ "--retraso": `${retraso}ms` } as CSSProperties}
      >
        {palabras.map((palabra, p) => (
          <Fragment key={p}>
            {p > 0 ? " " : null}
            <span className="torneo-senal-palabra">
              {Array.from(palabra).map((letra, l) => (
                <span
                  key={l}
                  className="torneo-senal-letra"
                  style={{ "--i": inicios[p] + l } as CSSProperties}
                >
                  {letra}
                </span>
              ))}
            </span>
          </Fragment>
        ))}
      </span>
    </h1>
  );
}
