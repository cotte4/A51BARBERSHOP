"use client";

import type { CSSProperties } from "react";
import type { DatosPantalla } from "@/lib/torneo-juego";
import EscenaOvni from "../_EscenaOvni";
import { cuerpoPorLargo } from "./_comun";

/** Un custom property por style (React no los tipa). */
function v(nombre: string, valor: string | number): CSSProperties {
  return { [nombre]: valor } as CSSProperties;
}

/**
 * Los lugares del torneo como una fila de casilleros: los confirmados se encienden en verde
 * (al llegar uno nuevo por el polling, su casillero entra con un fogonazo) y un barrido de luz
 * pasa cada tanto. Los libres quedan apagados.
 */
function Cupo({ pagados, cupo }: { pagados: number; cupo: number }) {
  const lugares = Math.min(cupo, 32);
  return (
    <div className="torneo-up mt-12" style={v("--i", 2)}>
      <p className="torneo-hud text-[30px] text-white/85">
        <span className="text-[#8cff59]">{pagados}</span> de {cupo} lugares confirmados
      </p>
      <div className="tele-cupo mt-5" style={v("--columnas", Math.min(lugares, 16))}>
        {Array.from({ length: lugares }, (_, i) => (
          <span
            key={i}
            className={`tele-slot ${i < pagados ? "tele-slot--lleno" : ""} ${i === pagados - 1 ? "tele-slot--ultimo" : ""}`}
            style={v("--i", i)}
          />
        ))}
        <span className="tele-cupo-barrido" aria-hidden="true" />
      </div>
    </div>
  );
}

/**
 * La tele antes del sorteo: la nave abduce la pelota (la misma escena de la landing, a tamaño
 * fijo) y al lado el torneo, los lugares que se van llenando y un "esperando" que late. El QR
 * del jukebox va arriba a la derecha (lo pone _Pantalla): la columna de texto arranca debajo.
 */
export default function Espera({ previa }: { previa: DatosPantalla["previa"] }) {
  const titulo = previa ? previa.nombre : "El torneo abre pronto";
  return (
    <div className="flex h-full items-center gap-16 pl-16 pr-24">
      <div className="shrink-0">
        <EscenaOvni tele />
      </div>
      {/* pt: deja libre la esquina del QR grande (top 32 + ~240 de alto). */}
      <div className="flex min-w-0 flex-1 flex-col justify-center self-stretch pb-16 pt-[300px]">
        <p className="torneo-hud torneo-up text-[26px] text-[#8cff59]" style={v("--i", 0)}>
          A51 · Señal interceptada
        </p>
        <h1
          className="torneo-titulo torneo-up mt-5 font-extrabold italic text-white [text-wrap:balance]"
          style={{ ...v("--i", 1), fontSize: cuerpoPorLargo(titulo.length, [[12, 150], [18, 128], [26, 108]], 92) }}
        >
          {titulo}
        </h1>
        {previa && previa.cupo > 0 && <Cupo pagados={Math.min(previa.pagados, previa.cupo)} cupo={previa.cupo} />}
        <div className="torneo-up mt-14" style={v("--i", 3)}>
          <p className="torneo-hud flex items-baseline text-[28px] text-[#8cff59]">
            Esperando el sorteo
            <span className="tele-puntos" aria-hidden="true">
              <i>.</i>
              <i>.</i>
              <i>.</i>
            </span>
          </p>
          <div className="tele-escaneo mt-4" aria-hidden="true">
            <i />
          </div>
        </div>
      </div>
    </div>
  );
}
