"use client";

import { useState, useEffect, useTransition, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { MARCIANO_COLORS } from "@/lib/marciano-colors";
import { AVATAR_PRESETS } from "@/lib/marciano-avatar-presets";
import type { AvatarPreset } from "@/lib/marciano-avatar-presets";
import { saveFavoriteColorAction, resetAvatarAction, cleanAvatarAction } from "../_AvatarCard.actions";

const PRESET_ORDER: AvatarPreset[] = ["galactic", "elf", "demon", "android", "cosmic", "orc"];
const PRESET_STORAGE_KEY = "marciano-avatar-preset";

function PresetGrid({ selected, onSelect }: { selected: AvatarPreset; onSelect: (p: AvatarPreset) => void }) {
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
              <span className={`text-xs font-semibold ${isSelected ? "text-[#8cff59]" : "text-white"}`}>{p.label}</span>
              <span className="text-[11px] text-zinc-500">{p.vibe}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ColorGrid({ selected, onSelect }: { selected: string | null; onSelect: (slug: string) => void }) {
  const selectedColor = selected ? (MARCIANO_COLORS.find((c) => c.slug === selected) ?? null) : null;
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

function Spinner() {
  return (
    <svg className="h-6 w-6 animate-spin text-[#8cff59]" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

type Props = {
  favoriteColor: string | null;
  avatarUrl: string | null;
  avatarStatus: string;
};

export default function AvatarConfigCard({ favoriteColor, avatarUrl, avatarStatus }: Props) {
  const router = useRouter();
  const [selectedPreset, setSelectedPreset] = useState<AvatarPreset>("galactic");
  const [selectedSlug, setSelectedSlug] = useState<string | null>(favoriteColor);
  const [configSaved, setConfigSaved] = useState(false);

  // Zoom/pan state
  const [adjusting, setAdjusting] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);

  // Action states
  const [cleaning, setCleaning] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const hasAvatar = avatarStatus === "ready" && avatarUrl !== null;
  const isProcessing = avatarStatus === "processing";

  useEffect(() => {
    const stored = localStorage.getItem(PRESET_STORAGE_KEY) as AvatarPreset | null;
    if (stored && stored in AVATAR_PRESETS) setSelectedPreset(stored);
  }, []);

  useEffect(() => {
    if (!avatarUrl) return;
    const saved = localStorage.getItem(`avatar-crop:${avatarUrl}`);
    if (saved) {
      try {
        const { zoom: z, x, y } = JSON.parse(saved);
        setZoom(z ?? 1);
        setPan({ x: x ?? 0, y: y ?? 0 });
      } catch { /* ignore */ }
    }
  }, [avatarUrl]);

  const saveCrop = useCallback((z: number, x: number, y: number) => {
    if (!avatarUrl) return;
    localStorage.setItem(`avatar-crop:${avatarUrl}`, JSON.stringify({ zoom: z, x, y }));
  }, [avatarUrl]);

  function handleDragStart(clientX: number, clientY: number) {
    dragRef.current = { startX: clientX, startY: clientY, panX: pan.x, panY: pan.y };
  }
  function handleDragMove(clientX: number, clientY: number) {
    if (!dragRef.current) return;
    setPan({ x: dragRef.current.panX + (clientX - dragRef.current.startX), y: dragRef.current.panY + (clientY - dragRef.current.startY) });
  }
  function handleDragEnd() { dragRef.current = null; }

  function handlePresetSelect(p: AvatarPreset) {
    setSelectedPreset(p);
    setConfigSaved(false);
  }

  function handleColorSelect(slug: string) {
    setSelectedSlug(slug);
    setConfigSaved(false);
    startTransition(async () => { await saveFavoriteColorAction(slug); });
  }

  function handleSaveConfig() {
    localStorage.setItem(PRESET_STORAGE_KEY, selectedPreset);
    setConfigSaved(true);
  }

  async function handleClean() {
    setCleaning(true);
    setErrorMsg(null);
    const res = await cleanAvatarAction();
    setCleaning(false);
    if (!res.success) { setErrorMsg(res.error); return; }
    router.refresh();
  }

  async function handleRegen() {
    setResetting(true);
    setErrorMsg(null);
    const res = await resetAvatarAction();
    setResetting(false);
    if (!res.success) { setErrorMsg(res.error); setConfirmRegen(false); return; }
    setConfirmRegen(false);
    router.push("/marciano");
  }

  return (
    <div className="panel-card rounded-[28px] p-5 space-y-5">
      <div>
        <p className="eyebrow text-xs text-zinc-500">Tu Avatar Marciano</p>
        <p className="mt-1 text-sm text-zinc-400">Ajustá, limpiá o regenerá tu avatar.</p>
      </div>

      {/* Avatar display + adjust */}
      {hasAvatar && (
        <div className="flex flex-col items-center gap-3">
          <div
            className="relative h-40 w-40 overflow-hidden rounded-full border-2 border-[#8cff59]/40 shadow-[0_0_24px_rgba(140,255,89,0.2)] bg-zinc-900 cursor-grab active:cursor-grabbing select-none"
            onMouseDown={(e) => { if (adjusting) handleDragStart(e.clientX, e.clientY); }}
            onMouseMove={(e) => { if (adjusting && e.buttons === 1) handleDragMove(e.clientX, e.clientY); }}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
            onTouchStart={(e) => { if (adjusting) handleDragStart(e.touches[0].clientX, e.touches[0].clientY); }}
            onTouchMove={(e) => { if (adjusting) { e.preventDefault(); handleDragMove(e.touches[0].clientX, e.touches[0].clientY); } }}
            onTouchEnd={handleDragEnd}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatarUrl!}
              alt="Avatar Marciano"
              draggable={false}
              className="h-full w-full object-cover opacity-0"
              style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "center center", transition: dragRef.current ? "none" : "transform 0.15s ease" }}
              onLoad={(e) => { (e.currentTarget as HTMLImageElement).classList.replace("opacity-0", "opacity-100"); }}
            />
            {adjusting && (
              <span className="pointer-events-none absolute inset-0 flex items-end justify-center pb-3">
                <span className="rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-white backdrop-blur-sm">Arrastrá para mover</span>
              </span>
            )}
          </div>

          {/* Adjust controls */}
          {adjusting ? (
            <div className="flex w-full flex-col gap-3">
              <div className="flex items-center gap-3">
                <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="1.9">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35M11 8v6M8 11h6" strokeLinecap="round"/>
                </svg>
                <input type="range" min="1" max="3" step="0.05" value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} className="flex-1 accent-[#8cff59]" />
                <span className="w-8 text-right text-xs text-zinc-400">{zoom.toFixed(1)}×</span>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="flex-1 ghost-button rounded-[20px] px-3 py-2 text-xs font-medium">
                  Resetear
                </button>
                <button type="button" onClick={() => { saveCrop(zoom, pan.x, pan.y); setAdjusting(false); }} className="flex-1 neon-button rounded-[20px] px-3 py-2 text-xs font-semibold">
                  Guardar encuadre
                </button>
              </div>
            </div>
          ) : (
            <div className="flex w-full gap-2">
              <button type="button" onClick={() => setAdjusting(true)} className="flex-1 ghost-button rounded-[20px] px-3 py-2 text-xs font-medium">
                Ajustar encuadre
              </button>
              <button type="button" disabled={cleaning} onClick={handleClean} className="flex-1 ghost-button rounded-[20px] px-3 py-2 text-xs font-medium disabled:opacity-40 flex items-center justify-center gap-1.5">
                {cleaning ? <><Spinner /><span>Limpiando...</span></> : "✦ Limpiar imagen"}
              </button>
            </div>
          )}

          {errorMsg && (
            <p className="w-full rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{errorMsg}</p>
          )}

          {/* Regenerar */}
          {!confirmRegen ? (
            <button type="button" onClick={() => { setErrorMsg(null); setConfirmRegen(true); }} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors py-1">
              Regenerar avatar
            </button>
          ) : (
            <div className="flex flex-col items-center gap-3 w-full">
              <p className="text-xs text-zinc-400 text-center max-w-[240px]">Se borra tu avatar y vas a inicio a escanear de nuevo.</p>
              <div className="flex gap-2 w-full">
                <button type="button" disabled={resetting} onClick={() => setConfirmRegen(false)} className="flex-1 ghost-button rounded-[20px] px-3 py-2 text-xs font-medium disabled:opacity-40">
                  Cancelar
                </button>
                <button type="button" disabled={resetting} onClick={handleRegen} className="flex-1 neon-button rounded-[20px] px-3 py-2 text-xs font-semibold disabled:opacity-40">
                  {resetting ? "Borrando..." : "Sí, regenerar"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {isProcessing && (
        <div className="flex items-center justify-center gap-3 py-4">
          <Spinner />
          <p className="text-sm text-zinc-400">Procesando tu avatar...</p>
        </div>
      )}

      <div className="h-px bg-zinc-800" />

      {/* Config: clase + color */}
      <PresetGrid selected={selectedPreset} onSelect={handlePresetSelect} />
      <ColorGrid selected={selectedSlug} onSelect={handleColorSelect} />

      <button type="button" onClick={handleSaveConfig} className="neon-button w-full rounded-[20px] px-4 py-3 text-sm font-semibold">
        {configSaved ? "✓ Configuración guardada" : "Guardar configuración"}
      </button>
    </div>
  );
}
