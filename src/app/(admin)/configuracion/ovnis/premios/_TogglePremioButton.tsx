"use client";

import { useState } from "react";
import { togglePremioActivoAction } from "./actions";

interface Props {
  id: string;
  activo: boolean;
}

export default function TogglePremioButton({ id, activo }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    setLoading(true);
    await togglePremioActivoAction(id, !activo);
    setLoading(false);
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors disabled:opacity-50 ${
        activo
          ? "border border-[#8cff59]/25 bg-[#8cff59]/10 text-[#8cff59] hover:bg-[#8cff59]/20"
          : "border border-zinc-700 bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
      }`}
    >
      {loading ? "..." : activo ? "Activo" : "Inactivo"}
    </button>
  );
}
