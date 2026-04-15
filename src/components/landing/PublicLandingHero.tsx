import Image from "next/image";
import Link from "next/link";

import BrandMark from "@/components/BrandMark";

const infoTags = [
  "Mar del Plata",
  "Zona Aldrey",
  "Mar — Sáb 10–19hs",
  "Club Marciano",
] as const;

// Pre-computed radar ring sizes to avoid inline mapping confusion
const RADAR_RINGS = [100, 75, 50, 25] as const;

const heroStats = [
  { label: "Reserva online", value: "Activa", accent: true },
  { label: "Horario",        value: "10:00 — 19:00" },
  { label: "Días",           value: "Mar — Sáb" },
  { label: "Membresía",      value: "Marcianos" },
];

type PublicLandingHeroProps = {
  reserveHref: string;
  marcianosHref: string;
};

export default function PublicLandingHero({
  reserveHref,
  marcianosHref,
}: PublicLandingHeroProps) {
  return (
    <section className="app-shell relative isolate overflow-hidden">

      {/* ── atmospheric base ── */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-[#8cff59]/12 blur-3xl" />
        <div className="absolute -left-24 bottom-0 h-80 w-80 rounded-full bg-[#8cff59]/5 blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.04)_0%,transparent_32%,transparent_68%,rgba(140,255,89,0.04)_100%)] opacity-70" />
        <div className="absolute inset-0 bg-[repeating-linear-gradient(180deg,transparent_0,transparent_3px,rgba(255,255,255,0.015)_3px,rgba(255,255,255,0.015)_4px)] opacity-60" />
      </div>

      {/* ── RADAR ── */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden opacity-[0.055]">
        <div className="relative h-[680px] w-[680px] shrink-0">
          {/* concentric rings */}
          {RADAR_RINGS.map((pct) => (
            <div
              key={pct}
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#8cff59]"
              style={{ width: `${pct}%`, height: `${pct}%` }}
            />
          ))}
          {/* crosshairs */}
          <div className="absolute inset-x-0 top-1/2 h-px -translate-y-px bg-[#8cff59]" />
          <div className="absolute inset-y-0 left-1/2 w-px -translate-x-px bg-[#8cff59]" />
          {/* center dot */}
          <div className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#8cff59] shadow-[0_0_12px_rgba(140,255,89,0.9)]" />
          {/* sweep */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                "conic-gradient(from 0deg, rgba(140,255,89,0.55) 0deg, rgba(140,255,89,0.18) 22deg, transparent 65deg)",
              animation: "radar-sweep 5s linear infinite",
            }}
          />
        </div>
      </div>

      {/* ── UFO ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-[8%] top-[9%] text-[#8cff59] opacity-[0.07]"
        style={{ animation: "ufo-float 7s ease-in-out infinite" }}
      >
        <svg viewBox="0 0 100 48" className="h-14 w-32 sm:h-20 sm:w-44" fill="currentColor">
          {/* saucer body */}
          <ellipse cx="50" cy="34" rx="42" ry="11" />
          {/* dome */}
          <path d="M26 34 Q26 13 50 13 Q74 13 74 34" opacity="0.72" />
          {/* rim lights */}
          {[18, 28, 38, 50, 62, 72, 82].map((x) => (
            <circle key={x} cx={x} cy="38.5" r={x === 50 ? 2.8 : 2} opacity={x === 50 ? 1 : 0.55} />
          ))}
          {/* beam — subtle downward glow */}
          <path
            d="M44 45 L38 60 M50 46 L50 62 M56 45 L62 60"
            stroke="currentColor"
            strokeWidth="0.8"
            strokeLinecap="round"
            opacity="0.3"
            fill="none"
          />
        </svg>
      </div>

      {/* ── content ── */}
      <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8 lg:py-20">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] lg:items-center lg:gap-12">

          {/* LEFT */}
          <div className="relative">

            {/* Badge */}
            <div className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-[#8cff59]/20 bg-[rgba(140,255,89,0.08)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#b6ff84]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#8cff59] shadow-[0_0_10px_rgba(140,255,89,0.8)]" />
              Señal captada · Zona Aldrey
            </div>

            {/* Brandmark */}
            <div className="animate-fade-up mt-5" style={{ animationDelay: "0.1s" }}>
              <BrandMark subtitle="Barber Shop // Mar del Plata" compact />
            </div>

            {/* Headline line 1 */}
            <h1
              className="animate-fade-up font-display mt-6 max-w-2xl text-6xl font-semibold leading-[0.9] text-white sm:text-7xl lg:text-[5.5rem]"
              style={{ animationDelay: "0.2s" }}
            >
              Cae con turno.
            </h1>

            {/* Headline line 2 — glitch */}
            <p
              className="font-display mt-2 max-w-2xl text-6xl font-semibold leading-[0.9] text-[#8cff59] sm:text-7xl lg:text-[5.5rem]"
              style={{
                animation:
                  "a51-fade-up 0.7s 0.32s ease both, a51-glitch 11s 3s ease-in-out infinite",
              }}
            >
              Subite a Marcianos.
            </p>

            {/* Subtext */}
            <p
              className="animate-fade-up mt-7 max-w-xl text-base leading-7 text-zinc-300 sm:text-lg"
              style={{ animationDelay: "0.46s" }}
            >
              Reserva online en dos pasos, sin llamadas. Y si ya sos Marciano, tu carril está abierto.
            </p>

            {/* CTAs */}
            <div
              className="animate-fade-up mt-8 flex flex-col gap-3 sm:flex-row"
              style={{ animationDelay: "0.58s" }}
            >
              <Link
                href={reserveHref}
                className="neon-button inline-flex min-h-12 items-center justify-center rounded-2xl px-7 text-base font-semibold"
                aria-label="Reservar turno en A51 Barber Shop"
              >
                Reservar turno
              </Link>
              <Link
                href={marcianosHref}
                className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-7 text-base font-semibold text-zinc-100 transition hover:border-[#8cff59]/30 hover:bg-white/10"
              >
                Soy Marciano
              </Link>
            </div>

            {/* Info tags */}
            <div
              className="animate-fade-up mt-8 flex flex-wrap gap-2"
              style={{ animationDelay: "0.72s" }}
            >
              {infoTags.map((tag) => (
                <span
                  key={tag}
                  className="panel-soft rounded-full px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* RIGHT — visual card */}
          <div
            className="animate-scale-in-landing panel-card relative overflow-hidden rounded-[36px] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.32)] transition hover:-translate-y-1 sm:p-5 lg:p-6"
            style={{ animationDelay: "0.15s" }}
          >
            <div className="pointer-events-none absolute inset-0">
              <Image
                src="/a51barbershop.jpeg"
                alt=""
                fill
                sizes="(max-width: 1024px) 100vw, 48vw"
                className="object-cover opacity-25"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-br from-zinc-950/30 via-zinc-950/72 to-zinc-950/95" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(140,255,89,0.22),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(140,255,89,0.14),transparent_28%)]" />
            </div>

            <div className="relative space-y-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full border border-[#8cff59]/20 bg-[#8cff59]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8cff59]">
                  A51 // online
                </div>
                <div className="h-px flex-1 bg-gradient-to-r from-[#8cff59]/50 via-[#8cff59]/20 to-transparent" />
                <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-500">
                  Mar del Plata
                </div>
              </div>

              <div className="rounded-[30px] border border-white/10 bg-white/5 p-5 backdrop-blur-sm sm:p-6">
                <p className="eyebrow text-[11px] font-semibold">Tu turno, cuando querés</p>
                <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="font-display text-3xl font-semibold text-white sm:text-4xl">
                      Reserva online
                    </p>
                    <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-300">
                      Elegís barbero y horario. Tu lugar queda marcado al instante.
                    </p>
                  </div>
                  <div className="grid gap-2 sm:min-w-32">
                    <div className="h-1.5 rounded-full bg-[rgba(140,255,89,0.65)] shadow-[0_0_14px_rgba(140,255,89,0.5)]" />
                    <div className="h-1.5 rounded-full bg-[rgba(140,255,89,0.35)]" />
                    <div className="h-1.5 rounded-full bg-[rgba(140,255,89,0.2)]" />
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
                  Info rápida
                </p>
                <div className="mt-4 space-y-3">
                  {heroStats.map((row) => (
                    <div key={row.label} className="flex items-center justify-between gap-3">
                      <span className="text-sm text-zinc-300">{row.label}</span>
                      <span
                        className={`text-sm font-semibold ${
                          row.accent ? "text-[#8cff59]" : "text-zinc-100"
                        }`}
                      >
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
