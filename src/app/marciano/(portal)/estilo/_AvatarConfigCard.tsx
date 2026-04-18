"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { MARCIANO_COLORS } from "@/lib/marciano-colors";
import { resetAvatarAction, cleanAvatarAction, recolorAvatarAction, restyleAvatarAction, getAvatarStatusAction } from "../_AvatarCard.actions";
import { AVATAR_PRESETS } from "@/lib/marciano-avatar-presets";
import type { AvatarPreset } from "@/lib/marciano-avatar-presets";

function Spinner({ size = "md" }: { size?: "sm" | "md" }) {
  const cls = size === "sm" ? "h-4 w-4" : "h-6 w-6";
  return (
    <svg className={`${cls} animate-spin text-[#8cff59]`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function ColorSwatches({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (slug: string) => void;
}) {
  return (
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
  );
}

type Props = {
  avatarUrl: string | null;
  avatarStatus: string;
};

export default function AvatarConfigCard({ avatarUrl, avatarStatus }: Props) {
  const router = useRouter();

  // Zoom/pan state
  const [adjusting, setAdjusting] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);

  // Action states
  const [cleaning, setCleaning] = useState(false);
  const [cleanSuccess, setCleanSuccess] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Recolor state
  const [recolorOpen, setRecolorOpen] = useState(false);
  const [recolorSlug, setRecolorSlug] = useState<string | null>(null);
  const [recoloring, setRecoloring] = useState(false);
  const [recolorPolling, setRecolorPolling] = useState(false);

  // Restyle state
  const [restyleOpen, setRestyleOpen] = useState(false);
  const [restylePreset, setRestylePreset] = useState<AvatarPreset | null>(null);
  const [intensity, setIntensity] = useState<1 | 2 | 3>(2);
  const [restyling, setRestyling] = useState(false);
  const [restylePolling, setRestylePolling] = useState(false);

  const hasAvatar = avatarStatus === "ready" && avatarUrl !== null;
  const isProcessing = avatarStatus === "processing" || recolorPolling || restylePolling;

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

  // Poll after recolor starts
  useEffect(() => {
    if (!recolorPolling) return;
    const poll = async () => {
      const snap = await getAvatarStatusAction();
      if (snap.status === "ready" || snap.status === "failed") {
        setRecolorPolling(false);
        router.refresh();
      }
    };
    const first = setTimeout(poll, 800);
    const interval = setInterval(poll, 3500);
    return () => { clearTimeout(first); clearInterval(interval); };
  }, [recolorPolling, router]);

  // Poll after restyle starts
  useEffect(() => {
    if (!restylePolling) return;
    const poll = async () => {
      const snap = await getAvatarStatusAction();
      if (snap.status === "ready" || snap.status === "failed") {
        setRestylePolling(false);
        router.refresh();
      }
    };
    const first = setTimeout(poll, 800);
    const interval = setInterval(poll, 3500);
    return () => { clearTimeout(first); clearInterval(interval); };
  }, [restylePolling, router]);

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

  async function handleClean() {
    setCleaning(true);
    setErrorMsg(null);
    setCleanSuccess(false);
    const res = await cleanAvatarAction();
    setCleaning(false);
    if (!res.success) { setErrorMsg(res.error); return; }
    setCleanSuccess(true);
    setTimeout(() => setCleanSuccess(false), 2500);
    router.refresh();
  }

  async function handleRecolor() {
    if (!recolorSlug) return;
    setRecoloring(true);
    setErrorMsg(null);
    const res = await recolorAvatarAction({ colorSlug: recolorSlug });
    setRecoloring(false);
    if (!res.success) { setErrorMsg(res.error); return; }
    setRecolorOpen(false);
    setRecolorSlug(null);
    setRecolorPolling(true);
  }

  async function handleRestyle() {
    if (!restylePreset) return;
    setRestyling(true);
    setErrorMsg(null);
    const res = await restyleAvatarAction({ preset: restylePreset, intensity });
    setRestyling(false);
    if (!res.success) { setErrorMsg(res.error); return; }
    setRestyleOpen(false);
    setRestylePreset(null);
    setRestylePolling(true);
  }

  async function handleRegen() {
    setResetting(true);
    setErrorMsg(null);
    const res = await resetAvatarAction();
    setResetting(false);
    if (!res.success) { setErrorMsg(res.error); setConfirmRegen(false); return; }
    setConfirmRegen(false);
    router.push("/marciano?generate=1");
  }

  return (
    <div className="panel-card rounded-[28px] p-5 space-y-5">
      <div>
        <p className="eyebrow text-xs text-zinc-500">Tu Avatar Marciano</p>
        <p className="mt-1 text-sm text-zinc-400">Ajustá, limpiá o regenerá tu avatar.</p>
      </div>

      {hasAvatar && !recolorPolling && (
        <div className="flex flex-col items-center gap-3">
          {/* Avatar preview */}
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

          {/* Adjust / clean / recolor controls */}
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
            <div className="flex w-full flex-col gap-2">
              <div className="flex w-full gap-2">
                <button type="button" onClick={() => setAdjusting(true)} className="flex-1 ghost-button rounded-[20px] px-3 py-2 text-xs font-medium">
                  Ajustar encuadre
                </button>
                <button type="button" disabled={cleaning} onClick={handleClean} className="flex-1 ghost-button rounded-[20px] px-3 py-2 text-xs font-medium disabled:opacity-40 flex items-center justify-center gap-1.5">
                  {cleaning ? <><Spinner size="sm" /><span>Limpiando...</span></> : "✦ Limpiar imagen"}
                </button>
              </div>

              {/* Cambiar color */}
              <button
                type="button"
                onClick={() => { setRecolorOpen((v) => !v); setRecolorSlug(null); setErrorMsg(null); }}
                className="w-full ghost-button rounded-[20px] px-3 py-2 text-xs font-medium flex items-center justify-center gap-2"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9">
                  <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" strokeLinecap="round"/>
                </svg>
                Cambiar color
              </button>

              {recolorOpen && (
                <div className="flex w-full flex-col gap-3 rounded-[22px] border border-zinc-700/60 bg-zinc-900/60 p-3">
                  <p className="text-xs text-zinc-400">Elegí el nuevo color de piel</p>
                  <ColorSwatches selected={recolorSlug} onSelect={setRecolorSlug} />
                  <button
                    type="button"
                    disabled={!recolorSlug || recoloring}
                    onClick={handleRecolor}
                    className="neon-button rounded-[20px] px-4 py-2.5 text-xs font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {recoloring ? <><Spinner size="sm" /><span>Iniciando...</span></> : "Aplicar color"}
                  </button>
                </div>
              )}

              {/* Cambiar estilo alien */}
              <button
                type="button"
                onClick={() => { setRestyleOpen((v) => !v); setRestylePreset(null); setErrorMsg(null); }}
                className="w-full ghost-button rounded-[20px] px-3 py-2 text-xs font-medium flex items-center justify-center gap-2"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9">
                  <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" strokeLinejoin="round"/>
                </svg>
                Cambiar estilo alien
              </button>

              {restyleOpen && (
                <div className="flex w-full flex-col gap-3 rounded-[22px] border border-zinc-700/60 bg-zinc-900/60 p-3">
                  <p className="text-xs text-zinc-400">Elegí el estilo nuevo</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.entries(AVATAR_PRESETS) as [AvatarPreset, typeof AVATAR_PRESETS[AvatarPreset]][]).map(([key, data]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setRestylePreset(key)}
                        className={[
                          "flex flex-col items-center gap-1 rounded-2xl p-3 transition-all",
                          restylePreset === key
                            ? "ring-2 ring-[#8cff59] bg-[#8cff59]/10"
                            : "ring-1 ring-white/10 hover:ring-white/20",
                        ].join(" ")}
                      >
                        <span className="text-2xl">{data.emoji}</span>
                        <span className="text-xs font-semibold text-white">{data.label}</span>
                        <span className="text-[10px] text-zinc-500">{data.vibe}</span>
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-[10px] text-zinc-500">
                      <span>Sutil</span><span>Normal</span><span>Exagerado</span>
                    </div>
                    <input
                      type="range" min="1" max="3" step="1" value={intensity}
                      onChange={(e) => setIntensity(parseInt(e.target.value, 10) as 1 | 2 | 3)}
                      className="w-full accent-[#8cff59]"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={!restylePreset || restyling}
                    onClick={handleRestyle}
                    className="neon-button rounded-[20px] px-4 py-2.5 text-xs font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    {restyling ? <><Spinner size="sm" /><span>Iniciando...</span></> : "Aplicar transformación"}
                  </button>
                </div>
              )}

              {cleanSuccess && (
                <p className="w-full rounded-2xl border border-[#8cff59]/25 bg-[#8cff59]/10 px-4 py-2.5 text-sm text-[#8cff59] text-center">
                  ✓ Imagen mejorada
                </p>
              )}
            </div>
          )}

          {errorMsg && (
            <p className="w-full rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">{errorMsg}</p>
          )}

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
        <div className="flex flex-col items-center justify-center gap-3 py-6">
          <Spinner />
          <p className="text-sm text-zinc-400">
            {recolorPolling ? "Cambiando color..." : restylePolling ? "Transformando avatar..." : "Procesando tu avatar..."}
          </p>
          {(recolorPolling || restylePolling) && (
            <p className="text-xs text-zinc-500 text-center max-w-[220px]">Tarda aprox. 40 segundos.</p>
          )}
        </div>
      )}
    </div>
  );
}
