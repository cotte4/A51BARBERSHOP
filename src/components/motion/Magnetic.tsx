"use client";

// Magnetic, adaptado de Motion Primitives (https://motion-primitives.com, licencia MIT).
// Acá con GSAP (quickTo) en vez de la librería motion.

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";

/**
 * El elemento se corre un poco hacia el mouse (máx. `maxPx`) y vuelve al soltar. Solo con mouse:
 * en el celular y con movimiento reducido queda quieto. Para el único botón principal de una
 * pantalla de bienvenida; nunca en botones que confirman plata.
 */
export default function Magnetic({
  children,
  maxPx = 8,
  className = "",
}: {
  children: ReactNode;
  maxPx?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const conMouse = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const quieto = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!conMouse || quieto) return;

    const x = gsap.quickTo(el, "x", { duration: 0.5, ease: "elastic.out(1, 0.5)" });
    const y = gsap.quickTo(el, "y", { duration: 0.5, ease: "elastic.out(1, 0.5)" });
    const mover = (ev: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const dx = (ev.clientX - (r.left + r.width / 2)) / (r.width / 2 || 1);
      const dy = (ev.clientY - (r.top + r.height / 2)) / (r.height / 2 || 1);
      x(Math.max(-1, Math.min(1, dx)) * maxPx);
      y(Math.max(-1, Math.min(1, dy)) * maxPx);
    };
    const soltar = () => {
      x(0);
      y(0);
    };
    el.addEventListener("pointermove", mover);
    el.addEventListener("pointerleave", soltar);
    return () => {
      el.removeEventListener("pointermove", mover);
      el.removeEventListener("pointerleave", soltar);
      gsap.killTweensOf(el);
    };
  }, [maxPx]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
