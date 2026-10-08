import { useSyncExternalStore } from "react";

// Piezas de movimiento compartidas por la landing y la tele: una sola regla de "reducir
// movimiento" y un solo tope de cuadros para todos los lienzos (three.js, WebGL y 2D).

const MOVIMIENTO_REDUCIDO = "(prefers-reduced-motion: reduce)";

function suscribir(avisar: () => void) {
  const mq = window.matchMedia(MOVIMIENTO_REDUCIDO);
  mq.addEventListener("change", avisar);
  return () => mq.removeEventListener("change", avisar);
}
const leer = () => window.matchMedia(MOVIMIENTO_REDUCIDO).matches;
// En el servidor se asume movimiento: el cliente corrige al hidratar si hace falta.
const leerEnServidor = () => false;

/** true si el sistema pide reducir movimiento. Se actualiza en vivo si cambia la preferencia. */
export function usarMovimientoReducido(): boolean {
  return useSyncExternalStore(suscribir, leer, leerEnServidor);
}

const CUADRO_60 = 1000 / 60;

/**
 * Tope de 60 cuadros por segundo para un bucle de requestAnimationFrame. En 60 Hz dibuja todos;
 * en 120/144 Hz saltea los que sobran sin derivar (guarda el resto del intervalo, así promedia
 * 60 y no cae a 48). Devuelve true cuando toca dibujar.
 */
export function crearLimitador60(): (ahora: number) => boolean {
  let ultimo = -Infinity;
  return (ahora: number) => {
    const delta = ahora - ultimo;
    // 1 ms de tolerancia: los rAF de 60 Hz llegan con algo de jitter alrededor de 16,67 ms.
    if (delta < CUADRO_60 - 1) return false;
    // Lo que sobró del intervalo se arrastra al próximo; tras una pausa larga se arranca de cero.
    const resto = delta >= CUADRO_60 && delta < CUADRO_60 * 4 ? delta % CUADRO_60 : 0;
    ultimo = ahora - resto;
    return true;
  };
}
