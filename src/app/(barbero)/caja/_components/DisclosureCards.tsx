import Link from "next/link";
import AnularButton from "@/components/caja/AnularButton";
import type { anularAtencion } from "../actions";

type MovementDisclosureCardProps = {
  timeLabel: string;
  badge: string;
  title: string;
  subtitle: string;
  detail: string;
  amountLabel: string;
  toneClassName: string;
};

type AtencionDisclosureCardProps = {
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
  anularAction: typeof anularAtencion;
};

function ChevronIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MovementDisclosureCard({
  timeLabel,
  badge,
  title,
  subtitle,
  detail,
  amountLabel,
  toneClassName,
}: MovementDisclosureCardProps) {
  return (
    <details className={`caja-disclosure rounded-[24px] border ${toneClassName}`}>
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 px-4 py-4 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-[#8cff59]/40">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-stone-950 px-3 py-1 text-xs font-semibold text-white">
              {timeLabel}
            </span>
            <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-stone-800">
              {badge}
            </span>
          </div>
          <p className="mt-3 text-lg font-semibold tracking-tight">{title}</p>
          <p className="mt-1 text-sm opacity-80">{subtitle}</p>
        </div>

        <div className="flex shrink-0 items-start gap-3">
          <div className="text-right">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] opacity-55">
              Impacto
            </p>
            <p className="mt-2 text-xl font-semibold tracking-tight">{amountLabel}</p>
          </div>
          <span className="caja-chevron rounded-full border border-white/10 bg-white/5 p-2 text-zinc-300">
            <ChevronIcon />
          </span>
        </div>
      </summary>

      <div className="caja-panel px-4 pb-4">
        <div className="caja-panel-inner">
          <div className="rounded-[20px] border border-white/8 bg-black/20 px-4 py-3 text-sm leading-6 opacity-85">
            {detail}
          </div>
        </div>
      </div>
    </details>
  );
}

export function AtencionDisclosureCard({
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
}: AtencionDisclosureCardProps) {
  return (
    <details
      className={`caja-disclosure relative overflow-hidden rounded-[26px] border ${toneWrapperClassName}`}
    >
      <span className={`absolute inset-y-0 left-0 w-1.5 ${railClassName}`} aria-hidden="true" />

      <summary className="ml-2 flex cursor-pointer list-none flex-wrap items-start justify-between gap-4 px-5 py-5 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-[#8cff59]/40">
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

          <h3 className={`mt-4 text-xl font-semibold tracking-tight ${titleClassName}`}>
            {serviceName}
          </h3>
          <p className="mt-1 text-sm text-zinc-400">{barberName}</p>
        </div>

        <div className="flex min-w-[170px] items-start justify-end gap-3">
          <div className="rounded-[22px] bg-zinc-950/45 px-4 py-3 text-left sm:text-right">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-400">
              Impacto
            </p>
            <p className={`mt-2 text-2xl font-semibold tracking-tight ${amountClassName}`}>
              {impactLabel}
            </p>
            <p className="mt-1 text-sm text-zinc-400">{impactHint}</p>
          </div>
          <span className="caja-chevron rounded-full border border-white/10 bg-white/5 p-2 text-zinc-300">
            <ChevronIcon />
          </span>
        </div>
      </summary>

      <div className="caja-panel ml-2 px-5 pb-5">
        <div className="caja-panel-inner">
          <div className="space-y-4 border-t border-white/8 pt-4">
            <div className="flex flex-wrap gap-2 text-sm text-zinc-300">
              <span className="rounded-full bg-zinc-900/70 px-3 py-1">Bruto {brutoLabel}</span>
              {netoLabel ? (
                <span className="rounded-full bg-zinc-900/70 px-3 py-1">Neto {netoLabel}</span>
              ) : null}
              {comisionLabel ? (
                <span className="rounded-full bg-zinc-900/70 px-3 py-1">{comisionLabel}</span>
              ) : null}
              {productosLabel ? (
                <span className="rounded-full bg-zinc-900/70 px-3 py-1">{productosLabel}</span>
              ) : null}
            </div>

            {motivoAnulacion ? (
              <div
                className={`rounded-[20px] border border-white/8 bg-black/15 px-4 py-3 text-sm ${noteClassName}`}
              >
                <span className="block text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                  Motivo
                </span>
                <p className="mt-2 leading-6">{motivoAnulacion}</p>
              </div>
            ) : null}

            {notas ? (
              <div
                className={`rounded-[20px] border border-white/8 bg-black/15 px-4 py-3 text-sm ${noteClassName}`}
              >
                <span className="block text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                  Notas
                </span>
                <p className="mt-2 leading-6">{notas}</p>
              </div>
            ) : null}

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
    </details>
  );
}
