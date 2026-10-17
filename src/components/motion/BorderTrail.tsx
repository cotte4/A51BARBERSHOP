// Border trail, adaptado de Motion Primitives (https://motion-primitives.com, licencia MIT).
// Acá sin librería: una luz cónica gira detrás de la tarjeta y asoma solo por el borde.

/**
 * Una luz que recorre el borde mientras el sistema trabaja. Va como primer hijo de un contenedor
 * `relative` cuyo borde es su padding (ej. `.torneo-ficha-borde`); el contenido tiene que ir encima
 * (`relative z-[1]`). Se saca apenas termina. Con movimiento reducido queda un borde fijo.
 */
export default function BorderTrail({ activo }: { activo: boolean }) {
  if (!activo) return null;
  return <span aria-hidden="true" className="a51-border-trail" />;
}
