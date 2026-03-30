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
  buttonLabel = "+ Gasto rápido",
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
      ? "min-h-[56px] rounded-full bg-gray-900 px-5 text-sm font-semibold text-white shadow-xl transition hover:bg-gray-700"
      : "inline-flex min-h-[52px] items-center justify-center rounded-2xl bg-gray-900 px-5 text-sm font-semibold text-white transition hover:bg-gray-700");

  return (
    <>
      <div className={wrapperClassName}>
        {showHistoryLink ? (
          <Link
            href={historyHref}
            className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-gray-600 shadow-lg ring-1 ring-gray-200 transition hover:bg-gray-50"
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
