"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * Botón "Anotarme" fijo abajo en el celular. Aparece solo cuando ya pasaste el CTA del hero
 * y ninguna otra zona con CTA (`[data-cta-torneo]`: tarjeta del torneo, footer) está a la vista,
 * así nunca hay dos botones iguales en pantalla.
 */
export default function TorneoCtaFlotante() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const zonas = Array.from(document.querySelectorAll<HTMLElement>("[data-cta-torneo]"));
    if (zonas.length === 0) return;
    const enVista = new Map<Element, boolean>();
    let pasoElPrimero = false;

    const obs = new IntersectionObserver((entradas) => {
      for (const e of entradas) {
        enVista.set(e.target, e.isIntersecting);
        if (e.target === zonas[0]) pasoElPrimero = !e.isIntersecting && e.boundingClientRect.bottom < 0;
      }
      const alguna = Array.from(enVista.values()).some(Boolean);
      setVisible(pasoElPrimero && !alguna);
    });
    zonas.forEach((z) => obs.observe(z));
    return () => obs.disconnect();
  }, []);

  return (
    <div
      inert={!visible}
      aria-hidden={!visible}
      className={`fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-6 transition-[opacity,transform] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] sm:hidden ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-full opacity-0"
      }`}
      style={{ background: "linear-gradient(180deg, transparent, rgba(10,12,10,0.92) 45%)" }}
    >
      <Link
        href="/torneo"
        tabIndex={visible ? undefined : -1}
        className="cta-torneo neon-button flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl px-6 text-base font-semibold"
      >
        Anotarme al torneo
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </Link>
    </div>
  );
}
