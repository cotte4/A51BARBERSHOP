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
        className={className}
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
        {isPending ? "Conectando..." : label}
      </button>
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </div>
  );
}
