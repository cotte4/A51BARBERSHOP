"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import {
  loadFaceLandmarker,
  detectLandmarksFromVideo,
  computeFaceMetrics,
  averageMetrics,
  checkFaceAlignment,
  type AlignmentStatus,
} from "@/lib/marciano-face-landmarks";
import { classifyFaceShape } from "@/lib/marciano-style";
import { classifyFaceWithAI } from "./actions";
import { playSound } from "@/lib/marciano-sounds";
import type { FaceShape } from "@/lib/types";
import type { FaceMetrics } from "@/lib/marciano-style";

// Number of frames to average for stable metrics
const SAMPLE_FRAMES = 5;
const SAMPLE_INTERVAL_MS = 150;

// Capture current video frame as base64 JPEG (client-side only)
function captureFrameAsBase64(video: HTMLVideoElement, quality = 0.75): string {
  const canvas = document.createElement("canvas");
  canvas.width = 320;
  canvas.height = 240;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.drawImage(video, 0, 0, 320, 240);
  return canvas.toDataURL("image/jpeg", quality).split(",")[1] ?? "";
}

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
  const previewTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const landmarkerRef = useRef<unknown>(null);

  const [state, setState] = useState<CaptureState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [loadingMsg, setLoadingMsg] = useState<string>("");
  const [alignment, setAlignment] = useState<AlignmentStatus>("no_face");
  const [sampleProgress, setSampleProgress] = useState(0); // 0–SAMPLE_FRAMES during analyzing
  const [aiStatus, setAiStatus] = useState<"idle" | "running" | "agree" | "differ" | "failed">("idle");

  // Start live alignment preview loop once streaming
  const startPreviewLoop = useCallback(() => {
    if (previewTimerRef.current) return;
    previewTimerRef.current = setInterval(async () => {
      if (!videoRef.current || !landmarkerRef.current) return;
      const lms = await detectLandmarksFromVideo(videoRef.current, landmarkerRef.current);
      setAlignment(lms ? checkFaceAlignment(lms) : "no_face");
    }, 250);
  }, []);

  const stopPreviewLoop = useCallback(() => {
    if (previewTimerRef.current) {
      clearInterval(previewTimerRef.current);
      previewTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (state === "streaming" && videoRef.current && streamRef.current) {
      const video = videoRef.current;
      video.srcObject = streamRef.current;
      video.play().catch(() => {
        // autoplay blocked — muted+playsInline should prevent this,
        // but catch silently; user can still tap Capturar
      });
      // Pre-load the landmarker in the background so capture is instant
      loadFaceLandmarker().then(lm => {
        landmarkerRef.current = lm;
        startPreviewLoop();
      });
    }
    if (state !== "streaming") {
      stopPreviewLoop();
    }
  }, [state, startPreviewLoop, stopPreviewLoop]);

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
    stopPreviewLoop();
    setState("analyzing");
    playSound("capture");
    setSampleProgress(0);
    setAiStatus("idle");

    try {
      const video = videoRef.current;

      // Use pre-loaded landmarker if available, otherwise load with timeout
      let landmarker = landmarkerRef.current;
      if (!landmarker) {
        setLoadingMsg("Preparando el analizador de rostro...");
        landmarker = await Promise.race([
          loadFaceLandmarker(),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 15000)),
        ]).catch(() => null);
      }

      if (!landmarker) {
        stopCamera();
        setState("error");
        setError("No pudimos cargar el analizador. Podés continuar sin análisis facial.");
        return;
      }

      // Wait for video to have frame data
      if (video.readyState < 2) {
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error("video timeout")), 5000);
          video.addEventListener("canplay", () => { clearTimeout(timeout); resolve(); }, { once: true });
        }).catch(() => null);
      }

      // Capture a frame for AI analysis before the geometric loop starts
      const frameBase64 = captureFrameAsBase64(video);

      // Launch AI classification in parallel (fire-and-forget, won't block geometric)
      setAiStatus("running");
      const aiPromise: Promise<{ shape: ReturnType<typeof classifyFaceShape> | null }> =
        frameBase64
          ? classifyFaceWithAI(frameBase64).then(s => ({ shape: s })).catch(() => ({ shape: null }))
          : Promise.resolve({ shape: null });

      // Multi-frame geometric sampling
      setLoadingMsg("Analizando tu rostro...");
      const samples: FaceMetrics[] = [];
      for (let i = 0; i < SAMPLE_FRAMES; i++) {
        const lms = await detectLandmarksFromVideo(video, landmarker);
        if (lms) {
          samples.push(computeFaceMetrics(lms));
          setSampleProgress(i + 1);
        }
        if (i < SAMPLE_FRAMES - 1) {
          await new Promise(r => setTimeout(r, SAMPLE_INTERVAL_MS));
        }
      }

      if (samples.length === 0) {
        stopCamera();
        setState("error");
        setError("No detectamos tu rostro. Asegurate de estar frente a la cámara.");
        return;
      }

      const metrics = samples.length > 1 ? averageMetrics(samples) : samples[0];
      const geoShape = classifyFaceShape(metrics);

      setLoadingMsg("Validando con IA...");

      // Wait for AI result (usually ready by now since geometric took ~1s)
      const { shape: aiShape } = await aiPromise;

      let finalShape = geoShape;
      if (aiShape) {
        if (aiShape === geoShape) {
          setAiStatus("agree");
        } else {
          // AI and geometry disagree — trust AI (vision > geometry for this task)
          setAiStatus("differ");
          finalShape = aiShape;
        }
      } else {
        setAiStatus("failed");
      }

      stopCamera();
      // Small pause so the user sees the AI status feedback before the reveal
      await new Promise(r => setTimeout(r, 900));
      onCapture({ shape: finalShape, metrics });
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
            {/* Oval guide — color reflects alignment status */}
            <div
              className="absolute rounded-[50%] pointer-events-none transition-colors duration-300"
              style={{
                top: "10%", left: "15%", right: "15%", bottom: "10%",
                border: `4px solid ${
                  alignment === "ok"
                    ? "#8cff59"
                    : alignment === "tilt" || alignment === "offcenter"
                    ? "#f59e0b"
                    : "rgba(255,255,255,0.15)"
                }`,
              }}
            />
          </div>
          {/* Alignment status label */}
          <p className={`text-sm text-center transition-colors duration-200 ${
            alignment === "ok"
              ? "text-[#8cff59]"
              : alignment === "tilt"
              ? "text-amber-400"
              : alignment === "offcenter"
              ? "text-amber-400"
              : "text-zinc-500"
          }`}>
            {alignment === "ok" && "Perfecto, ya podés capturar"}
            {alignment === "tilt" && "Mantenés la cabeza derecha"}
            {alignment === "offcenter" && "Mirá directo a la cámara"}
            {alignment === "no_face" && "Centrá tu rostro en el óvalo"}
          </p>
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
          {aiStatus !== "agree" && aiStatus !== "differ" && <Spinner />}
          {(aiStatus === "agree" || aiStatus === "differ") && (
            <div className={`text-4xl ${aiStatus === "agree" ? "text-[#8cff59]" : "text-amber-400"}`}>
              {aiStatus === "agree" ? "✓" : "~"}
            </div>
          )}
          <p className="text-sm text-zinc-400 text-center">
            {loadingMsg || "Analizando tu rostro..."}
          </p>
          {sampleProgress > 0 && aiStatus === "idle" && (
            <div className="flex gap-1.5">
              {Array.from({ length: SAMPLE_FRAMES }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 w-6 rounded-full transition-colors duration-150 ${
                    i < sampleProgress ? "bg-[#8cff59]" : "bg-zinc-700"
                  }`}
                />
              ))}
            </div>
          )}
          {aiStatus === "running" && (
            <p className="text-xs text-zinc-500 text-center">IA validando...</p>
          )}
          {aiStatus === "agree" && (
            <p className="text-xs text-[#8cff59]/80 text-center">Geometría e IA coinciden</p>
          )}
          {aiStatus === "differ" && (
            <p className="text-xs text-amber-400/80 text-center">IA ajustó el resultado</p>
          )}
          {aiStatus === "failed" && (
            <p className="text-xs text-zinc-500 text-center">IA no disponible — usando análisis geométrico</p>
          )}
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
