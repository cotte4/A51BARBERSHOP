"use client";

import { useEffect, useRef, useState } from "react";
import { playTrack, searchTracks, SpotifyApiError } from "@/lib/spotify-api";
import { getSpotifySessionSnapshot, setSpotifyTokens } from "@/lib/spotify-session";

type TurnoLlegoDetail = {
  turnoId: string;
  clienteNombre: string;
  cancion: string | null;
  spotifyTrackUri?: string | null;
};

type BridgeToast = {
  tone: "success" | "error";
  message: string;
};

async function refreshSpotifyAccessToken(refreshToken: string): Promise<string | null> {
  const response = await fetch("/api/spotify/refresh", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    accessToken: string;
    expiresIn?: number;
    refreshToken?: string;
  };

  setSpotifyTokens({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken ?? refreshToken,
    expiresInSeconds: data.expiresIn,
  });

  return data.accessToken;
}

function mapSpotifyError(error: unknown): string {
  if (error instanceof SpotifyApiError) {
    if (error.status === 403) return "Spotify Premium es obligatorio para reproducir en el local.";
    if (error.status === 404) return "No encontramos el device compartido de Spotify.";
    if (error.status === 429) return "Spotify esta pidiendo esperar un poco antes de reintentar.";
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "No pude disparar la musica del local.";
}

export default function TurnosSpotifyBridge() {
  const [toast, setToast] = useState<BridgeToast | null>(null);
  const hideTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    function showToast(nextToast: BridgeToast) {
      setToast(nextToast);
      if (hideTimeoutRef.current) {
        window.clearTimeout(hideTimeoutRef.current);
      }
      hideTimeoutRef.current = window.setTimeout(() => {
        setToast(null);
      }, 4800);
    }

    async function handleTurnoLlego(event: Event) {
      const detail = (event as CustomEvent<TurnoLlegoDetail>).detail;
      if (!detail?.cancion?.trim()) {
        return;
      }

      const session = getSpotifySessionSnapshot();
      const deviceId = session.selectedDeviceId;

      if (!deviceId) {
        showToast({
          tone: "error",
          message: "Llego enviado, pero falta elegir el device compartido en Musica.",
        });
        return;
      }

      let accessToken = session.accessToken;
      if (!accessToken && session.refreshToken) {
        accessToken = await refreshSpotifyAccessToken(session.refreshToken);
      }

      if (!accessToken) {
        showToast({
          tone: "error",
          message: "Llego enviado, pero Spotify no esta conectado en este navegador.",
        });
        return;
      }

      try {
        if (detail.spotifyTrackUri) {
          await playTrack(accessToken, {
            deviceId,
            trackUri: detail.spotifyTrackUri,
          });

          showToast({
            tone: "success",
            message: `Suena ${detail.clienteNombre} en el device compartido.`,
          });
          return;
        }

        const [track] = await searchTracks(detail.cancion, accessToken, { limit: 1 });
        if (!track) {
          showToast({
            tone: "error",
            message: `Llego enviado, pero no encontramos "${detail.cancion}" en Spotify.`,
          });
          return;
        }

        await playTrack(accessToken, {
          deviceId,
          trackUri: track.uri,
        });

        showToast({
          tone: "success",
          message: `Suena ${detail.clienteNombre} en el device compartido.`,
        });
      } catch (error) {
        showToast({
          tone: "error",
          message: mapSpotifyError(error),
        });
      }
    }

    window.addEventListener("a51:turno-llego", handleTurnoLlego as EventListener);
    return () => {
      window.removeEventListener("a51:turno-llego", handleTurnoLlego as EventListener);
      if (hideTimeoutRef.current) {
        window.clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  if (!toast) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-24 z-40 flex justify-center px-4">
      <div
        className={`max-w-md rounded-2xl border px-4 py-3 text-sm shadow-[0_20px_60px_rgba(0,0,0,0.45)] ${
          toast.tone === "success"
            ? "border-emerald-400/30 bg-emerald-500/12 text-emerald-100"
            : "border-red-400/30 bg-red-500/12 text-red-100"
        }`}
      >
        {toast.message}
      </div>
    </div>
  );
}
