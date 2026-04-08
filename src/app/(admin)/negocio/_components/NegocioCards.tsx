import Link from "next/link";

type SmartCardProps = {
  href: string;
  eyebrow: string;
  title: string;
  detail: string;
  footer: string;
  kicker?: string;
  accentClassName?: string;
  className?: string;
  children: React.ReactNode;
};

export function SmartCard({
  href,
  eyebrow,
  title,
  detail,
  footer,
  kicker,
  accentClassName,
  className,
  children,
}: SmartCardProps) {
  return (
    <Link
      href={href}
      className={`group panel-card relative overflow-hidden rounded-[30px] border p-5 transition duration-200 hover:-translate-y-1 hover:border-[#8cff59]/42 hover:shadow-[0_28px_85px_rgba(140,255,89,0.14)] ${accentClassName ?? ""} ${className ?? ""}`}
    >
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.04),transparent_32%,transparent_68%,rgba(255,255,255,0.03))]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />
      <div className="absolute left-5 top-5 h-2 w-12 rounded-full bg-[#8cff59]/70 shadow-[0_0_18px_rgba(140,255,89,0.35)]" />
      <div className="absolute right-5 top-5 h-16 w-16 rounded-full border border-white/6" />
      <div className="absolute right-8 top-8 h-10 w-10 rounded-full border border-white/6" />
      <div className="absolute bottom-5 left-5 h-px w-20 bg-white/12" />
      <div className="absolute bottom-5 right-5 h-px w-14 bg-white/12" />
      <div className="absolute inset-0 opacity-0 transition duration-200 group-hover:opacity-100">
        <div className="h-full w-full bg-[radial-gradient(circle_at_top_right,_rgba(140,255,89,0.11),_transparent_38%),linear-gradient(180deg,transparent,rgba(255,255,255,0.02))]" />
      </div>

      <div className="relative z-10 flex h-full flex-col">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow text-xs font-semibold">{eyebrow}</p>
            <h2 className="font-display mt-2 text-[28px] font-semibold tracking-tight text-white">
              {title}
            </h2>
          </div>
          {kicker ? (
            <span className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-300">
              {kicker}
            </span>
          ) : null}
        </div>
        <p className="mt-3 max-w-xl text-sm text-zinc-400">{detail}</p>

        <div className="mt-5 flex-1">{children}</div>

        <div className="mt-5 flex items-center justify-between border-t border-white/8 pt-4 text-sm">
          <span className="text-zinc-400">{footer}</span>
          <span className="flex items-center gap-2 font-semibold text-[#8cff59] transition-transform duration-200 group-hover:translate-x-1">
            {footer}
            <span className="text-base">-&gt;</span>
          </span>
        </div>
      </div>
    </Link>
  );
}

type HudMiniStatProps = {
  label: string;
  value: string;
  helper: string;
};

export function HudMiniStat({ label, value, helper }: HudMiniStatProps) {
  return (
    <div className="rounded-[22px] border border-white/8 bg-black/18 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">{label}</p>
      <p className="font-display mt-2 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-1 text-xs text-zinc-400">{helper}</p>
    </div>
  );
}

type UtilityChipProps = {
  href: string;
  label: string;
  detail: string;
};

export function UtilityChip({ href, label, detail }: UtilityChipProps) {
  return (
    <Link
      href={href}
      className="group rounded-[22px] border border-zinc-800 bg-zinc-950/28 px-4 py-4 transition hover:-translate-y-0.5 hover:border-[#8cff59]/30 hover:bg-zinc-950/55"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-white">{label}</p>
          <p className="mt-1 text-sm text-zinc-400">{detail}</p>
        </div>
        <span className="text-sm text-zinc-500 transition group-hover:text-[#8cff59]">+</span>
      </div>
    </Link>
  );
}
