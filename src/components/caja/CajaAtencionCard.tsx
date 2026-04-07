"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AtencionFormState } from "@/app/(barbero)/caja/actions";
import AnularButton from "@/components/caja/AnularButton";

type CajaAtencionCardProps = {
  atencionId: string;
  timeLabel: string;
  statusLabel: string;
  paymentLabel: string;
  paymentClassName: string;
  serviceName: string;
  barberName: string;
  brutoLabel: string;
  netoLabel?: string | null;
  comisionLabel?: string | null;
  productosLabel?: string | null;
  motivoAnulacion?: string | null;
  notas?: string | null;
  impactLabel: string;
  impactHint: string;
  toneWrapperClassName: string;
  railClassName: string;
  statusClassName: string;
  titleClassName: string;
  noteClassName: string;
  amountClassName: string;
  canEdit: boolean;
  editHref: string;
  isAdmin: boolean;
  anularAction: (
    id: string,
    prevState: AtencionFormState,
    formData: FormData
  ) => Promise<AtencionFormState>;
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

export default function CajaAtencionCard({
  atencionId,
  timeLabel,
  statusLabel,
  paymentLabel,
  paymentClassName,
  serviceName,
  barberName,
  brutoLabel,
  netoLabel,
  comisionLabel,
  productosLabel,
  motivoAnulacion,
  notas,
  impactLabel,
  impactHint,
  toneWrapperClassName,
  railClassName,
  statusClassName,
  titleClassName,
  noteClassName,
  amountClassName,
  canEdit,
  editHref,
  isAdmin,
  anularAction,
}: CajaAtencionCardProps) {
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
      className={`relative overflow-hidden rounded-[26px] border p-5 transition ${toneWrapperClassName} ${
        isExpanded ? "ring-1 ring-white/10" : ""
      }`}
    >
      <span className={`absolute inset-y-0 left-0 w-1.5 ${railClassName}`} aria-hidden="true" />

      <div className="ml-2">
        <button
          type="button"
          onClick={() => setIsExpanded((current) => !current)}
          aria-expanded={isExpanded}
          className="flex w-full flex-wrap items-start justify-between gap-4 text-left"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-stone-900 px-3 py-1 text-sm font-semibold text-white">
                {timeLabel}
              </span>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClassName}`}>
                {statusLabel}
              </span>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${paymentClassName}`}>
                {paymentLabel}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2">
              <h3 className={`text-xl font-semibold tracking-tight ${titleClassName}`}>{serviceName}</h3>
              <span className="text-sm text-zinc-500">•</span>
              <p className="text-sm text-zinc-400">{barberName}</p>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-sm text-zinc-300">
              <span className="rounded-full bg-zinc-900/70 px-3 py-1">Bruto {brutoLabel}</span>
              {netoLabel ? (
                <span className="rounded-full bg-zinc-900/70 px-3 py-1">Neto {netoLabel}</span>
              ) : null}
            </div>
          </div>

          <div className="flex min-w-[170px] items-start justify-end gap-3">
            <div className="rounded-[22px] bg-zinc-950/45 px-4 py-3 text-left sm:text-right">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
                Impacto
              </p>
              <p className={`mt-2 text-2xl font-semibold tracking-tight ${amountClassName}`}>
                {impactLabel}
              </p>
              <p className="mt-1 text-sm text-zinc-400">{impactHint}</p>
            </div>
            <span className="rounded-full border border-white/12 bg-white/8 p-2 text-zinc-300">
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
              <div className="space-y-4 pt-4">
                <div className="flex flex-wrap gap-2 text-sm text-zinc-300">
                  {comisionLabel ? (
                    <span className="rounded-full bg-zinc-900/70 px-3 py-1">{comisionLabel}</span>
                  ) : null}
                  {productosLabel ? (
                    <span className="rounded-full bg-zinc-900/70 px-3 py-1">{productosLabel}</span>
                  ) : null}
                </div>

                {motivoAnulacion ? (
                  <p className={`text-sm ${noteClassName}`}>Motivo: {motivoAnulacion}</p>
                ) : null}

                {notas ? <p className={`text-sm ${noteClassName}`}>{notas}</p> : null}

                {canEdit ? (
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <Link
                      href={editHref}
                      className="neon-button inline-flex min-h-[44px] items-center justify-center rounded-2xl px-4 text-sm font-medium"
                    >
                      Editar
                    </Link>
                    {isAdmin ? (
                      <AnularButton atencionId={atencionId} anularAction={anularAction} />
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </article>
  );
}
