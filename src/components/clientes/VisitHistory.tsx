"use client";

import Image from "next/image";
import { useEffect, useId, useState } from "react";
import type { VisitLogSummary } from "@/lib/types";

type VisitHistoryProps = {
  visits: VisitLogSummary[];
};

function renderStarsLabel(count: number) {
  return `${count}/5`;
}

function renderStars(count: number) {
  return "★".repeat(count) + "☆".repeat(Math.max(0, 5 - count));
}

function VisitEntry({ visit, defaultOpen }: { visit: VisitLogSummary; defaultOpen?: boolean }) {
  const detailId = useId();
  const [isExpanded, setIsExpanded] = useState(Boolean(defaultOpen));
  const [shouldRenderDetails, setShouldRenderDetails] = useState(Boolean(defaultOpen));

  useEffect(() => {
    if (isExpanded) {
      setShouldRenderDetails(true);
      return;
    }

    if (!shouldRenderDetails) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShouldRenderDetails(false);
    }, 220);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isExpanded, shouldRenderDetails]);

  const dateLabel = new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date(visit.visitedAt));

  const hasExpandableDetails = visit.tags.length > 0 || Boolean(visit.barberNotes) || visit.photoUrls.length > 0;

  return (
    <article
      className={`rounded-[20px] border border-zinc-800 bg-zinc-950 p-4 transition ${
        isExpanded ? "ring-1 ring-[#8cff59]/10" : ""
      }`}
    >
      <button
        type="button"
        onClick={() => setIsExpanded((current) => !current)}
        aria-expanded={isExpanded}
        aria-controls={detailId}
        className="flex w-full items-start justify-between gap-3 text-left"
      >
        <div className="min-w-0">
          <p className="text-sm font-medium text-white">{dateLabel}</p>
          <p className="mt-1 text-xs text-zinc-600">{visit.authorBarberoName || "Sin autor"}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <p className="text-xs text-amber-400">{renderStarsLabel(visit.propinaEstrellas)}</p>
          {hasExpandableDetails ? (
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-[#8cff59]">
              {isExpanded ? "-" : "+"}
            </span>
          ) : null}
        </div>
      </button>

      {shouldRenderDetails && hasExpandableDetails ? (
        <div
          id={detailId}
          className={`grid overflow-hidden transition-all duration-300 ease-out ${
            isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="min-h-0">
            <div className="mt-3 space-y-3">
              {visit.tags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {visit.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
              {visit.barberNotes ? (
                <p className="text-sm text-zinc-400">{visit.barberNotes}</p>
              ) : null}
              {visit.photoUrls.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {visit.photoUrls.map((url, index) => (
                    <div
                      key={`${visit.id}-${index}`}
                      className="relative aspect-square overflow-hidden rounded-xl bg-zinc-800"
                    >
                      <Image
                        src={url}
                        alt={`Foto del corte ${index + 1}`}
                        fill
                        sizes="(max-width: 640px) 50vw, 180px"
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}

export default function VisitHistory({ visits }: VisitHistoryProps) {
  return (
    <section className="rounded-[28px] border border-zinc-800 bg-zinc-900 p-5">
      <h2 className="text-lg font-semibold text-white">Historial visible</h2>
      <div className="mt-4 space-y-3">
        {visits.length === 0 ? (
          <p className="text-sm text-zinc-500">Todavia no hay visitas visibles para este perfil.</p>
        ) : (
          visits.map((visit, index) => <VisitEntry key={visit.id} visit={visit} defaultOpen={index === 0} />)
        )}
      </div>
    </section>
  );
}
