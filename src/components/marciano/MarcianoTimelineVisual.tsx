"use client";

import type { MarcianoVisit } from "@/lib/types";

type MarcianoTimelineVisualProps = {
  visits: MarcianoVisit[];
};

function formatVisitDate(date: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(date);
}

export default function MarcianoTimelineVisual({ visits }: MarcianoTimelineVisualProps) {
  return (
    <div className="panel-card rounded-[28px] p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="eyebrow text-xs text-zinc-500">Historial</p>
          <h3 className="mt-1 text-xl font-semibold text-white">Tu evolución Marciana</h3>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
          {visits.length} {visits.length === 1 ? "visita" : "visitas"}
        </span>
      </div>

      {/* Visit list */}
      <div className="space-y-3">
        {visits.length === 0 ? (
          <p className="text-sm text-zinc-400">
            Todavía no tenemos visitas cargadas en tu historial.
          </p>
        ) : (
          visits.map((visit) => (
            <div
              key={visit.id}
              className="rounded-[22px] border border-white/10 bg-white/5 p-4"
            >
              <div className="flex items-start gap-3">
                {/* Thumbnail */}
                {visit.photoUrls.length > 0 && (
                  <a
                    href={visit.photoUrls[0]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={visit.photoUrls[0]}
                      alt="Foto del corte"
                      className="h-10 w-10 rounded-xl object-cover border border-white/10"
                    />
                  </a>
                )}

                {/* Metadata */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white">
                    {formatVisitDate(visit.visitedAt)}
                  </p>
                  {visit.barberoNombre && (
                    <p className="mt-0.5 text-xs text-zinc-400">
                      Te atendió {visit.barberoNombre}
                    </p>
                  )}
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {visit.corteNombre ?? "Corte no especificado"}
                  </p>

                  {/* Tags */}
                  {visit.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {visit.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-zinc-400"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
