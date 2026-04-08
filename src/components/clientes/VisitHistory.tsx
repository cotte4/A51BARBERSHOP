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
  return "\u2605".repeat(count) + "\u2606".repeat(Math.max(0, 5 - count));
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
            x
          </button>
        </div>

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
          <span className="text-sm uppercase tracking-[0.24em] text-zinc-600">Sin foto</span>
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />

      <div className="absolute bottom-0 left-0 right-0 p-3">
        <p className="text-sm font-bold text-white">{dateLabel}</p>
        {visit.authorBarberoName ? (
          <p className="mt-0.5 text-[11px] text-zinc-400">{visit.authorBarberoName}</p>
        ) : null}
      </div>
    </button>
  );
}

type RecentVisitCardProps = {
  visit: VisitLogSummary;
  label: string;
  onOpen: () => void;
};

function RecentVisitCard({ visit, label, onOpen }: RecentVisitCardProps) {
  const photo = visit.photoUrls[0] ?? null;
  const dateLabel = formatDateShort(new Date(visit.visitedAt));
  const note = visit.barberNotes?.trim() || "Sin nota cargada todavia.";
  const hasContext = visit.tags.length > 0 || visit.propinaEstrellas > 0 || visit.photoUrls.length > 1;

  return (
    <article className="overflow-hidden rounded-[24px] border border-zinc-800 bg-zinc-950 shadow-[0_16px_40px_rgba(0,0,0,0.32)]">
      <div className="grid gap-0 md:grid-cols-[220px_minmax(0,1fr)]">
        <button
          type="button"
          onClick={onOpen}
          className="group relative block min-h-[220px] overflow-hidden bg-zinc-900"
        >
          {photo ? (
            <Image
              src={photo}
              alt={`Sesion del ${dateLabel}`}
              fill
              sizes="(max-width: 768px) 100vw, 220px"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm uppercase tracking-[0.24em] text-zinc-600">
              Sin foto
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4 text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-300">{label}</p>
            <p className="mt-1 text-lg font-semibold text-white">{dateLabel}</p>
          </div>
        </button>

        <div className="space-y-4 p-4 sm:p-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[#8cff59]/20 bg-[#8cff59]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8cff59]">
                {label}
              </span>
              {visit.propinaEstrellas > 0 ? (
                <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
                  {renderStars(visit.propinaEstrellas)}
                </span>
              ) : null}
              <span className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
                {visit.photoUrls.length} {visit.photoUrls.length === 1 ? "foto" : "fotos"}
              </span>
            </div>

            <div>
              <p className="text-sm font-semibold text-white">
                {dateLabel} - Atendido por {visit.authorBarberoName || "equipo A51"}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{note}</p>
            </div>
          </div>

          {visit.tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {visit.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : hasContext ? null : (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-500">
              Todavia no hay tags ni extras marcados para esta sesion.
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            <button
              type="button"
              onClick={onOpen}
              className="inline-flex items-center rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 font-medium text-zinc-300 transition hover:border-zinc-600 hover:text-white"
            >
              Ver sesion completa
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function VisitHistory({ visits }: VisitHistoryProps) {
  const [selected, setSelected] = useState<VisitLogSummary | null>(null);
  const featuredVisits = visits.slice(0, 2);
  const archiveVisits = visits.slice(2);

  if (visits.length === 0) {
    return (
      <section className="rounded-[28px] border border-dashed border-zinc-800 bg-zinc-950/50 p-6 text-center">
        <p className="text-sm text-zinc-600">Todavia no hay memoria de cortes cargada.</p>
      </section>
    );
  }

  return (
    <>
      <section className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <p
              className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500"
              style={{ animation: "a51-fade-up 0.3s ease-out both" }}
            >
              {visits.length} {visits.length === 1 ? "corte" : "cortes"}
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              Las dos mas recientes quedan arriba y el resto baja al archivo.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {featuredVisits.map((visit, index) => (
            <RecentVisitCard
              key={visit.id}
              visit={visit}
              label={index === 0 ? "Ultimo corte" : "Corte anterior"}
              onOpen={() => setSelected(visit)}
            />
          ))}
        </div>

        {archiveVisits.length > 0 ? (
          <div className="space-y-3 rounded-[24px] border border-zinc-800 bg-zinc-900/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Archivo completo
              </p>
              <p className="text-xs text-zinc-500">
                {archiveVisits.length} {archiveVisits.length === 1 ? "sesion mas" : "sesiones mas"}
              </p>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollSnapType: "x mandatory" }}>
              {archiveVisits.map((visit, index) => (
                <div key={visit.id} style={{ scrollSnapAlign: "start" }}>
                  <CutCard visit={visit} index={index} onClick={() => setSelected(visit)} />
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {selected ? <CutModal visit={selected} onClose={() => setSelected(null)} /> : null}
    </>
  );
}
