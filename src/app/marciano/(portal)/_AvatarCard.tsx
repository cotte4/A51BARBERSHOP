"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import FaceCapture from "./estilo/_FaceCapture";
import { MARCIANO_COLORS } from "@/lib/marciano-colors";
import { AVATAR_PRESETS } from "@/lib/marciano-avatar-presets";
import type { AvatarPreset } from "@/lib/marciano-avatar-presets";
import {
  saveFavoriteColorAction,
  startAvatarGenerationAction,
  getAvatarStatusAction,
  resetAvatarAction,
} from "./_AvatarCard.actions";
import type { FaceShape } from "@/lib/types";
import type { FaceMetrics } from "@/lib/marciano-style";

type AvatarCardProps = {
  styleCompletedAt: Date | string | null;
  avatarUrl: string | null;
  favoriteColor: string | null;
  avatarStatus: "idle" | "processing" | "ready" | "failed";
  avatarErrorMessage: string | null;
};

type LocalFlow = "idle" | "scanning" | "starting-generation" | "resetting-avatar";

function ColorGrid({
  selected,
  onSelect,
  disabled,
}: {
  selected: string | null;
  onSelect: (slug: string) => void;
  disabled?: boolean;
}) {
  const selectedColor = selected ? (MARCIANO_COLORS.find((c) => c.slug === selected) ?? null) : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-8 gap-2">
        {MARCIANO_COLORS.map((c) => {
          const isSelected = selected === c.slug;
          return (
            <button
              key={c.slug}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(c.slug)}
              aria-label={c.nombre}
              aria-pressed={isSelected}
              title={c.nombre}
              className={[
                "relative aspect-square rounded-2xl transition-all duration-200 flex items-center justify-center",
                disabled ? "opacity-30 cursor-not-allowed" : "hover:scale-105",
                isSelected
                  ? "ring-2 ring-[#8cff59] ring-offset-2 ring-offset-zinc-900 scale-110 shadow-[0_0_16px_rgba(140,255,89,0.45)]"
                  : "ring-1 ring-white/10",
              ].join(" ")}
              style={{ backgroundColor: c.hex }}
            >
              {isSelected && (
                <svg viewBox="0 0 24 24" className="h-4 w-4 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span className="text-zinc-500">Elegido:</span>
        {selectedColor ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 rounded-full ring-1 ring-white/20" style={{ backgroundColor: selectedColor.hex }} aria-hidden="true" />
            <span className="font-medium capitalize text-white">{selectedColor.nombre}</span>
          </span>
        ) : (
          <span className="text-zinc-600">ninguno</span>
        )}
      </div>
    </div>
  );
}

const PRESET_ORDER: AvatarPreset[] = ["galactic", "elf", "demon", "android", "cosmic", "orc"];

function PresetGrid({
  selected,
  onSelect,
  disabled,
}: {
  selected: AvatarPreset;
  onSelect: (p: AvatarPreset) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium text-zinc-400">Clase de avatar</p>
      <div className="grid grid-cols-2 gap-2">
        {PRESET_ORDER.map((key) => {
          const p = AVATAR_PRESETS[key];
          const isSelected = selected === key;
          return (
            <button
              key={key}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(key)}
              className={[
                "flex flex-col items-start rounded-2xl border px-3 py-2.5 text-left transition-all duration-150",
                disabled ? "cursor-not-allowed opacity-30" : "hover:bg-white/5",
                isSelected
                  ? "border-[#8cff59]/60 bg-[#8cff59]/10 shadow-[0_0_12px_rgba(140,255,89,0.15)]"
                  : "border-zinc-700/60 bg-zinc-900/60",
              ].join(" ")}
            >
              <span className={`text-xs font-semibold ${isSelected ? "text-[#8cff59]" : "text-white"}`}>{p.label}</span>
              <span className="text-[11px] text-zinc-500">{p.vibe}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="h-8 w-8 animate-spin text-[#8cff59]" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export default function AvatarCard({
  styleCompletedAt,
  avatarUrl,
  favoriteColor,
  avatarStatus,
  avatarErrorMessage,
}: AvatarCardProps) {
  const router = useRouter();
  const [selectedSlug, setSelectedSlug] = useState<string | null>(favoriteColor);
  const [selectedPreset, setSelectedPreset] = useState<AvatarPreset>("galactic");
  const [localFlow, setLocalFlow] = useState<LocalFlow>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [, startTransition] = useTransition();

  // Read saved crop from localStorage to apply on the avatar display
  const [crop, setCrop] = useState<{ zoom: number; x: number; y: number }>({ zoom: 1, x: 0, y: 0 });

  useEffect(() => {
    const stored = localStorage.getItem("marciano-avatar-preset") as AvatarPreset | null;
    if (stored && stored in AVATAR_PRESETS) setSelectedPreset(stored);
  }, []);

  useEffect(() => {
    if (!avatarUrl) return;
    const saved = localStorage.getItem(`avatar-crop:${avatarUrl}`);
    if (saved) {
      try {
        const { zoom: z, x, y } = JSON.parse(saved);
        setCrop({ zoom: z ?? 1, x: x ?? 0, y: y ?? 0 });
      } catch { /* ignore */ }
    }
  }, [avatarUrl]);

  const locked = styleCompletedAt === null;
  const hasAvatar = avatarStatus === "ready" && avatarUrl !== null;
  const showingProcessing = localFlow === "starting-generation" || avatarStatus === "processing";
  const showingResetting = localFlow === "resetting-avatar";

  useEffect(() => {
    if (avatarStatus === "idle" && localFlow === "resetting-avatar") { setLocalFlow("idle"); return; }
    if (avatarStatus === "processing" || avatarStatus === "ready" || avatarStatus === "failed") setLocalFlow("idle");
  }, [avatarStatus, localFlow]);

  useEffect(() => {
    if (avatarStatus !== "processing" || !showingProcessing) return;
    const poll = async () => {
      const snap = await getAvatarStatusAction();
      if (snap.status === "ready" || snap.status === "failed") router.push("/marciano");
    };
    const first = setTimeout(poll, 800);
    const interval = setInterval(poll, 3500);
    return () => { clearTimeout(first); clearInterval(interval); };
  }, [avatarStatus, router, showingProcessing]);

  function handleSelectColor(slug: string) {
    setSelectedSlug(slug);
    startTransition(async () => { await saveFavoriteColorAction(slug); });
  }

  async function handleCapture(
    result: { shape: FaceShape; metrics: FaceMetrics | null; frameBase64: string | null } | null
  ) {
    const frameBase64 = result?.frameBase64 ?? null;
    const faceShape = result?.shape ?? "oval";
    if (!frameBase64) { setErrorMsg("No se capturó el rostro. Intentá de nuevo."); return; }
    if (!selectedSlug) { setErrorMsg("Elegí un color primero."); return; }
    setErrorMsg(null);
    setLocalFlow("starting-generation");
    const res = await startAvatarGenerationAction({ frameBase64, faceShape, colorSlug: selectedSlug, preset: selectedPreset });
    if (!res.success) { setLocalFlow("idle"); setErrorMsg(res.error); return; }
    router.refresh();
  }

  async function handleReset() {
    setResetting(true);
    setLocalFlow("resetting-avatar");
    setErrorMsg(null);
    const res = await resetAvatarAction();
    setResetting(false);
    if (!res.success) { setLocalFlow("idle"); setErrorMsg(res.error); return; }
    router.refresh();
  }

  if (localFlow === "scanning") return <FaceCapture onCapture={handleCapture} />;

  if (showingResetting) {
    return (
      <section className="panel-card rounded-[28px] p-5 flex min-h-[220px] flex-col items-center justify-center gap-4">
        <p className="eyebrow text-xs self-start">Tu Avatar Marciano</p>
        <Spinner />
        <p className="text-sm font-medium text-zinc-300">Preparando nuevo scan...</p>
      </section>
    );
  }

  if (showingProcessing) {
    return (
      <section className="panel-card rounded-[28px] p-5 flex min-h-[220px] flex-col items-center justify-center gap-4">
        <p className="eyebrow text-xs self-start">Tu Avatar Marciano</p>
        <Spinner />
        <p className="text-sm font-medium text-zinc-300">Alienizándote...</p>
        <p className="text-xs text-zinc-500 text-center max-w-[240px]">Estamos transformando tu rostro. Tarda 2–3 minutos.</p>
        <button type="button" onClick={handleReset} className="ghost-button rounded-[20px] px-4 py-2 text-sm font-medium">
          Cancelar
        </button>
      </section>
    );
  }

  if (avatarStatus === "failed") {
    return (
      <section className="panel-card rounded-[28px] p-5 flex flex-col gap-4">
        <p className="eyebrow text-xs">Tu Avatar Marciano</p>
        <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {avatarErrorMessage ?? "No pudimos generar tu avatar."}
        </p>
        <button type="button" disabled={resetting} onClick={handleReset} className="neon-button rounded-[20px] px-4 py-3 text-sm font-semibold disabled:opacity-40">
          {resetting ? "Limpiando..." : "Intentar de nuevo"}
        </button>
      </section>
    );
  }

  if (hasAvatar) {
    return (
      <section className="panel-card rounded-[28px] p-5 flex flex-col items-center gap-4">
        <p className="eyebrow text-xs text-[#8cff59] self-start">Tu Avatar Marciano</p>
        <div className="relative h-40 w-40 overflow-hidden rounded-full border-2 border-[#8cff59]/40 shadow-[0_0_24px_rgba(140,255,89,0.2)] bg-zinc-900 select-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={avatarUrl}
            src={avatarUrl}
            alt="Avatar Marciano"
            draggable={false}
            className="h-full w-full object-cover opacity-0"
            style={{ transform: `translate(${crop.x}px, ${crop.y}px) scale(${crop.zoom})`, transformOrigin: "center center", transition: "transform 0.15s ease" }}
            onLoad={(e) => { (e.currentTarget as HTMLImageElement).classList.replace("opacity-0", "opacity-100"); }}
          />
        </div>
        <Link href="/marciano/estilo" className="text-xs text-zinc-500 hover:text-[#8cff59] transition-colors">
          Ajustar en Mi Estilo →
        </Link>
      </section>
    );
  }

  if (locked) {
    return (
      <section className="panel-card rounded-[28px] p-5 flex flex-col gap-4">
        <div>
          <p className="eyebrow text-xs">Tu Avatar Marciano</p>
          <p className="mt-2 text-sm text-zinc-400">Completá el cuestionario de estilo para desbloquearlo.</p>
        </div>
        <PresetGrid disabled selected={selectedPreset} onSelect={() => {}} />
        <ColorGrid disabled selected={selectedSlug} onSelect={() => {}} />
        <Link href="/marciano/estilo" className="neon-button rounded-[20px] px-4 py-3 text-center text-sm font-semibold">
          Completar cuestionario
        </Link>
      </section>
    );
  }

  return (
    <section className="panel-card rounded-[28px] p-5 flex flex-col gap-4">
      <div>
        <p className="eyebrow text-xs">Tu Avatar Marciano</p>
        <p className="mt-1 text-sm text-zinc-400">Elegí tu clase y tu color.</p>
      </div>
      <PresetGrid selected={selectedPreset} onSelect={setSelectedPreset} />
      <ColorGrid selected={selectedSlug} onSelect={handleSelectColor} />
      {errorMsg && (
        <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{errorMsg}</p>
      )}
      <button
        type="button"
        disabled={!selectedSlug}
        onClick={() => { setErrorMsg(null); setLocalFlow("scanning"); }}
        className="neon-button rounded-[20px] px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
      >
        Escanear rostro y generar
      </button>
    </section>
  );
}
