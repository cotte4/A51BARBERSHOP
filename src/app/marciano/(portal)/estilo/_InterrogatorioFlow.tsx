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

type FlowState =
  | "intro"
  | "q1" | "q2" | "q3" | "q4" | "q5"
  | "q6" | "q7" | "q8" | "q9" | "q10" | "q11"
  | "color-favorito"
  | "face-capture" | "saving" | "reveal";

const QUESTIONS = [
  {
    key: "q1",
    eyebrow: "Pregunta 1 de 11",
    title: "¿Cómo llegás?",
    type: "choice-text" as const,
    field: "arrival" as const,
    options: [
      { value: "caminando", label: "A pie, sin apuro" },
      { value: "auto", label: "En auto, música a fondo" },
      { value: "apurado", label: "Tarde, como siempre" },
      { value: "con-tiempo", label: "Con tiempo de sobra" },
    ],
  },
  {
    key: "q2",
    eyebrow: "Pregunta 2 de 11",
    title: "¿Cuánto le metés al pelo antes de salir?",
    type: "choice-text" as const,
    field: "morningMinutes" as const,
    options: [
      { value: "0", label: "Nada, sale solo" },
      { value: "3", label: "3 minutos justos" },
      { value: "5", label: "5 minutos y listo" },
      { value: "10", label: "10 o más, no me apuro" },
    ],
  },
  {
    key: "q3",
    eyebrow: "Pregunta 3 de 11",
    title: "¿En qué mundo vivís?",
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
    eyebrow: "Pregunta 4 de 11",
    title: "¿Cuándo decís 'este corte estuvo'?",
    type: "choice-text" as const,
    field: "perfectCut" as const,
    options: [
      { value: "otros-notan", label: "Cuando alguien lo nota" },
      { value: "lo-siento", label: "Cuando vos lo sentís" },
      { value: "dura-semanas", label: "Cuando aguanta semanas" },
    ],
  },
  {
    key: "q5",
    eyebrow: "Pregunta 5 de 11",
    title: "¿Qué te arruina el momento?",
    type: "choice-text" as const,
    field: "turnoff" as const,
    options: [
      { value: "musica-boluda", label: "Música que no pega" },
      { value: "gente-de-mas", label: "Mucha gente" },
      { value: "apuro", label: "Que te metan presión" },
      { value: "charla-forzada", label: "Charla forzada" },
    ],
  },
  {
    key: "q6",
    eyebrow: "Pregunta 6 de 11",
    title: "¿Qué suena en tus auriculares?",
    type: "choice-text" as const,
    field: "music" as const,
    options: [
      { value: "trap", label: "Trap / RKT" },
      { value: "rock", label: "Rock" },
      { value: "reggaeton", label: "Reggaetón / Latin" },
      { value: "electronica", label: "Electrónica" },
    ],
  },
  {
    key: "q7",
    eyebrow: "Pregunta 7 de 11",
    title: "El sábado a la noche te vestís...",
    type: "choice-text" as const,
    field: "weekendStyle" as const,
    options: [
      { value: "todo-negro", label: "Todo negro, como siempre" },
      { value: "sporty", label: "Cómodo y ya" },
      { value: "como-siempre", label: "Igual que cualquier día" },
      { value: "me-armo", label: "Te armás algo" },
    ],
  },
  {
    key: "q8",
    eyebrow: "Pregunta 8 de 11",
    title: "En el sillón sos...",
    type: "choice-text" as const,
    field: "chairBehavior" as const,
    options: [
      { value: "celular", label: "Redes y celular" },
      { value: "duermo", label: "Me relajo, casi duermo" },
      { value: "hablo", label: "Hablo con el barbero" },
      { value: "miro-todo", label: "Estudio el espejo" },
    ],
  },
  {
    key: "q9",
    eyebrow: "Pregunta 9 de 11",
    title: "La barba la llevás...",
    type: "choice-text" as const,
    field: "beard" as const,
    options: [
      { value: "rapada", label: "Rasurada al ras" },
      { value: "prolija", label: "Corta y prolija" },
      { value: "descuidada", label: "Larga, que se note" },
      { value: "no-tengo", label: "Poca o nada" },
    ],
  },
  {
    key: "q10",
    eyebrow: "Pregunta 10 de 11",
    title: "Con el barbero...",
    type: "choice-text" as const,
    field: "barberTrust" as const,
    options: [
      { value: "le-explico-todo", label: "Le explicás todo" },
      { value: "le-muestro-foto", label: "Le mostrás foto" },
      { value: "confio-en-el", label: "Confiás ciegamente" },
      { value: "mitad-y-mitad", label: "Mitad y mitad" },
    ],
  },
  {
    key: "q11",
    eyebrow: "Pregunta 11 de 11",
    title: "Decinos algo que te guste MUCHO ay ay ay",
    type: "free-text" as const,
    field: "freeText" as const,
    options: [],
  },
];

const FLOW_ORDER: FlowState[] = [
  "intro",
  "q1", "q2", "q3", "q4", "q5",
  "q6", "q7", "q8", "q9", "q10", "q11",
  "color-favorito",
  "face-capture", "saving", "reveal",
];

const COLOR_QUESTION = {
  eyebrow: "Último detalle",
  title: "¿Cuál es tu color?",
  options: [
    { value: "verde neón",     label: "Verde neón",     imageUrl: "#39ff14" },
    { value: "rojo fuego",     label: "Rojo fuego",     imageUrl: "#ff2d2d" },
    { value: "azul eléctrico", label: "Azul eléctrico", imageUrl: "#0080ff" },
    { value: "violeta",        label: "Violeta",        imageUrl: "#9b30ff" },
    { value: "dorado",         label: "Dorado",         imageUrl: "#ffd700" },
    { value: "naranja",        label: "Naranja",        imageUrl: "#ff6600" },
    { value: "cyan",           label: "Cyan",           imageUrl: "#00e5ff" },
    { value: "blanco hueso",   label: "Blanco",         imageUrl: "#f0f0e8" },
  ],
};

function nextState(current: FlowState): FlowState {
  const idx = FLOW_ORDER.indexOf(current);
  return FLOW_ORDER[Math.min(idx + 1, FLOW_ORDER.length - 1)];
}

const QUESTION_PROGRESS: Record<string, number> = {
  q1: 1, q2: 2, q3: 3, q4: 4, q5: 5,
  q6: 6, q7: 7, q8: 8, q9: 9, q10: 10, q11: 11,
};

const QUESTION_KEYS = new Set(["q1","q2","q3","q4","q5","q6","q7","q8","q9","q10","q11"]);

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
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <line x1="23" y1="9" x2="17" y2="15" />
          <line x1="17" y1="9" x2="23" y2="15" />
        </svg>
      ) : (
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
  const [, setFrameBase64] = useState<string | null>(null);
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

  async function handleCapture(result: { shape: FaceShape; metrics: FaceMetrics | null; frameBase64: string | null } | null) {
    const shape: FaceShape = result?.shape ?? "oval";
    const metrics = result?.metrics ?? null;
    const frame = result?.frameBase64 ?? null;

    setCaptureResult(result ? { shape: result.shape, metrics: result.metrics } : null);
    setFrameBase64(frame);
    setFlowState("saving");

    const finalAnswers = answers as InterrogatoryAnswers;

    try {
      const res = await saveStyleProfileAction({
        shape,
        answers: finalAnswers,
        metrics,
        frameBase64: frame,
        favoriteColor: answers.favoriteColor ?? null,
      });

      if (!res.success) {
        setError(res.error);
        setFlowState("face-capture");
        return;
      }

      setProfile(res.profile);
      setFlowState("reveal");
    } catch {
      setError("No pudimos guardar tu perfil. Revisá tu conexión e intentá de nuevo.");
      setFlowState("face-capture");
    }
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
  if (QUESTION_KEYS.has(flowState)) {
    const q = QUESTIONS.find((question) => question.key === flowState)!;
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
              total={12}
              onAnswer={(value) => handleAnswer(q.field, value)}
            />
          </motion.div>
        </AnimatePresence>
      </>
    );
  }

  if (flowState === "color-favorito") {
    return (
      <>
        <MuteToggle />
        <AnimatePresence mode="wait">
          <motion.div key="color-favorito" {...motionProps} className="contents">
            <Question
              eyebrow={COLOR_QUESTION.eyebrow}
              title={COLOR_QUESTION.title}
              type="choice-color"
              options={COLOR_QUESTION.options}
              progress={12}
              total={12}
              onAnswer={(value) => {
                setAnswers((prev) => ({ ...prev, favoriteColor: value }));
                setFlowState("face-capture");
              }}
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
        <p className="text-xs text-zinc-600 text-center max-w-[220px]">
          Creando tu avatar alien. Puede tardar hasta 30 segundos.
        </p>
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
        <p className="font-display text-4xl font-bold text-white tracking-tight">A51</p>
        <p className="text-zinc-500 uppercase tracking-widest text-xs text-center">
          Tu Perfil Marciano
        </p>
        <h1 className="font-display text-3xl sm:text-5xl text-white text-center max-w-md leading-tight">
          Hola {clientName}, vamos a conocerte.
        </h1>
        <p className="text-sm text-zinc-400 text-center max-w-xs">
          12 preguntas + análisis de rostro. 3 minutos.
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
