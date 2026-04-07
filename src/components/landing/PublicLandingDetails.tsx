import Link from "next/link";
import type { ReactNode } from "react";

type DetailCard = {
  eyebrow: string;
  title: string;
  description: string;
};

const reasonCards: DetailCard[] = [
  {
    eyebrow: "Lectura clara",
    title: "Sabes que vas a encontrar antes de sentarte",
    description:
      "La home baja el ruido y deja a la vista el modo de trabajo: que hacemos, como lo hacemos y por que A51 se siente distinto.",
  },
  {
    eyebrow: "Ritmo real",
    title: "La experiencia esta pensada para moverse rapido",
    description:
      "Bloques compactos, mensajes directos y una jerarquia que funciona perfecto en mobile sin perder el pulso de marca.",
  },
  {
    eyebrow: "Identidad",
    title: "Neon, taller y precision en la misma lectura",
    description:
      "Nada de estetica generica: la interfaz conserva el lenguaje oscuro e industrial que ya define a A51.",
  },
];

const protocolLines = [
  {
    step: "01",
    title: "Chequeo de intencion",
    text: "Primero se entiende el corte, el largo y el nivel de presencia que buscas.",
  },
  {
    step: "02",
    title: "Mano firme, borde limpio",
    text: "El acabado se siente tecnico: lineas prolijas, contraste controlado y cero exceso.",
  },
  {
    step: "03",
    title: "Salida con firma",
    text: "No termina en el espejo; termina cuando la silueta queda lista para salir a la calle.",
  },
];

const quickSignals = [
  {
    value: "03",
    label: "bloques de lectura",
    detail: "Razones, ritual y cierre en una sola pasada.",
  },
  {
    value: "01",
    label: "vibe A51",
    detail: "Oscuro, neon-industrial y sin estetica SaaS generica.",
  },
  {
    value: "2x",
    label: "CTA visible",
    detail: "Una accion primaria y una secundaria para no perder foco.",
  },
];

function SectionEyebrow({ children }: { children: ReactNode }) {
  return <p className="eyebrow text-[11px] font-semibold">{children}</p>;
}

function SignalPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[#8cff59]/20 bg-[#8cff59]/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#b6ff84]">
      {children}
    </span>
  );
}

type PublicLandingDetailsProps = {
  reserveHref: string;
  loginHref: string;
};

export default function PublicLandingDetails({
  reserveHref,
  loginHref,
}: PublicLandingDetailsProps) {
  return (
    <section
      id="landing-details"
      className="relative isolate overflow-hidden px-4 py-14 sm:px-6 sm:py-16 lg:px-8"
      aria-labelledby="landing-details-title"
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#8cff59]/60 to-transparent"
      />
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-6 h-64 w-[42rem] -translate-x-1/2 rounded-full bg-[#8cff59]/8 blur-3xl"
      />

      <div className="mx-auto flex max-w-6xl flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <SectionEyebrow>Detalles de la home publica</SectionEyebrow>
            <h2
              id="landing-details-title"
              className="font-display mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-[2.75rem]"
            >
              Tres bloques para que A51 se sienta marca, no plantilla.
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-zinc-400 sm:text-right">
            Debajo del hero, la historia baja de forma ordenada: razones para elegirnos,
            experiencia con ADN de barber code y un cierre que empuja a la accion.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <article className="panel-card relative overflow-hidden rounded-[28px] p-5 sm:p-6">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#8cff59]/35 to-transparent" />
            <div className="flex items-start justify-between gap-4">
              <div>
                <SectionEyebrow>Razones para elegir A51</SectionEyebrow>
                <h3 className="font-display mt-2 text-2xl font-semibold text-white sm:text-[2rem]">
                  Directo al valor, sin humo.
                </h3>
              </div>
              <SignalPill>Hablemos de corte</SignalPill>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
              {reasonCards.map((card) => (
                <div
                  key={card.title}
                  className="panel-soft rounded-[22px] p-4 sm:p-5"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#b6ff84]">
                    {card.eyebrow}
                  </p>
                  <h4 className="mt-3 text-base font-semibold leading-snug text-white">
                    {card.title}
                  </h4>
                  <p className="mt-2 text-sm leading-6 text-zinc-400">{card.description}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="panel-soft relative overflow-hidden rounded-[28px] p-5 sm:p-6">
            <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-[#8cff59]/8 blur-3xl" />
            <SectionEyebrow>Barber code / experience</SectionEyebrow>
            <h3 className="font-display mt-2 text-2xl font-semibold text-white sm:text-[2rem]">
              Un ritual corto, tecnico y con presencia.
            </h3>
            <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-400">
              La experiencia se lee como una secuencia: entendemos la intencion, ejecutamos
              con precision y cerramos con una salida limpia. Eso hace que la home no
              parezca un catalogo, sino una puerta de entrada al universo A51.
            </p>

            <div className="mt-5 grid gap-3">
              {protocolLines.map((line) => (
                <div
                  key={line.step}
                  className="flex gap-4 rounded-[22px] border border-white/[0.06] bg-black/10 p-4"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#8cff59]/18 bg-[#8cff59]/8 font-mono text-sm font-semibold text-[#b6ff84]">
                    {line.step}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-white">
                      {line.title}
                    </h4>
                    <p className="mt-1 text-sm leading-6 text-zinc-400">{line.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </article>
        </div>

        <article className="panel-card rounded-[28px] p-5 sm:p-6 lg:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <SectionEyebrow>Cierre con intencion</SectionEyebrow>
              <h3 className="font-display mt-2 text-2xl font-semibold text-white sm:text-[2rem]">
                Un CTA final que empuja sin romper el clima.
              </h3>
              <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-400">
                La ultima capa no grita: ordena. Sirve para dejar claro que A51 tiene foco,
                ritmo y una identidad que se reconoce al toque.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href={reserveHref}
                className="neon-button inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold"
              >
                Reservar turno
              </Link>
              <Link
                href={loginHref}
                className="ghost-button inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold"
              >
                Ingreso interno
              </Link>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {quickSignals.map((signal) => (
              <div
                key={signal.label}
                className="rounded-[22px] border border-white/[0.06] bg-white/[0.03] p-4"
              >
                <p className="font-mono text-2xl font-semibold text-[#b6ff84]">{signal.value}</p>
                <p className="mt-1 text-sm font-semibold uppercase tracking-[0.18em] text-white">
                  {signal.label}
                </p>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{signal.detail}</p>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
