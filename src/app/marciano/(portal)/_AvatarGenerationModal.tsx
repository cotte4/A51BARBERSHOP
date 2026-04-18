"use client";

import { useState, useEffect, useTransition } from "react";
import Modal from "@/components/ui/Modal";
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

type Props = {
  favoriteColor: string | null;
  onClose: () => void;
  onComplete: () => void;
};

type FlowState = "config" | "scanning" | "starting" | "processing";

// ---------------------------------------------------------------------------
// Sub-components (only used here)
// ---------------------------------------------------------------------------

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
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
                  fill="none"
                  stroke="white"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
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
            <span
              className="h-4 w-4 rounded-full ring-1 ring-white/20"
              style={{ backgroundColor: selectedColor.hex }}
              aria-hidden="true"
            />
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
              <span className={`text-xs font-semibold ${isSelected ? "text-[#8cff59]" : "text-white"}`}>
                {p.label}
              </span>
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

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function AvatarGenerationModal({ favoriteColor, onClose, onComplete }: Props) {
  const [flowState, setFlowState] = useState<FlowState>("config");
  const [selectedSlug, setSelectedSlug] = useState<string | null>(favoriteColor);
  const [selectedPreset, setSelectedPreset] = useState<AvatarPreset>("galactic");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [, startTransition] = useTransition();

  // Restore preset from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("marciano-avatar-preset") as AvatarPreset | null;
    if (stored && stored in AVATAR_PRESETS) setSelectedPreset(stored);
  }, []);

  // Persist preset selection
  function handleSelectPreset(p: AvatarPreset) {
    setSelectedPreset(p);
    localStorage.setItem("marciano-avatar-preset", p);
  }

  function handleSelectColor(slug: string) {
    setSelectedSlug(slug);
    startTransition(async () => {
      await saveFavoriteColorAction(slug);
    });
  }

  // Poll while processing
  useEffect(() => {
    if (flowState !== "processing") return;
    const poll = async () => {
      const snap = await getAvatarStatusAction();
      if (snap.status === "ready" || snap.status === "failed") {
        onComplete();
        onClose();
      }
    };
    const first = setTimeout(poll, 800);
    const interval = setInterval(poll, 3500);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [flowState, onComplete, onClose]);

  async function handleCapture(
    result: { shape: FaceShape; metrics: FaceMetrics | null; frameBase64: string | null } | null
  ) {
    const frameBase64 = result?.frameBase64 ?? null;
    const faceShape = result?.shape ?? "oval";
    if (!frameBase64) {
      setErrorMsg("No se capturó el rostro. Intentá de nuevo.");
      setFlowState("config");
      return;
    }
    if (!selectedSlug) {
      setErrorMsg("Elegí un color primero.");
      setFlowState("config");
      return;
    }
    setErrorMsg(null);
    setFlowState("starting");
    const res = await startAvatarGenerationAction({
      frameBase64,
      faceShape,
      colorSlug: selectedSlug,
      preset: selectedPreset,
    });
    if (!res.success) {
      setFlowState("config");
      setErrorMsg(res.error);
      return;
    }
    setFlowState("processing");
  }

  async function handleCancel() {
    setCancelling(true);
    await resetAvatarAction();
    setCancelling(false);
    onClose();
  }

  // FaceCapture is full-screen — render outside the Modal so it overlays everything
  if (flowState === "scanning") {
    return <FaceCapture onCapture={handleCapture} />;
  }

  return (
    <Modal onClose={onClose}>
      {flowState === "config" && (
        <div className="flex flex-col gap-5 pb-2">
          <div>
            <p className="eyebrow text-xs">Generar Avatar Marciano</p>
            <p className="mt-1 text-sm text-zinc-400">Elegí tu clase y tu color favorito.</p>
          </div>

          <PresetGrid selected={selectedPreset} onSelect={handleSelectPreset} />
          <ColorGrid selected={selectedSlug} onSelect={handleSelectColor} />

          {errorMsg && (
            <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {errorMsg}
            </p>
          )}

          <button
            type="button"
            disabled={!selectedSlug}
            onClick={() => {
              setErrorMsg(null);
              setFlowState("scanning");
            }}
            className="neon-button rounded-[20px] px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
          >
            Escanear rostro y generar
          </button>
        </div>
      )}

      {flowState === "starting" && (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 py-6">
          <Spinner />
          <p className="text-sm font-medium text-zinc-300">Iniciando generación...</p>
        </div>
      )}

      {flowState === "processing" && (
        <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 py-6">
          <Spinner />
          <p className="text-sm font-medium text-zinc-300">Alienizándote...</p>
          <p className="text-xs text-zinc-500 text-center max-w-[240px]">
            Estamos transformando tu rostro. Tarda 2–3 minutos.
          </p>
          <button
            type="button"
            disabled={cancelling}
            onClick={handleCancel}
            className="ghost-button rounded-[20px] px-4 py-2 text-sm font-medium disabled:opacity-40"
          >
            {cancelling ? "Cancelando..." : "Cancelar"}
          </button>
        </div>
      )}
    </Modal>
  );
}
