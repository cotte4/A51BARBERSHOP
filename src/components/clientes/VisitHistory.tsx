import Image from "next/image";
import type { VisitLogSummary } from "@/lib/types";

type VisitHistoryProps = {
  visits: VisitLogSummary[];
};

function renderStars(count: number) {
  return "★".repeat(count) + "☆".repeat(Math.max(0, 5 - count));
}

export default function VisitHistory({ visits }: VisitHistoryProps) {
  return (
    <section className="rounded-[28px] border border-zinc-800 bg-zinc-900 p-5">
      <h2 className="text-lg font-semibold text-white">Historial visible</h2>
      <div className="mt-4 space-y-3">
        {visits.length === 0 ? (
          <p className="text-sm text-zinc-500">Todavia no hay visitas visibles para este perfil.</p>
        ) : (
          visits.map((visit) => (
            <article key={visit.id} className="rounded-[20px] border border-zinc-800 bg-zinc-950 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-white">
                  {new Intl.DateTimeFormat("es-AR", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    timeZone: "America/Argentina/Buenos_Aires",
                  }).format(new Date(visit.visitedAt))}
                </p>
                <p className="text-xs text-amber-400">{renderStars(visit.propinaEstrellas)}</p>
              </div>
              <p className="mt-1 text-xs text-zinc-600">{visit.authorBarberoName || "Sin autor"}</p>
              {visit.tags.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {visit.tags.map((tag) => (
                    <span key={tag} className="rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-300">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
              {visit.barberNotes ? (
                <p className="mt-3 text-sm text-zinc-400">{visit.barberNotes}</p>
              ) : null}
              {visit.photoUrls.length > 0 ? (
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {visit.photoUrls.map((url, index) => (
                    <div key={`${visit.id}-${index}`} className="relative aspect-square overflow-hidden rounded-xl bg-zinc-800">
                      <Image src={url} alt={`Foto del corte ${index + 1}`} fill sizes="(max-width: 640px) 50vw, 180px" className="object-cover" />
                    </div>
                  ))}
                </div>
              ) : null}
            </article>
          ))
        )}
      </div>
    </section>
  );
}
