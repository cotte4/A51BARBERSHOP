"use client";

import { useRef, useState, useEffect } from "react";
import { loadFaceLandmarker, detectLandmarksFromVideo, computeFaceMetrics } from "@/lib/marciano-face-landmarks";
import { classifyFaceShape } from "@/lib/marciano-style";
import { playSound } from "@/lib/marciano-sounds";
import type { FaceShape } from "@/lib/types";
import type { FaceMetrics } from "@/lib/marciano-style";

type CaptureState = "idle" | "requesting" | "streaming" | "analyzing" | "error";

type FaceCaptureProps = {
  onCapture: (result: { shape: FaceShape; metrics: FaceMetrics | null } | null) => void;
};

function Spinner() {
  return (
    <svg
      className="h-8 w-8 animate-spin text-[#8cff59]"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

export default function FaceCapture({ onCapture }: FaceCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<CaptureState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [loadingMsg, setLoadingMsg] = useState<string>("");

  useEffect(() => {
    if (state === "streaming" && videoRef.current && streamRef.current) {
      const video = videoRef.current;
      video.srcObject = streamRef.current;
      video.play().catch(() => {
        // autoplay blocked — the muted+playsInline attributes should prevent this,
        // but catch silently; the user can still tap Capturar which will retry
      });
    }
  }, [state]);

  async function startCamera() {
    setState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setState("streaming");
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("denied") || msg.includes("Permission") || msg.includes("NotAllowed")) {
        setError("Permiso de cámara denegado");
      } else {
        setError("No se pudo acceder a la cámara");
      }
      setState("error");
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function handleCapture() {
    if (!videoRef.current) return;
    setState("analyzing");
    playSound("capture");

    try {
      setLoadingMsg("Preparando el analizador de rostro...");

      const landmarkerPromise = loadFaceLandmarker();
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 15000)
      );

      const landmarker = await Promise.race([landmarkerPromise, timeoutPromise]).catch(() => null);

      if (!landmarker) {
        // Fallback — treat as no detection
        stopCamera();
        setState("error");
        setError("No pudimos cargar el analizador. Podés continuar sin análisis facial.");
        return;
      }

      setLoadingMsg("Analizando tu rostro...");
      const video = videoRef.current;

      // Wait until the video has actual frame data (readyState >= HAVE_CURRENT_DATA)
      if (video.readyState < 2) {
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error("video timeout")), 5000);
          video.addEventListener("canplay", () => { clearTimeout(timeout); resolve(); }, { once: true });
        }).catch(() => null);
      }

      const landmarks = await detectLandmarksFromVideo(video, landmarker);

      if (!landmarks) {
        stopCamera();
        setState("error");
        setError("No detectamos tu rostro. Asegurate de estar frente a la cámara.");
        return;
      }

      const metrics = computeFaceMetrics(landmarks);
      const shape = classifyFaceShape(metrics);

      stopCamera();
      onCapture({ shape, metrics });
    } catch {
      stopCamera();
      setState("error");
      setError("Ocurrió un error al analizar tu rostro.");
    }
  }

  function handleSkip() {
    stopCamera();
    onCapture(null);
  }

  function handleRetry() {
    setError(null);
    setState("idle");
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center px-6 gap-6">
      {state === "idle" && (
        <>
          <p className="text-zinc-500 uppercase tracking-widest text-xs text-center">
            Análisis de rostro
          </p>
          <h2 className="font-display text-3xl sm:text-4xl text-white text-center max-w-sm">
            Vamos a conocer tu rostro
          </h2>
          <p className="text-sm text-zinc-400 text-center max-w-xs">
            Usamos tu cámara para detectar la forma de tu cara y recomendarte el corte ideal.
          </p>
          <button
            type="button"
            onClick={startCamera}
            className="neon-button rounded-[20px] px-8 py-4 font-semibold text-[#07130a]"
          >
            Activar cámara
          </button>
          <button
            type="button"
            onClick={handleSkip}
            className="text-sm text-zinc-500 hover:text-zinc-300 transition"
          >
            Continuar sin análisis facial
          </button>
        </>
      )}

      {state === "requesting" && (
        <>
          <Spinner />
          <p className="text-sm text-zinc-400">Solicitando acceso a cámara...</p>
        </>
      )}

      {/* Video element stays mounted during "analyzing" so MediaPipe can read frames */}
      {(state === "streaming" || state === "analyzing") && (
        <div className={state === "analyzing" ? "hidden" : "contents"}>
          <p className="text-zinc-500 uppercase tracking-widest text-xs text-center">
            Análisis de rostro
          </p>
          <div className="relative w-full max-w-sm aspect-[3/4] rounded-[28px] overflow-hidden bg-zinc-900">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <div
              className="absolute border-4 border-[#8cff59]/60 rounded-[50%] pointer-events-none"
              style={{ top: "10%", left: "15%", right: "15%", bottom: "10%" }}
            />
          </div>
          <p className="text-sm text-zinc-400 text-center">Centrá tu rostro en el óvalo</p>
          <button
            type="button"
            onClick={handleCapture}
            className="neon-button rounded-[20px] px-8 py-4 font-semibold text-[#07130a]"
          >
            Capturar
          </button>
          <button
            type="button"
            onClick={handleSkip}
            className="text-sm text-zinc-500 hover:text-zinc-300 transition"
          >
            Continuar sin análisis facial
          </button>
        </div>
      )}

      {state === "analyzing" && (
        <>
          <Spinner />
          <p className="text-sm text-zinc-400 text-center">{loadingMsg || "Analizando tu rostro..."}</p>
        </>
      )}

      {state === "error" && (
        <>
          <p className="text-sm text-red-400 text-center max-w-xs">{error}</p>
          <div className="flex flex-col gap-3 w-full max-w-xs">
            <button
              type="button"
              onClick={handleRetry}
              className="ghost-button rounded-[20px] px-6 py-3 font-medium"
            >
              Reintentar
            </button>
            <button
              type="button"
              onClick={handleSkip}
              className="text-sm text-zinc-500 hover:text-zinc-300 transition text-center"
            >
              Continuar sin análisis facial
            </button>
          </div>
        </>
      )}
    </div>
  );
}
