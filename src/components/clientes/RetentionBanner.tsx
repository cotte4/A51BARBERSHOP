"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ClientSummary } from "@/lib/types";

const STORAGE_KEY = "a51_retention_dismissed";

type RetentionBannerProps = {
  candidates: ClientSummary[];
};

export default function RetentionBanner({ candidates }: RetentionBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem(STORAGE_KEY);
    if (!dismissed && candidates.length > 0) {
      setVisible(true);
    }
  }, [candidates.length]);

  if (!visible || candidates.length === 0) {
    return null;
  }

  function dismiss() {
    sessionStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  return (
    <div className="rounded-3xl border border-amber-500/35 bg-[linear-gradient(135deg,rgba(245,158,11,0.12),rgba(217,70,239,0.08))] p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-amber-300">
            Senal de reenganche en la orbita Marciano
          </p>
          <p className="mt-1 text-xs text-zinc-300">
            {candidates.length} cliente{candidates.length !== 1 ? "s" : ""} en riesgo de no volver.
          </p>
        </div>
        <button
          onClick={dismiss}
          aria-label="Cerrar aviso"
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-amber-300 hover:bg-amber-500/10"
        >
          ×
        </button>
      </div>

      <ul className="mt-4 space-y-2">
        {candidates.map((client) => {
          const daysSince = client.lastVisitAt
            ? Math.floor((Date.now() - new Date(client.lastVisitAt).getTime()) / (1000 * 60 * 60 * 24))
            : null;

          return (
            <li key={client.id}>
              <Link
                href={`/clientes/${client.id}`}
                className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-zinc-950/40 px-4 py-3 text-sm hover:border-amber-400/55"
              >
                <span className="font-medium text-white">{client.name}</span>
                <span className="text-xs text-amber-300">
                  {daysSince !== null ? `${daysSince} dias` : "Sin fecha"}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
