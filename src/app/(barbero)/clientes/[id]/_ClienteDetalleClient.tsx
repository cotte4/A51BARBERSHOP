"use client";

import { useState } from "react";
import type { ReactNode } from "react";

export default function ClienteDetalleClient({
  perfilContent,
  historialContent,
  notasContent,
}: {
  perfilContent: ReactNode;
  historialContent: ReactNode;
  notasContent: ReactNode;
}) {
  const [tab, setTab] = useState<"perfil" | "historial" | "notas">("perfil");

  return (
    <div className="space-y-5">
      <div className="flex gap-1 rounded-[20px] border border-zinc-800 bg-zinc-900/60 p-1">
        {(["perfil", "historial", "notas"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-[16px] py-2 text-sm font-medium capitalize transition ${
              tab === t ? "bg-[#8cff59] text-[#07130a]" : "text-zinc-400 hover:text-white"
            }`}
          >
            {t === "notas" ? "Notas" : t === "historial" ? "Historial" : "Perfil"}
          </button>
        ))}
      </div>

      {tab === "perfil" && perfilContent}
      {tab === "historial" && historialContent}
      {tab === "notas" && notasContent}
    </div>
  );
}
