"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

const MOVIMIENTO_REDUCIDO = "(prefers-reduced-motion: reduce)";

/**
 * Número que sube contando: de 0 al entrar, y del valor anterior al nuevo cuando cambia
 * (por ejemplo, alguien pagó y el AutoRefresco trajo el dato). El servidor ya pinta el valor
 * final, así que sin JS o con movimiento reducido se ve el número quieto.
 */
export default function Contador({
  valor,
  retraso = 0,
  className,
}: {
  valor: number;
  /** Segundos antes de arrancar la primera cuenta (para que coincida con la entrada escalonada). */
  retraso?: number;
  className?: string;
}) {
  const [mostrado, setMostrado] = useState(valor);
  const anterior = useRef<number | null>(null);

  useGSAP(
    () => {
      const primera = anterior.current === null;
      const desde = anterior.current ?? 0;
      anterior.current = valor;
      if (desde === valor || window.matchMedia(MOVIMIENTO_REDUCIDO).matches) {
        setMostrado(valor);
        return;
      }
      const cuenta = { n: desde };
      setMostrado(desde);
      gsap.to(cuenta, {
        n: valor,
        duration: primera ? 1.1 : 0.55,
        delay: primera ? retraso : 0,
        ease: "power3.out",
        onUpdate: () => setMostrado(Math.round(cuenta.n)),
      });
    },
    { dependencies: [valor] },
  );

  return (
    <span className={className}>
      <span aria-hidden="true">{mostrado}</span>
      <span className="sr-only">{valor}</span>
    </span>
  );
}
