"use client";

import { useState, useEffect, useTransition } from "react";
import { MARCIANO_COLORS } from "@/lib/marciano-colors";
import { AVATAR_PRESETS } from "@/lib/marciano-avatar-presets";
import type { AvatarPreset } from "@/lib/marciano-avatar-presets";
import { saveFavoriteColorAction } from "../_AvatarCard.actions";

const PRESET_ORDER: AvatarPreset[] = ["galactic", "elf", "demon", "android", "cosmic", "orc"];
const PRESET_STORAGE_KEY = "marciano-avatar-preset";

function PresetGrid({
  selected,
  onSelect,
}: {
  selected: AvatarPreset;
  onSelect: (p: AvatarPreset) => void;
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
              onClick={() => onSelect(key)}
              className={[
                "flex flex-col items-start rounded-2xl border px-3 py-2.5 text-left transition-all duration-150 hover:bg-white/5",
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

function ColorGrid({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (slug: string) => void;
}) {
  const selectedColor = selected
    ? (MARCIANO_COLORS.find((c) => c.slug === selected) ?? null)
    : null;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs font-medium text-zinc-400">Color de piel</p>
      <div className="grid grid-cols-8 gap-2">
        {MARCIANO_COLORS.map((c) => {
          const isSelected = selected === c.slug;
          return (
            <button
              key={c.slug}
              type="button"
              onClick={() => onSelect(c.slug)}
              aria-label={c.nombre}
              aria-pressed={isSelected}
              title={c.nombre}
              className={[
                "relative aspect-square rounded-2xl transition-all duration-200 flex items-center justify-center hover:scale-105",
                isSelected
                  ? "ring-2 ring-[#8cff59] ring-offset-2 ring-offset-zinc-900 scale-110 shadow-[0_0_16px_rgba(140,255,89,0.45)]"
                  : "ring-1 ring-white/10",
              ].join(" ")}
              style={{ backgroundColor: c.hex }}
            >
              {isSelected && (
                <svg viewBox="0 0 24 24" className="h-4 w-4 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
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
            <span className="h-4 w-4 rounded-full ring-1 ring-white/20" style={{ backgroundColor: selectedColor.hex }} />
            <span className="font-medium capitalize text-white">{selectedColor.nombre}</span>
          </span>
        ) : (
          <span className="text-zinc-600">ninguno</span>
        )}
      </div>
    </div>
  );
}

export default function AvatarConfigCard({
  favoriteColor,
}: {
  favoriteColor: string | null;
}) {
  const [selectedPreset, setSelectedPreset] = useState<AvatarPreset>("galactic");
  const [selectedSlug, setSelectedSlug] = useState<string | null>(favoriteColor);
  const [saved, setSaved] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const stored = localStorage.getItem(PRESET_STORAGE_KEY) as AvatarPreset | null;
    if (stored && stored in AVATAR_PRESETS) setSelectedPreset(stored);
  }, []);

  function handlePresetSelect(p: AvatarPreset) {
    setSelectedPreset(p);
    setSaved(false);
  }

  function handleColorSelect(slug: string) {
    setSelectedSlug(slug);
    setSaved(false);
    startTransition(async () => {
      await saveFavoriteColorAction(slug);
    });
  }

  function handleSave() {
    localStorage.setItem(PRESET_STORAGE_KEY, selectedPreset);
    setSaved(true);
  }

  return (
    <div className="panel-card rounded-[28px] p-5 space-y-5">
      <div>
        <p className="eyebrow text-xs text-zinc-500">Configuración de Avatar</p>
        <p className="mt-1 text-sm text-zinc-400">
          Elegí tu clase alien y tu color. Se usan al generar tu avatar.
        </p>
      </div>

      <PresetGrid selected={selectedPreset} onSelect={handlePresetSelect} />
      <ColorGrid selected={selectedSlug} onSelect={handleColorSelect} />

      <button
        type="button"
        onClick={handleSave}
        className="neon-button w-full rounded-[20px] px-4 py-3 text-sm font-semibold"
      >
        {saved ? "✓ Guardado" : "Guardar configuración"}
      </button>
    </div>
  );
}
