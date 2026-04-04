"use client";

import { useEffect, useRef, useState } from "react";

type TurnoLlegoDetail = {
  turnoId: string;
  clienteNombre: string;
  cancion: string | null;
};

type BridgeToast = {
  tone: "success" | "error";
  message: string;
};

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
      }, 4200);
    }

    function handleTurnoLlego(event: Event) {
      const detail = (event as CustomEvent<TurnoLlegoDetail>).detail;
      if (!detail?.cancion?.trim()) {
        return;
      }

      showToast({
        tone: "success",
        message: `Llegada enviada para ${detail.clienteNombre}. La pantalla ya puede mostrar la cancion.`,
      });
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
