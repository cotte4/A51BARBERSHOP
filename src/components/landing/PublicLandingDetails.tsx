import Link from "next/link";

const services = [
  {
    code: "01",
    title: "Fade & Skin Fade",
    text: "Degradé técnico con bordes a navaja. El corte que define la mano del barbero.",
  },
  {
    code: "02",
    title: "Corte Clásico",
    text: "Tijera y máquina, bien ejecutado. El resultado de siempre sin vueltas.",
  },
  {
    code: "03",
    title: "Corte + Barba",
    text: "De la frente al cuello en una sola sesión. Combo completo.",
  },
  {
    code: "04",
    title: "Diseño de Barba",
    text: "Bordes firmes y forma que aguanta. Del labio al cuello.",
  },
  {
    code: "05",
    title: "Cejas",
    text: "Definición rápida, impacto inmediato. El detalle que cierra el look.",
  },
  {
    code: "06",
    title: "Tintura",
    text: "Color con criterio. Desde mechas y balayage hasta cobertura total.",
  },
] as const;

const marcianoPerks = [
  {
    code: "01",
    title: "Prioridad absoluta",
    text: "Tu turno siempre primero en la agenda. Sin esperar slot.",
  },
  {
    code: "02",
    title: "Cortes del mes cubiertos",
    text: "La cuota mensual cubre todos tus cortes.",
  },
  {
    code: "03",
    title: "Consumición libre",
    text: "Los productos del local son para vos.",
  },
  {
    code: "04",
    title: "Briefing personalizado",
    text: "Asesoría de look antes de cada sesión.",
  },
] as const;

type PublicLandingDetailsProps = {
  reserveHref: string;
  marcianosHref: string;
};

export default function PublicLandingDetails({
  reserveHref,
  marcianosHref,
}: PublicLandingDetailsProps) {
  return (
    <section
      id="landing-details"
      className="relative isolate overflow-hidden px-4 py-14 sm:px-6 sm:py-16 lg:px-8"
    >
      {/* Top separator */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#8cff59]/60 to-transparent"
      />

      <div className="mx-auto flex max-w-6xl flex-col gap-20">

        {/* ── SERVICIOS ── */}
        <div>
          <div className="mb-8 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow text-[11px] font-semibold">Lo que hacemos</p>
              <h2 className="font-display mt-2 text-3xl font-semibold text-white sm:text-4xl">
                Corte técnico, resultado que habla solo.
              </h2>
            </div>
            {/* Decorative line */}
            <div className="hidden h-px w-40 self-center bg-gradient-to-l from-[#8cff59]/40 via-[#8cff59]/15 to-transparent sm:block" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <div
                key={service.code}
                className="group panel-soft rounded-[22px] p-5 transition-all duration-300 hover:border-[#8cff59]/20 hover:shadow-[0_0_28px_rgba(140,255,89,0.07)]"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#8cff59]/20 bg-[#8cff59]/8 font-mono text-xs font-semibold text-[#b6ff84] transition-all duration-300 group-hover:border-[#8cff59]/40 group-hover:bg-[#8cff59]/14 group-hover:text-white group-hover:shadow-[0_0_14px_rgba(140,255,89,0.2)]">
                  {service.code}
                </div>
                <h3 className="font-display mt-4 text-lg font-semibold text-white">
                  {service.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400 transition-colors duration-300 group-hover:text-zinc-300">
                  {service.text}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-start">
            <Link
              href={reserveHref}
              className="ghost-button inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold"
            >
              Reservar turno
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>

        {/* ── CLUB MARCIANO ── */}
        <div className="marciano-glow relative overflow-hidden rounded-[32px] border border-[#8cff59]/22 bg-[#080b08] p-6 sm:p-8 lg:p-10">

          {/* Ambient glow blob */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-0 h-80 w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#8cff59]/14 blur-3xl"
          />
          {/* Top accent line */}
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#8cff59]/80 to-transparent"
          />
          {/* Scan lines */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_3px,rgba(140,255,89,0.014)_3px,rgba(140,255,89,0.014)_4px)]"
          />
          {/* ÁREA 51 watermark */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden select-none"
          >
            <p className="font-display rotate-[-32deg] text-[9rem] font-bold uppercase tracking-[0.4em] text-[#8cff59] opacity-[0.025] sm:text-[12rem]">
              ÁREA 51
            </p>
          </div>

          <div className="relative flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">

            {/* LEFT: headline + description + CTA */}
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#8cff59]/30 bg-[#8cff59]/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#b6ff84]">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#8cff59] shadow-[0_0_8px_rgba(140,255,89,0.9)]" />
                Zona restringida
              </div>

              <h2 className="font-display mt-5 text-5xl font-semibold text-white sm:text-6xl lg:text-[4rem] lg:leading-[0.95]">
                Club Marciano.
              </h2>
              <h2 className="font-display text-5xl font-semibold text-[#8cff59] sm:text-6xl lg:text-[4rem] lg:leading-[0.95]">
                El nivel que te abre otra puerta.
              </h2>

              <p className="mt-6 max-w-md text-base leading-7 text-zinc-300">
                Marcianos no es un plan de fidelidad. Es un carril separado para los que ya juegan la
                liga de A51. Prioridad real, beneficios concretos y acceso propio.
              </p>

              <p className="mt-3 max-w-sm text-sm font-semibold italic text-[#8cff59]/70">
                "Los Marcianos no se identifican. Se reconocen."
              </p>

              <Link
                href={marcianosHref}
                className="neon-button mt-8 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl px-7 text-base font-semibold"
              >
                Tengo mi acceso
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            {/* RIGHT: membership card + benefits */}
            <div className="flex flex-col gap-4 lg:w-[400px] lg:shrink-0">

              {/* Membership card */}
              <div className="relative h-48 overflow-hidden rounded-[20px] border border-[#8cff59]/28 bg-gradient-to-br from-[#0d1f0d] via-[#090f09] to-[#0e1c0e] shadow-[0_20px_50px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(140,255,89,0.18)]">
                {/* Card inner grid */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(140,255,89,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(140,255,89,0.04)_1px,transparent_1px)] [background-size:24px_24px]" />
                {/* Card holographic sheen */}
                <div className="absolute inset-0 bg-[linear-gradient(125deg,rgba(140,255,89,0.1)_0%,transparent_38%,transparent_62%,rgba(182,255,132,0.06)_100%)]" />
                {/* Card edge glow */}
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#8cff59]/60 to-transparent" />

                <div className="relative flex h-full flex-col justify-between p-5">
                  {/* Top row */}
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.32em] text-[#8cff59]/50">
                        Area 51 // Acceso exclusivo
                      </p>
                      <p className="font-display mt-1.5 text-xl font-semibold text-white">
                        Club Marciano
                      </p>
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#8cff59]/25 bg-[#8cff59]/10">
                      <span className="h-2 w-2 rounded-full bg-[#8cff59] shadow-[0_0_10px_rgba(140,255,89,0.9)]" />
                    </div>
                  </div>

                  {/* Chip */}
                  <div className="h-7 w-11 rounded-md border border-[#8cff59]/28 bg-gradient-to-br from-[#8cff59]/18 via-[#8cff59]/8 to-transparent" />

                  {/* Bottom row */}
                  <div>
                    <p className="font-mono text-[11px] font-semibold tracking-[0.22em] text-white/55">
                      A51 •••• •••• 2025
                    </p>
                    <div className="mt-1.5 flex items-center justify-between">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8cff59]">
                        Prioridad Absoluta
                      </p>
                      <p className="text-[10px] font-mono text-zinc-600">Marciano</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Benefits grid */}
              <div className="grid gap-3 sm:grid-cols-2">
                {marcianoPerks.map((perk) => (
                  <div
                    key={perk.code}
                    className="group rounded-[22px] border border-[#8cff59]/12 bg-[rgba(140,255,89,0.04)] p-4 transition-all duration-300 hover:border-[#8cff59]/22 hover:bg-[rgba(140,255,89,0.06)]"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#8cff59]/20 bg-[#8cff59]/10 font-mono text-[11px] font-semibold text-[#b6ff84] transition-all duration-300 group-hover:border-[#8cff59]/35 group-hover:shadow-[0_0_12px_rgba(140,255,89,0.18)]">
                      {perk.code}
                    </div>
                    <h3 className="mt-3 text-sm font-semibold text-white">{perk.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-zinc-400">{perk.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── HORARIOS + UBICACIÓN ── */}
        <div className="grid gap-4 sm:grid-cols-2">

          {/* Horarios */}
          <div className="panel-card rounded-[28px] p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div>
                <p className="eyebrow text-[11px] font-semibold">Horarios</p>
                <h3 className="font-display mt-1 text-xl font-semibold text-white">
                  Martes a Sábado
                </h3>
              </div>
              {/* Open indicator */}
              <div className="ml-auto flex items-center gap-1.5 rounded-full border border-[#8cff59]/20 bg-[#8cff59]/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8cff59]">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#8cff59]" />
                Activo
              </div>
            </div>
            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
                <span className="text-sm text-zinc-300">Mar — Sáb</span>
                <span className="font-mono text-sm font-semibold text-[#8cff59]">
                  10:00 — 19:00
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-3">
                <span className="text-sm text-zinc-500">Dom — Lun</span>
                <span className="font-mono text-sm text-zinc-600">Cerrado</span>
              </div>
            </div>
          </div>

          {/* Ubicación + Instagram */}
          <div className="panel-soft rounded-[28px] p-5 sm:p-6">
            <p className="eyebrow text-[11px] font-semibold">Dónde encontrarnos</p>
            <h3 className="font-display mt-1 text-xl font-semibold text-white">Zona Aldrey</h3>
            <p className="mt-1 text-sm text-zinc-400">Mar del Plata, Buenos Aires</p>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-zinc-300">
                <svg
                  viewBox="0 0 24 24"
                  className="h-3.5 w-3.5 text-[#8cff59]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                  <circle cx="12" cy="9" r="2.5" />
                </svg>
                Aldrey, MdP
              </span>

              <a
                href="#"
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-zinc-300 transition hover:border-[#8cff59]/30 hover:text-[#8cff59]"
                aria-label="Instagram de A51 Barber Shop"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
                Instagram
              </a>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
