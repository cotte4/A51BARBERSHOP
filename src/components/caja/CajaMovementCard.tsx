"use client";

import { useEffect, useState } from "react";

type CajaMovementCardProps = {
  timeLabel: string;
  badge: string;
  title: string;
  subtitle: string;
  detail: string;
  amountLabel: string;
  toneClassName: string;
};

function ChevronIcon({ expanded }: { expanded: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-5 w-5 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function CajaMovementCard({
  timeLabel,
  badge,
  title,
  subtitle,
  detail,
  amountLabel,
  toneClassName,
}: CajaMovementCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [shouldRenderDetail, setShouldRenderDetail] = useState(false);

  useEffect(() => {
    if (isExpanded) {
      setShouldRenderDetail(true);
      return;
    }

    if (!shouldRenderDetail) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShouldRenderDetail(false);
    }, 220);

    return () => window.clearTimeout(timeoutId);
  }, [isExpanded, shouldRenderDetail]);

  return (
    <article
      className={`rounded-[24px] border px-4 py-4 transition ${toneClassName} ${
        isExpanded ? "ring-1 ring-white/10" : ""
      }`}
    >
      <button
        type="button"
        onClick={() => setIsExpanded((current) => !current)}
        aria-expanded={isExpanded}
        className="flex w-full items-start justify-between gap-4 text-left"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-stone-950 px-3 py-1 text-xs font-semibold text-white">
              {timeLabel}
            </span>
            <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-stone-800">
              {badge}
            </span>
          </div>
          <p className="mt-3 text-lg font-semibold">{title}</p>
          <p className="mt-1 text-sm opacity-80">{subtitle}</p>
        </div>

        <div className="flex shrink-0 items-start gap-3">
          <div className="text-right">
            <p className="text-sm uppercase tracking-[0.18em] opacity-55">Impacto</p>
            <p className="mt-2 text-xl font-semibold">{amountLabel}</p>
          </div>
          <span className="rounded-full border border-white/12 bg-white/8 p-2 opacity-80">
            <ChevronIcon expanded={isExpanded} />
          </span>
        </div>
      </button>

      {shouldRenderDetail ? (
        <div
          className={`grid overflow-hidden transition-all duration-300 ease-out ${
            isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="min-h-0">
            <p className="pt-3 text-sm opacity-75">{detail}</p>
          </div>
        </div>
      ) : null}
    </article>
  );
}
