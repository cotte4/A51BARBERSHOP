"use client";

import { useState, useTransition } from "react";
import { buildAuthUrlAsync } from "@/lib/spotify-sdk";

type SpotifyConnectButtonProps = {
  returnTo: string;
  label: string;
  className: string;
};

export default function SpotifyConnectButton({
  returnTo,
  label,
  className,
}: SpotifyConnectButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <button
        type="button"
        className={`inline-flex items-center justify-center gap-2 ${className}`}
        disabled={isPending}
        onClick={() => {
          startTransition(async () => {
            try {
              const authUrl = await buildAuthUrlAsync(returnTo);
              window.location.href = authUrl;
            } catch (nextError) {
              setError(
                nextError instanceof Error
                  ? nextError.message
                  : "No pude iniciar la conexion con Spotify.",
              );
            }
          });
        }}
      >
        {isPending && (
          <svg
            style={{ animation: "a51-spin 0.65s linear infinite" }}
            width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"
            className="shrink-0"
          >
            <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeOpacity="0.28" strokeWidth="1.8" />
            <path d="M 7 1.5 A 5.5 5.5 0 0 1 12.5 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        )}
        <span>{isPending ? "Conectando..." : label}</span>
      </button>
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </div>
  );
}
