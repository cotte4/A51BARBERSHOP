// Pre-computed delays + durations to avoid hydration mismatch (no Math.random())
const BARS: { delay: string; duration: string; opacity: number }[] = [
  { delay: "0s",     duration: "0.72s", opacity: 0.7 },
  { delay: "0.13s",  duration: "0.91s", opacity: 0.5 },
  { delay: "0.28s",  duration: "0.76s", opacity: 0.8 },
  { delay: "0.06s",  duration: "1.05s", opacity: 0.55 },
  { delay: "0.35s",  duration: "0.84s", opacity: 0.75 },
  { delay: "0.19s",  duration: "0.67s", opacity: 0.65 },
  { delay: "0.44s",  duration: "0.95s", opacity: 0.85 },
  { delay: "0.09s",  duration: "1.0s",  opacity: 0.5 },
  { delay: "0.31s",  duration: "0.79s", opacity: 0.9 },
  { delay: "0.22s",  duration: "0.88s", opacity: 0.6 },
  { delay: "0.41s",  duration: "0.71s", opacity: 0.75 },
  { delay: "0.04s",  duration: "1.02s", opacity: 0.55 },
  { delay: "0.26s",  duration: "0.83s", opacity: 0.8 },
  { delay: "0.38s",  duration: "0.93s", opacity: 0.65 },
  { delay: "0.15s",  duration: "0.75s", opacity: 0.7 },
  { delay: "0.49s",  duration: "0.98s", opacity: 0.5 },
  { delay: "0.11s",  duration: "0.86s", opacity: 0.85 },
  { delay: "0.33s",  duration: "0.69s", opacity: 0.6 },
  { delay: "0.46s",  duration: "0.92s", opacity: 0.75 },
  { delay: "0.20s",  duration: "0.78s", opacity: 0.55 },
  { delay: "0.37s",  duration: "0.89s", opacity: 0.8 },
  { delay: "0.07s",  duration: "1.04s", opacity: 0.65 },
  { delay: "0.42s",  duration: "0.73s", opacity: 0.9 },
  { delay: "0.24s",  duration: "0.82s", opacity: 0.55 },
  { delay: "0.51s",  duration: "0.96s", opacity: 0.7 },
  { delay: "0.16s",  duration: "0.68s", opacity: 0.6 },
  { delay: "0.39s",  duration: "1.01s", opacity: 0.75 },
  { delay: "0.03s",  duration: "0.87s", opacity: 0.5 },
  { delay: "0.29s",  duration: "0.74s", opacity: 0.85 },
  { delay: "0.47s",  duration: "0.90s", opacity: 0.65 },
  { delay: "0.12s",  duration: "0.77s", opacity: 0.8 },
  { delay: "0.34s",  duration: "1.03s", opacity: 0.55 },
];

export default function LandingFreqBand() {
  return (
    <div className="relative border-y border-[#8cff59]/10 bg-[#080b08] py-5">
      {/* top glow line */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#8cff59]/45 to-transparent"
      />
      {/* bottom glow line */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#8cff59]/45 to-transparent"
      />

      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 sm:px-6 lg:px-8">
        {/* Label */}
        <div className="shrink-0">
          <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.32em] text-[#8cff59]/50">
            Transmisión activa
          </p>
          <p className="font-display mt-0.5 text-sm font-semibold text-white sm:text-base">
            A51 en el aire.
          </p>
        </div>

        {/* Divider */}
        <div className="h-px flex-shrink flex-1 bg-gradient-to-r from-[#8cff59]/20 to-transparent" />

        {/* Frequency bars */}
        <div className="flex h-9 shrink-0 items-end gap-[2px]">
          {BARS.map((bar, i) => (
            <div
              key={i}
              className="w-[3px] origin-bottom rounded-full bg-[#8cff59]"
              style={{
                animation: `a51-freq ${bar.duration} ${bar.delay} ease-in-out infinite`,
                opacity: bar.opacity,
              }}
            />
          ))}
        </div>

        {/* Right label */}
        <div
          className="shrink-0 hidden sm:flex items-center gap-1.5 rounded-full border border-[#8cff59]/20 bg-[#8cff59]/8 px-2.5 py-1"
        >
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#8cff59] shadow-[0_0_8px_rgba(140,255,89,0.9)]" />
          <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.22em] text-[#8cff59]">
            Online
          </span>
        </div>
      </div>
    </div>
  );
}
