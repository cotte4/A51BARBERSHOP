"use client";

import Image from "next/image";
import { useState } from "react";
import type { VisitLogSummary } from "@/lib/types";

type VisitHistoryProps = {
  visits: VisitLogSummary[];
};

function formatDateShort(date: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(date);
}

function formatDateFull(date: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(date);
}

function renderStars(count: number) {
  if (count === 0) return null;
  return "★".repeat(count) + "☆".repeat(Math.max(0, 5 - count));
}

type ModalProps = {
  visit: VisitLogSummary;
  onClose: () => void;
};

function CutModal({ visit, onClose }: ModalProps) {
  const [activePhoto, setActivePhoto] = useState(0);
  const dateLabel = formatDateFull(new Date(visit.visitedAt));
  const photos = visit.photoUrls;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      <div
        className="relative z-10 w-full max-w-md overflow-hidden rounded-t-[32px] bg-zinc-950 sm:rounded-[32px]"
        style={{ animation: "a51-scale-in 0.25s ease-out both" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Visita
            </p>
            <p className="mt-1 text-base font-semibold capitalize text-white">{dateLabel}</p>
            {visit.authorBarberoName ? (
              <p className="mt-0.5 text-sm text-zinc-500">{visit.authorBarberoName}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-800 text-zinc-400 hover:text-white"
          >
            ×
          </button>
        </div>

        {/* Photo viewer */}
        {photos.length > 0 ? (
          <div className="mt-4">
            <div className="relative aspect-square w-full bg-zinc-900">
              <Image
                src={photos[activePhoto]}
                alt={`Corte ${activePhoto + 1}`}
                fill
                sizes="448px"
                className="object-cover"
                priority
              />
            </div>
            {photos.length > 1 ? (
              <div className="flex gap-1.5 overflow-x-auto px-5 py-3">
                {photos.map((url, i) => (
                  <button
                    key={url}
                    type="button"
                    onClick={() => setActivePhoto(i)}
                    className={`relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                      i === activePhoto ? "border-[#8cff59]" : "border-transparent opacity-50"
                    }`}
                  >
                    <Image src={url} alt="" fill sizes="48px" className="object-cover" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Info */}
        <div className="space-y-3 px-5 pb-6 pt-4">
          {visit.propinaEstrellas > 0 ? (
            <p className="text-sm text-amber-400">{renderStars(visit.propinaEstrellas)}</p>
          ) : null}

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
            <p className="text-sm leading-relaxed text-zinc-400">{visit.barberNotes}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

type CutCardProps = {
  visit: VisitLogSummary;
  index: number;
  onClick: () => void;
};

function CutCard({ visit, index, onClick }: CutCardProps) {
  const photo = visit.photoUrls[0] ?? null;
  const dateLabel = formatDateShort(new Date(visit.visitedAt));
  const extraPhotos = visit.photoUrls.length - 1;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex-none overflow-hidden rounded-[22px] border border-zinc-800 bg-zinc-950 transition hover:border-zinc-700 hover:shadow-[0_16px_40px_rgba(0,0,0,0.5)]"
      style={{
        width: "176px",
        height: "232px",
        animation: `a51-slide-in 0.38s ease-out ${index * 55}ms both`,
      }}
    >
      {/* Photo */}
      {photo ? (
        <>
          <Image
            src={photo}
            alt={`Corte ${dateLabel}`}
            fill
            sizes="176px"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
          {extraPhotos > 0 ? (
            <span className="absolute right-2.5 top-2.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
              +{extraPhotos}
            </span>
          ) : null}
        </>
      ) : (
        <div className="flex h-full items-center justify-center bg-zinc-900">
          <span className="text-4xl text-zinc-700">✂</span>
        </div>
      )}

      {/* Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />

      {/* Date strip */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <p className="text-sm font-bold text-white">{dateLabel}</p>
        {visit.authorBarberoName ? (
          <p className="mt-0.5 text-[11px] text-zinc-400">{visit.authorBarberoName}</p>
        ) : null}
      </div>
    </button>
  );
}

export default function VisitHistory({ visits }: VisitHistoryProps) {
  const [selected, setSelected] = useState<VisitLogSummary | null>(null);

  if (visits.length === 0) {
    return (
      <section className="rounded-[28px] border border-dashed border-zinc-800 bg-zinc-950/50 p-6 text-center">
        <p className="text-sm text-zinc-600">Todavia sin cortes registrados.</p>
      </section>
    );
  }

  return (
    <>
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <p
            className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500"
            style={{ animation: "a51-fade-up 0.3s ease-out both" }}
          >
            {visits.length} {visits.length === 1 ? "corte" : "cortes"}
          </p>
        </div>

        {/* Horizontal scroll strip */}
        <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollSnapType: "x mandatory" }}>
          {visits.map((visit, index) => (
            <div key={visit.id} style={{ scrollSnapAlign: "start" }}>
              <CutCard
                visit={visit}
                index={index}
                onClick={() => setSelected(visit)}
              />
            </div>
          ))}
        </div>
      </section>

      {selected ? (
        <CutModal visit={selected} onClose={() => setSelected(null)} />
      ) : null}
    </>
  );
}
