"use client";

import Link from "next/link";
import { useState } from "react";
import GastoRapidoModal from "@/components/gastos-rapidos/GastoRapidoModal";
import type { GastoRapidoActionState } from "@/app/(admin)/gastos-rapidos/actions";

type GastoRapidoFABProps = {
  action: (
    prevState: GastoRapidoActionState,
    formData: FormData
  ) => Promise<GastoRapidoActionState>;
  returnTo: string;
  historyHref?: string;
  buttonLabel?: string;
  buttonClassName?: string;
  fixed?: boolean;
  showHistoryLink?: boolean;
};

export default function GastoRapidoFAB({
  action,
  returnTo,
  historyHref = "/gastos-rapidos",
  buttonLabel = "+ Gasto rapido",
  buttonClassName,
  fixed = true,
  showHistoryLink = true,
}: GastoRapidoFABProps) {
  const [open, setOpen] = useState(false);

  const wrapperClassName = fixed
    ? "fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2"
    : "flex flex-col items-start gap-3";

  const resolvedButtonClassName =
    buttonClassName ??
    (fixed
      ? "neon-button min-h-[56px] rounded-full px-5 text-sm font-semibold shadow-xl"
      : "neon-button inline-flex min-h-[52px] items-center justify-center rounded-2xl px-5 text-sm font-semibold");

  return (
    <>
      <div className={wrapperClassName}>
        {showHistoryLink ? (
          <Link
            href={historyHref}
            className="rounded-full bg-zinc-950 px-4 py-2 text-xs font-semibold text-zinc-300 shadow-lg ring-1 ring-zinc-800 transition hover:border-[#8cff59]/35 hover:text-[#8cff59]"
          >
            Ver gastos
          </Link>
        ) : null}

        <button type="button" onClick={() => setOpen(true)} className={resolvedButtonClassName}>
          {buttonLabel}
        </button>
      </div>

      {open ? (
        <GastoRapidoModal action={action} onClose={() => setOpen(false)} returnTo={returnTo} />
      ) : null}
    </>
  );
}
