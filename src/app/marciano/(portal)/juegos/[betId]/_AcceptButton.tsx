"use client";

import { useState } from "react";
import { aceptarApuestaAction } from "../actions";

export default function AcceptButton({ betId }: { betId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    setLoading(true);
    setError(null);
    const result = await aceptarApuestaAction(betId);
    if (!result.success) {
      setError(result.error);
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleAccept}
        disabled={loading}
        className="neon-button w-full rounded-[20px] py-4 text-sm font-bold disabled:opacity-50"
      >
        {loading ? "Aceptando..." : "Aceptar apuesta"}
      </button>
      {error && (
        <p className="rounded-[16px] border border-red-500/35 bg-red-500/10 px-4 py-3 text-center text-sm text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
