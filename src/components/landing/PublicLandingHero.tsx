import Image from "next/image";
import Link from "next/link";

import BrandMark from "@/components/BrandMark";

const vibeTags = ["Reserva rapida", "Portal Marciano", "Mobile first", "Dark neon"];

const consoleCards = [
  {
    label: "Reserva",
    title: "Tu lugar en A51",
    text: "Cae al link, elige barbero y deja tu lugar marcado sin vueltas.",
  },
  {
    label: "Marcianos",
    title: "Club Marciano",
    text: "Acceso VIP para los que ya juegan la liga de Area51.",
  },
  {
    label: "Pantalla",
    title: "Touch de barrio",
    text: "Pantallas rapidas, CTA grandes y lectura filosa en mobile.",
  },
] as const;

type PublicLandingHeroProps = {
  reserveHref: string;
  loginHref: string;
  marcianosHref: string;
};

export default function PublicLandingHero({
  reserveHref,
  loginHref,
  marcianosHref,
}: PublicLandingHeroProps) {
  return (
    <section className="app-shell relative isolate overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-80 w-80 -translate-x-1/2 rounded-full bg-[#8cff59]/10 blur-3xl" />
        <div className="absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-[#8cff59]/5 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.04)_0%,transparent_32%,transparent_68%,rgba(140,255,89,0.04)_100%)] opacity-70" />
        <div className="absolute inset-0 bg-[repeating-linear-gradient(180deg,transparent_0,transparent_3px,rgba(255,255,255,0.015)_3px,rgba(255,255,255,0.015)_4px)] opacity-60" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-20">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.04fr)_minmax(0,0.96fr)] lg:items-center lg:gap-10">
          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#8cff59]/20 bg-[rgba(140,255,89,0.08)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#b6ff84]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#8cff59] shadow-[0_0_10px_rgba(140,255,89,0.8)]" />
              Public access
            </div>

            <div className="mt-5">
              <BrandMark subtitle="Area51 // entrada de calle" compact />
            </div>

            <h1 className="font-display mt-6 max-w-2xl text-5xl font-semibold leading-[0.92] text-white sm:text-6xl lg:text-7xl">
              Cae con turno.
              <span className="mt-2 block text-[#8cff59]">Subite a Marcianos si ya sos del club.</span>
            </h1>

            <p className="mt-5 max-w-xl text-base leading-7 text-zinc-300 sm:text-lg">
              Tres puertas, cero mezcla: reserva publica para caer al corte, portal Marciano para
              la gente del club y base interna para el staff. Noche, neón y código de Buenos Aires.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={reserveHref}
                className="neon-button inline-flex min-h-12 items-center justify-center rounded-2xl px-6 text-base font-semibold"
                aria-label="Reservar turno en A51 Barber Shop"
              >
                Caer al turno
              </Link>
              <Link
                href={marcianosHref}
                className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-6 text-base font-semibold text-zinc-100 transition hover:border-[#8cff59]/30 hover:bg-white/10"
              >
                Subir a Marcianos
              </Link>
              <Link
                href={loginHref}
                className="ghost-button inline-flex min-h-12 items-center justify-center rounded-2xl px-6 text-base font-semibold"
                aria-label="Ingresar a la base de A51 Barber Shop"
              >
                Ingresar
              </Link>
            </div>



            <div className="mt-8 flex flex-wrap gap-2">
              {vibeTags.map((tag) => (
                <span
                  key={tag}
                  className="panel-soft rounded-full px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="panel-card relative overflow-hidden rounded-[36px] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.28)] sm:p-5 lg:p-6">
            <div className="pointer-events-none absolute inset-0">
              <Image
                src="/a51barbershop.jpeg"
                alt=""
                fill
                sizes="(max-width: 1024px) 100vw, 48vw"
                className="object-cover opacity-20"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-br from-zinc-950/35 via-zinc-950/75 to-zinc-950/96" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(140,255,89,0.2),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(140,255,89,0.12),transparent_28%)]" />
            </div>

            <div className="relative space-y-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full border border-[#8cff59]/20 bg-[#8cff59]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8cff59]">
                  Signal chamber
                </div>
                <div className="h-px flex-1 bg-gradient-to-r from-[#8cff59]/50 via-[#8cff59]/20 to-transparent" />
                <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                  A51 / online
                </div>
              </div>

              <div className="rounded-[30px] border border-white/10 bg-white/5 p-5 backdrop-blur-sm sm:p-6">
                    <p className="eyebrow text-[11px] font-semibold">Public lane</p>
                    <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="font-display text-3xl font-semibold text-white sm:text-4xl">
                          Entrada de calle
                        </p>
                        <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-300">
                          Reserva por clave, entra al club por cuenta y no mezcles cliente con staff.
                        </p>
                      </div>

                  <div className="grid gap-2 sm:min-w-32">
                    <div className="h-1.5 rounded-full bg-[rgba(140,255,89,0.65)] shadow-[0_0_14px_rgba(140,255,89,0.5)]" />
                    <div className="h-1.5 rounded-full bg-[rgba(140,255,89,0.35)]" />
                    <div className="h-1.5 rounded-full bg-[rgba(140,255,89,0.2)]" />
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {consoleCards.map((card) => (
                  <div
                    key={card.label}
                    className="rounded-[26px] border border-white/10 bg-[rgba(9,9,11,0.55)] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.18)]"
                  >
                    <p className="eyebrow text-[10px] font-semibold">{card.label}</p>
                    <p className="mt-3 font-display text-lg font-semibold text-white">{card.title}</p>
                    <p className="mt-2 text-sm leading-6 text-zinc-400">{card.text}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-[1.15fr_0.85fr]">
                <div className="rounded-[28px] border border-[#8cff59]/20 bg-[rgba(140,255,89,0.08)] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#b6ff84]">
                    Quick path
                  </p>
                  <ul className="mt-3 space-y-2 text-sm text-zinc-200">
                    <li>1. Reserva sin friccion.</li>
                    <li>2. Club Marciano por carril propio.</li>
                    <li>3. Staff adentro, clientes afuera.</li>
                  </ul>
                </div>

                <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
                    Ready state
                  </p>
                  <div className="mt-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-zinc-300">Reserva publica</span>
                      <span className="text-sm font-semibold text-[#8cff59]">Active</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-zinc-300">Portal Marciano</span>
                      <span className="text-sm font-semibold text-zinc-100">/marcianos</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-zinc-300">Ingreso interno</span>
                      <span className="text-sm font-semibold text-zinc-100">Login</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-zinc-300">Modo</span>
                      <span className="text-sm font-semibold text-zinc-100">Mobile first</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
