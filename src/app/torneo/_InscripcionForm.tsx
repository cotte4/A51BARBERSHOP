"use client";

import { useActionState } from "react";
import { inscribirseAction, type InscripcionState } from "./actions";
import Proximamente from "./_Proximamente";

const ESTADO_INICIAL: InscripcionState = { ok: false, mensaje: null };

export default function InscripcionForm({ listaEspera = false }: { listaEspera?: boolean }) {
  const [state, formAction, pending] = useActionState(inscribirseAction, ESTADO_INICIAL);

  if (state.ok) {
    return (
      <div className="flex flex-col gap-8">
        <div className="torneo-flip-in" role="status">
          <div className="torneo-ficha-borde">
            <div className="torneo-ficha">
              <p className="torneo-hud text-[0.65rem] text-[#8cff59]">Ficha confirmada</p>
              <h2 className="torneo-titulo mt-2 text-5xl font-extrabold text-white">
                <span className="torneo-glitch inline-block italic">Jugador registrado</span>
              </h2>
              <p className="mt-4 text-base text-[#cfd8cc]">
                {state.puestoEspera
                  ? `Los 16 lugares ya están ocupados: quedaste en lista de espera, puesto ${state.puestoEspera}. Si se libera un lugar, te avisamos.`
                  : "Tu lugar se confirma cuando pagues la cuota en el local."}
              </p>
              <a
                href="/jukebox"
                className="torneo-hud mt-6 inline-block border border-[#8cff59]/50 px-4 py-3 text-xs text-[#8cff59] transition hover:bg-[#8cff59]/10"
              >
                Proponé una canción
              </a>
            </div>
          </div>
        </div>
        <Proximamente />
      </div>
    );
  }

  return (
    <section aria-labelledby="ficha-titulo" className="torneo-ficha-borde">
      <div className="torneo-ficha">
        <p className="torneo-hud text-[0.65rem] text-[#8cff59]">Ficha de jugador</p>
        <h2
          id="ficha-titulo"
          className="torneo-titulo mt-2 text-4xl font-extrabold italic text-white"
        >
          Anotate
        </h2>
        <p className="mt-2 text-base text-[#cfd8cc]">
          {listaEspera
            ? "Los 16 lugares ya están ocupados. Podés anotarte en la lista de espera: si alguien se baja, te avisamos."
            : "Pagás la cuota en el local y ahí se confirma tu lugar."}
        </p>

        <form action={formAction} className="mt-6 flex flex-col gap-5">
          <div>
            <label htmlFor="t-nombre" className="torneo-label torneo-hud">
              Nombre
            </label>
            <input
              id="t-nombre"
              name="nombre"
              type="text"
              autoComplete="name"
              required
              className="torneo-input"
            />
          </div>
          <div>
            <label htmlFor="t-email" className="torneo-label torneo-hud">
              Email
            </label>
            <input
              id="t-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="torneo-input"
            />
          </div>
          <div>
            <label htmlFor="t-whatsapp" className="torneo-label torneo-hud">
              WhatsApp
            </label>
            <input
              id="t-whatsapp"
              name="whatsapp"
              type="tel"
              autoComplete="tel"
              required
              placeholder="223 555 1234"
              className="torneo-input"
            />
          </div>

          <label className="flex items-start gap-3 text-sm text-[#cfd8cc]">
            <input
              name="consentimiento"
              type="checkbox"
              required
              className="mt-0.5 h-5 w-5 shrink-0 accent-[#8cff59]"
            />
            <span>Acepto que A51 me contacte por el torneo y novedades.</span>
          </label>

          {/* Campo trampa: invisible para las personas, los bots lo completan. */}
          <div
            aria-hidden="true"
            className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden"
          >
            <label>
              Sitio web
              <input name="website" type="text" tabIndex={-1} autoComplete="off" />
            </label>
          </div>

          {state.mensaje && (
            <p role="alert" className="torneo-error">
              {state.mensaje}
            </p>
          )}

          <button type="submit" disabled={pending} className="torneo-boton">
            {pending ? "Registrando…" : listaEspera ? "Anotarme en la lista de espera" : "Entrar a la cancha"}
          </button>
        </form>
      </div>
    </section>
  );
}
