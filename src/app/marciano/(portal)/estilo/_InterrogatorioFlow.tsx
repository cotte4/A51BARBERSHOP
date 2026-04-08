"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { saveStyleProfileAction } from "./actions";
import { playSound, toggleSoundMute, isSoundMuted } from "@/lib/marciano-sounds";
import Question from "./_Question";
import FaceCapture from "./_FaceCapture";
import StyleDNAReveal from "./_StyleDNAReveal";
import type { FaceShape, InterrogatoryAnswers, StyleProfile } from "@/lib/types";
import type { FaceMetrics } from "@/lib/marciano-style";

type FlowState = "intro" | "q1" | "q2" | "q3" | "q4" | "q5" | "face-capture" | "saving" | "reveal";

const QUESTIONS = [
  {
    key: "q1",
    eyebrow: "Pregunta 1 de 5",
    title: "Contanos cómo llegás",
    type: "choice-text" as const,
    field: "arrival" as const,
    options: [
      { value: "caminando", label: "Caminando" },
      { value: "auto", label: "En auto" },
      { value: "apurado", label: "Siempre apurado" },
      { value: "con-tiempo", label: "Con tiempo" },
    ],
  },
  {
    key: "q2",
    eyebrow: "Pregunta 2 de 5",
    title: "¿Cuánto tiempo le metés al pelo a la mañana?",
    type: "choice-text" as const,
    field: "morningMinutes" as const,
    options: [
      { value: "0", label: "0 min" },
      { value: "3", label: "3 min" },
      { value: "5", label: "5 min" },
      { value: "10", label: "10+ min" },
    ],
  },
  {
    key: "q3",
    eyebrow: "Pregunta 3 de 5",
    title: "Elegí tu ambiente",
    type: "choice-image" as const,
    field: "lifestyle" as const,
    options: [
      { value: "minimal", label: "Minimal", imageUrl: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&q=80" },
      { value: "nocturno", label: "Nocturno", imageUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80" },
      { value: "outdoor", label: "Outdoor", imageUrl: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=400&q=80" },
      { value: "formal", label: "Formal", imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80" },
    ],
  },
  {
    key: "q4",
    eyebrow: "Pregunta 4 de 5",
    title: "¿Cuándo sabés que un corte salió bien?",
    type: "choice-text" as const,
    field: "perfectCut" as const,
    options: [
      { value: "otros-notan", label: "Cuando otros lo notan" },
      { value: "lo-siento", label: "Cuando vos lo sentís" },
      { value: "dura-semanas", label: "Cuando dura semanas" },
    ],
  },
  {
    key: "q5",
    eyebrow: "Pregunta 5 de 5",
    title: "¿Qué te le baja?",
    type: "choice-text" as const,
    field: "turnoff" as const,
    options: [
      { value: "musica-boluda", label: "Música boluda" },
      { value: "gente-de-mas", label: "Gente de más" },
      { value: "apuro", label: "Que te apuren" },
      { value: "charla-forzada", label: "Charla forzada" },
    ],
  },
];

const FLOW_ORDER: FlowState[] = ["intro", "q1", "q2", "q3", "q4", "q5", "face-capture", "saving", "reveal"];

function nextState(current: FlowState): FlowState {
  const idx = FLOW_ORDER.indexOf(current);
  return FLOW_ORDER[Math.min(idx + 1, FLOW_ORDER.length - 1)];
}

const QUESTION_PROGRESS: Record<string, number> = {
  q1: 1, q2: 2, q3: 3, q4: 4, q5: 5,
};

function Spinner() {
  return (
    <svg className="h-8 w-8 animate-spin text-[#8cff59]" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function MuteToggle() {
  const [muted, setMuted] = useState(() => {
    if (typeof window === "undefined") return false;
    return isSoundMuted();
  });

  function handleToggle() {
    const next = toggleSoundMute();
    setMuted(next);
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={muted ? "Activar sonido" : "Silenciar"}
      className="fixed top-4 right-4 z-[60] rounded-full border border-white/10 bg-white/5 p-2 text-zinc-400 hover:text-white transition"
    >
      {muted ? (
        // Muted icon
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <line x1="23" y1="9" x2="17" y2="15" />
          <line x1="17" y1="9" x2="23" y2="15" />
        </svg>
      ) : (
        // Sound icon
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        </svg>
      )}
    </button>
  );
}

const motionProps = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.35 },
};

export default function InterrogatorioFlow({ clientName }: { clientName: string }) {
  const [flowState, setFlowState] = useState<FlowState>("intro");
  const [answers, setAnswers] = useState<Partial<InterrogatoryAnswers>>({});
  const [captureResult, setCaptureResult] = useState<{ shape: FaceShape; metrics: FaceMetrics | null } | null>(null);
  const [profile, setProfile] = useState<StyleProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleAnswer(field: keyof InterrogatoryAnswers, rawValue: string) {
    let value: InterrogatoryAnswers[typeof field];

    if (field === "morningMinutes") {
      const parsed = parseInt(rawValue, 10);
      value = (isNaN(parsed) ? 0 : parsed) as InterrogatoryAnswers["morningMinutes"];
    } else {
      value = rawValue as never;
    }

    setAnswers((prev) => ({ ...prev, [field]: value }));
    setFlowState((prev) => nextState(prev));
  }

  async function handleCapture(result: { shape: FaceShape; metrics: FaceMetrics | null } | null) {
    const shape: FaceShape = result?.shape ?? "oval";
    const metrics = result?.metrics ?? null;

    setCaptureResult(result);
    setFlowState("saving");

    const finalAnswers = answers as InterrogatoryAnswers;

    const res = await saveStyleProfileAction({ shape, answers: finalAnswers, metrics });

    if (!res.success) {
      setError(res.error);
      setFlowState("face-capture"); // go back so they can retry from capture
      return;
    }

    setProfile(res.profile);
    setFlowState("reveal");
  }

  function handleShare() {
    if (!profile) return;
    const cuts = profile.recommendedCuts.join(",");
    const shape = captureResult?.shape ?? "oval";
    const url = `${window.location.origin}/api/marciano/perfil-marciano/share/me?style=${encodeURIComponent(profile.dominantStyle)}&shape=${encodeURIComponent(shape)}&cuts=${encodeURIComponent(cuts)}&time=${profile.chairTimeMin}`;
    if (navigator.share) {
      navigator.share({ title: "Mi Perfil Marciano", url }).catch(() => {});
    } else {
      window.open(url, "_blank");
    }
  }

  // Render question screens
  if (flowState === "q1" || flowState === "q2" || flowState === "q3" || flowState === "q4" || flowState === "q5") {
    const idx = parseInt(flowState[1], 10) - 1;
    const q = QUESTIONS[idx];
    return (
      <>
        <MuteToggle />
        <AnimatePresence mode="wait">
          <motion.div key={flowState} {...motionProps} className="contents">
            <Question
              eyebrow={q.eyebrow}
              title={q.title}
              type={q.type}
              options={q.options}
              progress={QUESTION_PROGRESS[flowState]}
              onAnswer={(value) => handleAnswer(q.field, value)}
            />
          </motion.div>
        </AnimatePresence>
      </>
    );
  }

  if (flowState === "face-capture") {
    return (
      <>
        <MuteToggle />
        {error && (
          <div className="fixed top-14 left-4 right-4 z-[61] rounded-2xl border border-red-500/30 bg-red-500/12 px-4 py-3 text-sm text-red-200 text-center">
            {error}
          </div>
        )}
        <FaceCapture onCapture={handleCapture} />
      </>
    );
  }

  if (flowState === "saving") {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center gap-4">
        <MuteToggle />
        <Spinner />
        <p className="text-sm text-zinc-400">Generando tu Perfil Marciano...</p>
      </div>
    );
  }

  if (flowState === "reveal" && profile) {
    return (
      <>
        <MuteToggle />
        <StyleDNAReveal
          profile={profile}
          faceShape={captureResult?.shape ?? null}
          totalVisits={0}
          onShare={handleShare}
        />
      </>
    );
  }

  // Intro
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="intro"
        {...motionProps}
        className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center px-6 gap-6"
      >
        <MuteToggle />
        {/* A51 logo */}
        <p className="font-display text-4xl font-bold text-white tracking-tight">A51</p>
        <p className="text-zinc-500 uppercase tracking-widest text-xs text-center">
          Tu Perfil Marciano
        </p>
        <h1 className="font-display text-3xl sm:text-5xl text-white text-center max-w-md leading-tight">
          Hola {clientName}, vamos a conocerte.
        </h1>
        <p className="text-sm text-zinc-400 text-center max-w-xs">
          5 preguntas + análisis de rostro. 2 minutos.
        </p>
        <button
          type="button"
          onClick={() => setFlowState("q1")}
          className="neon-button rounded-[20px] px-10 py-4 font-semibold text-[#07130a] text-lg"
        >
          Empezar
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
