"use client";

import { useState } from "react";
import { rechazarApuestaAction } from "../actions";

export default function RejectButton({ betId }: { betId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReject() {
    setLoading(true);
    setError(null);
    const result = await rechazarApuestaAction(betId);
    if (!result.success) {
      setError(result.error);
    }
    setLoading(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleReject}
        disabled={loading}
        className="ghost-button w-full rounded-[20px] py-3 text-sm font-semibold disabled:opacity-50"
      >
        {loading ? "Rechazando..." : "Rechazar apuesta"}
      </button>
      {error && (
        <p className="rounded-[16px] border border-red-500/35 bg-red-500/10 px-4 py-3 text-center text-sm text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
