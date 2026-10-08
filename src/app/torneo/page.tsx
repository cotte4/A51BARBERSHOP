import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";
import { MAX_ANOTADOS, getResumenPublico, getTorneoVigente } from "@/lib/torneo-data";
import EscenaOvni from "./_EscenaOvni";
import InscripcionForm from "./_InscripcionForm";
import Proximamente from "./_Proximamente";
import TituloSenal from "./_TituloSenal";

export const dynamic = "force-dynamic";

const ZONA = "America/Argentina/Buenos_Aires";

function formatARS(valor: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(valor);
}

function formatFecha(fecha: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: ZONA,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(fecha);
}

function orden(i: number): CSSProperties {
  return { "--i": i } as CSSProperties;
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 pb-12 sm:px-8">
      <header className="flex items-center justify-between py-5">
        <Image
          src="/a51barbershop.jpeg"
          alt="A51"
          width={44}
          height={44}
          className="h-10 w-10 object-contain invert mix-blend-screen"
          priority
        />
        <span className="torneo-hud text-[0.6rem] text-[#8cff59]">PS4 · EA SPORTS FC</span>
      </header>
      <main className="flex flex-1 flex-col gap-8">{children}</main>
    </div>
  );
}

export default async function TorneoPage() {
  const torneo = await getTorneoVigente();

  return (
    <Shell>
      {!torneo ? (
        <section className="torneo-hero flex flex-col items-center text-center">
          <EscenaOvni />
          <p className="torneo-senal-hud torneo-hud sm:mt-2">
            <i aria-hidden="true" />
            A51 · Señal interceptada
          </p>
          <TituloSenal
            texto="El torneo abre pronto"
            retraso={350}
            className="mt-3 text-[3.4rem] font-extrabold text-white sm:text-8xl"
          />
          <p className="torneo-hud mt-5 text-[0.62rem] text-[#cfd8cc] sm:text-[0.7rem]">
            16 jugadores · $4.200 en el local
          </p>
          <div className="mt-8 w-full sm:mt-10">
            <Proximamente />
          </div>
        </section>
      ) : (
        <TorneoContenido torneo={torneo} />
      )}
    </Shell>
  );
}

async function TorneoContenido({
  torneo,
}: {
  torneo: NonNullable<Awaited<ReturnType<typeof getTorneoVigente>>>;
}) {
  const resumen = await getResumenPublico(torneo.id, torneo.cupo);
  const cuota = Number(torneo.cuotaArs);
  const pct =
    resumen.cupo > 0 ? Math.min(100, Math.round((resumen.pagados / resumen.cupo) * 100)) : 0;

  return (
    <>
      <section className="torneo-hero">
        <div className="relative z-10 flex flex-col items-center text-center">
          <EscenaOvni compacta />
          <p className="torneo-hud torneo-up -mt-2 text-[0.7rem] text-[#8cff59]" style={orden(0)}>
            A51 · Señal interceptada
          </p>
          <h1
            className="torneo-titulo torneo-up mt-3 text-[3.1rem] font-extrabold text-white sm:text-8xl"
            style={orden(1)}
          >
            <span className="torneo-glitch inline-block italic">{torneo.nombre}</span>
          </h1>
          <p className="torneo-hud torneo-up mt-4 text-[0.7rem] text-[#cfd8cc]" style={orden(2)}>
            Torneo presencial · PS4
          </p>
        </div>

        <div className="torneo-up relative z-10 mt-8" style={orden(3)}>
          <div className="torneo-bug">
            <div>
              <p className="torneo-bug-label torneo-hud">Fecha</p>
              <p className="torneo-bug-valor torneo-titulo">
                {torneo.fecha ? formatFecha(torneo.fecha) : "A confirmar"}
              </p>
            </div>
            <div>
              <p className="torneo-bug-label torneo-hud">Cuota</p>
              <p className="torneo-bug-valor torneo-titulo">{formatARS(cuota)}</p>
            </div>
            <div>
              <p className="torneo-bug-label torneo-hud">Lugares</p>
              <p className="torneo-bug-valor torneo-titulo">
                {resumen.pagados}/{resumen.cupo}
              </p>
              {resumen.enEspera > 0 && (
                <p className="torneo-hud mt-1 text-[0.6rem] text-[#cfd8cc]">
                  {resumen.enEspera} en lista de espera
                </p>
              )}
              <div
                className="torneo-progress"
                role="progressbar"
                aria-label="Lugares confirmados"
                aria-valuemin={0}
                aria-valuemax={resumen.cupo}
                aria-valuenow={resumen.pagados}
              >
                <span style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>
          {torneo.premiosTexto && (
            <div className="torneo-premios">
              <p className="torneo-hud shrink-0 text-[0.65rem] text-[#8cff59]">Premios</p>
              <p className="torneo-titulo whitespace-pre-line text-xl font-bold leading-tight text-white">
                {torneo.premiosTexto}
              </p>
            </div>
          )}
        </div>
      </section>

      <div className="torneo-up mx-auto w-full max-w-xl" style={orden(4)}>
        {torneo.estado !== "inscripcion" ? (
          <section className="torneo-ficha-borde">
            <div className="torneo-ficha">
              <p className="torneo-hud text-[0.65rem] text-[#ff7b88]">Inscripción cerrada</p>
              <p className="torneo-titulo mt-2 text-4xl font-extrabold italic text-white">
                Las inscripciones están cerradas
              </p>
            </div>
          </section>
        ) : resumen.anotados >= MAX_ANOTADOS ? (
          <section className="torneo-ficha-borde">
            <div className="torneo-ficha">
              <p className="torneo-hud text-[0.65rem] text-[#8cff59]">Cupo completo</p>
              <p className="torneo-titulo mt-2 text-4xl font-extrabold italic text-white">
                Se completaron los lugares y la lista de espera
              </p>
            </div>
          </section>
        ) : (
          <InscripcionForm listaEspera={resumen.lleno} />
        )}
      </div>

      <div className="torneo-up mx-auto w-full max-w-xl" style={orden(5)}>
        <Proximamente />
      </div>
    </>
  );
}
