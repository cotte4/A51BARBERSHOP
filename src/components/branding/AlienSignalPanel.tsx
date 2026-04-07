type AlienSignalPanelProps = {
  eyebrow?: string;
  title: string;
  detail: string;
  badges?: string[];
  tone?: "brand" | "fuchsia" | "sky";
};

const toneClasses = {
  brand: {
    border: "border-[#8cff59]/18",
    glow: "from-[#8cff59]/12 via-transparent to-transparent",
    badge: "border-[#8cff59]/25 bg-[#8cff59]/10 text-[#d9ffc8]",
  },
  fuchsia: {
    border: "border-fuchsia-400/18",
    glow: "from-fuchsia-400/12 via-transparent to-transparent",
    badge: "border-fuchsia-400/25 bg-fuchsia-400/10 text-fuchsia-100",
  },
  sky: {
    border: "border-sky-400/18",
    glow: "from-sky-400/12 via-transparent to-transparent",
    badge: "border-sky-400/25 bg-sky-400/10 text-sky-100",
  },
} as const;

function MiniAlien({ tone }: { tone: "green" | "red" | "white" }) {
  const headClass =
    tone === "green" ? "bg-[#65ff2f]" : tone === "red" ? "bg-[#ff3b4d]" : "bg-[#f7f7f7]";
  const antennaClass =
    tone === "green" ? "bg-[#65ff2f]" : tone === "red" ? "bg-[#ff3b4d]" : "bg-[#f7f7f7]";

  return (
    <div className="relative h-10 w-10">
      <div className={`absolute inset-x-1 top-1 h-7 rounded-full border-2 border-black/80 ${headClass}`} />
      <div className={`absolute left-[9px] top-0 h-2.5 w-1 rounded-full border border-black/70 ${antennaClass}`} />
      <div className={`absolute right-[9px] top-0 h-2.5 w-1 rounded-full border border-black/70 ${antennaClass}`} />
      <div className="absolute left-[8px] top-3.5 h-4 w-2.5 rounded-full bg-black" />
      <div className="absolute right-[8px] top-3.5 h-4 w-2.5 rounded-full bg-black" />
      <div className="absolute inset-x-2 bottom-0 h-3 rounded-t-[10px] border-2 border-black/80 bg-white" />
    </div>
  );
}

export default function AlienSignalPanel({
  eyebrow = "Orbita A51",
  title,
  detail,
  badges = [],
  tone = "brand",
}: AlienSignalPanelProps) {
  const palette = toneClasses[tone];

  return (
    <div
      className={`relative overflow-hidden rounded-[28px] border bg-[linear-gradient(180deg,rgba(24,24,27,0.94),rgba(14,14,17,0.96))] p-4 shadow-[0_20px_55px_rgba(0,0,0,0.24)] ${palette.border}`}
    >
      <div className={`pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.05),transparent_24%),linear-gradient(120deg,transparent,transparent)]`} />
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-br ${palette.glow}`} />

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow text-[10px]">{eyebrow}</p>
            <h3 className="mt-2 font-display text-xl font-semibold text-white">{title}</h3>
          </div>
          <div className="flex items-end gap-1">
            <MiniAlien tone="green" />
            <MiniAlien tone="red" />
            <MiniAlien tone="white" />
          </div>
        </div>

        <p className="mt-3 text-sm leading-6 text-zinc-300">{detail}</p>

        {badges.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {badges.map((badge) => (
              <span
                key={badge}
                className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${palette.badge}`}
              >
                {badge}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
