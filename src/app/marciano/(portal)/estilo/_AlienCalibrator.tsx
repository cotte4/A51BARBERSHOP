"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { CALIBRATION_IMAGES, getCalibrationPair } from "@/lib/marciano-calibration-images";
import { AVATAR_PRESETS } from "@/lib/marciano-avatar-presets";
import type { AvatarPreset } from "@/lib/marciano-avatar-presets";
import type { CalibrationImage } from "@/lib/marciano-calibration-images";

type Props = { onDone: (preset: AvatarPreset) => void };

const TOTAL_ROUNDS = 5;
const ALL_PRESETS: AvatarPreset[] = ["galactic", "elf", "demon", "android", "cosmic", "orc"];
const INITIAL_SCORES: Record<AvatarPreset, number> = { galactic: 0, elf: 0, demon: 0, android: 0, cosmic: 0, orc: 0 };

function ResultScreen({ preset, onDone }: { preset: AvatarPreset; onDone: (p: AvatarPreset) => void }) {
  const data = AVATAR_PRESETS[preset];
  useEffect(() => {
    const t = setTimeout(() => onDone(preset), 2500);
    return () => clearTimeout(t);
  }, [preset, onDone]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center gap-6 px-6">
      <p className="eyebrow text-xs text-zinc-500">Tu estilo alien ideal</p>
      <div className="text-8xl">{data.emoji}</div>
      <h2 className="font-display text-4xl font-bold text-white text-center">{data.label}</h2>
      <p className="text-lg font-semibold text-[#8cff59] text-center">{data.vibe}</p>
      <p className="text-sm text-zinc-400 text-center max-w-xs mt-4">
        Pasamos a escanear tu rostro...
      </p>
    </div>
  );
}

function PairScreen({
  pair,
  eyebrow,
  onPick,
}: {
  pair: [CalibrationImage, CalibrationImage];
  eyebrow: string;
  onPick: (preset: AvatarPreset, id1: string, id2: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center px-4 gap-6">
      <p className="eyebrow text-xs text-zinc-500">{eyebrow}</p>
      <h2 className="font-display text-3xl font-bold text-white text-center">¿Cuál te llama más?</h2>

      <div className="grid grid-cols-2 gap-3 w-full max-w-md">
        {pair.map((img) => (
          <motion.button
            key={img.id}
            type="button"
            onClick={() => onPick(img.preset, pair[0].id, pair[1].id)}
            whileTap={{ scale: 0.95 }}
            className="aspect-[3/4] rounded-[22px] overflow-hidden ring-1 ring-white/10 active:ring-[#8cff59] transition-all"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt="" className="w-full h-full object-cover" loading="lazy" />
          </motion.button>
        ))}
      </div>

      <p className="text-xs text-zinc-600">Elegí intuitivamente — no pienses mucho</p>
    </div>
  );
}

export default function AlienCalibrator({ onDone }: Props) {
  const [round, setRound] = useState(0);
  const [scores, setScores] = useState<Record<AvatarPreset, number>>(INITIAL_SCORES);
  const [phase, setPhase] = useState<"rounds" | "tiebreak" | "result">("rounds");
  const [winner, setWinner] = useState<AvatarPreset | null>(null);
  const [pair, setPair] = useState<[CalibrationImage, CalibrationImage] | null>(null);
  const [tiebreakPair, setTiebreakPair] = useState<[CalibrationImage, CalibrationImage] | null>(null);
  const seenImageIds = useRef(new Set<string>());

  // Generate pair for each round
  useEffect(() => {
    if (phase !== "rounds") return;
    const p = getCalibrationPair({ seenImageIds: seenImageIds.current });
    setPair(p);
  }, [round, phase]);

  function determineWinner(nextScores: Record<AvatarPreset, number>) {
    const sorted = (Object.entries(nextScores) as [AvatarPreset, number][]).sort((a, b) => b[1] - a[1]);
    if (sorted[0][1] > sorted[1][1]) {
      setWinner(sorted[0][0]);
      setPhase("result");
    } else {
      const topTwo: [AvatarPreset, AvatarPreset] = [sorted[0][0], sorted[1][0]];
      const tb = getCalibrationPair({ forcePresets: topTwo, seenImageIds: seenImageIds.current });
      setTiebreakPair(tb);
      setPhase("tiebreak");
    }
  }

  function pick(preset: AvatarPreset, id1: string, id2: string) {
    seenImageIds.current.add(id1);
    seenImageIds.current.add(id2);
    const nextScores = { ...scores, [preset]: scores[preset] + 1 };
    setScores(nextScores);

    if (round + 1 < TOTAL_ROUNDS) {
      setRound((r) => r + 1);
    } else {
      determineWinner(nextScores);
    }
  }

  function pickTiebreak(preset: AvatarPreset) {
    setWinner(preset);
    setPhase("result");
  }

  if (phase === "result" && winner) {
    return <ResultScreen preset={winner} onDone={onDone} />;
  }

  if (phase === "tiebreak" && tiebreakPair) {
    return (
      <PairScreen
        pair={tiebreakPair}
        eyebrow="Ronda final — desempate"
        onPick={(preset) => pickTiebreak(preset)}
      />
    );
  }

  if (!pair) {
    // Loading initial pair
    return <div className="fixed inset-0 z-50 bg-black" />;
  }

  // Preload next round images (best-effort)
  const preloadPresets = ALL_PRESETS.filter((p) => !seenImageIds.current.has(p));
  const preloadUrls = CALIBRATION_IMAGES
    .filter((img) => preloadPresets.includes(img.preset) && !seenImageIds.current.has(img.id))
    .slice(0, 4)
    .map((img) => img.url);

  return (
    <>
      {preloadUrls.map((url) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={url} src={url} alt="" className="hidden" aria-hidden />
      ))}
      <PairScreen
        pair={pair}
        eyebrow={`Ronda ${round + 1} de ${TOTAL_ROUNDS}`}
        onPick={pick}
      />
    </>
  );
}
