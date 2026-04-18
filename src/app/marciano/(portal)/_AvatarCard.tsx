"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import FaceCapture from "./estilo/_FaceCapture";
import { MARCIANO_COLORS } from "@/lib/marciano-colors";
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

// Only used locally to track UI-only states (scan flow)
type LocalFlow = "idle" | "scanning";

function ColorGrid({
  selected,
  onSelect,
  disabled,
}: {
  selected: string | null;
  onSelect: (slug: string) => void;
  disabled?: boolean;
}) {
  const selectedColor = selected
    ? (MARCIANO_COLORS.find((c) => c.slug === selected) ?? null)
    : null;

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
                "relative aspect-square rounded-2xl transition-all duration-200",
                "flex items-center justify-center",
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
  const [localFlow, setLocalFlow] = useState<LocalFlow>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [, startTransition] = useTransition();

  const locked = styleCompletedAt === null;
  const hasAvatar = avatarStatus === "ready" && avatarUrl !== null;

  // Poll DB while status is 'processing'. When it flips, refresh server component.
  useEffect(() => {
    if (avatarStatus !== "processing") return;

    const poll = async () => {
      const snap = await getAvatarStatusAction();
      if (snap.status === "ready" || snap.status === "failed") {
        router.push("/marciano");
      }
    };

    const first = setTimeout(poll, 800);
    const interval = setInterval(poll, 3500);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [avatarStatus, router]);

  function handleSelectColor(slug: string) {
    setSelectedSlug(slug);
    startTransition(async () => {
      await saveFavoriteColorAction(slug);
    });
  }

  async function handleCapture(
    result: { shape: FaceShape; metrics: FaceMetrics | null; frameBase64: string | null } | null
  ) {
    const frameBase64 = result?.frameBase64 ?? null;
    const faceShape = result?.shape ?? "oval";

    setLocalFlow("idle");

    if (!frameBase64) {
      setErrorMsg("No se capturó el rostro. Intentá de nuevo.");
      return;
    }
    if (!selectedSlug) {
      setErrorMsg("Elegí un color primero.");
      return;
    }

    setErrorMsg(null);

    const res = await startAvatarGenerationAction({
      frameBase64,
      faceShape,
      colorSlug: selectedSlug,
    });

    if (!res.success) {
      setErrorMsg(res.error);
      return;
    }

    // status='processing' now in DB; refresh brings the new props into this component
    router.refresh();
  }

  async function handleReset() {
    setResetting(true);
    const res = await resetAvatarAction();
    setResetting(false);
    if (!res.success) {
      setErrorMsg(res.error);
      setConfirmReset(false);
      return;
    }
    setConfirmReset(false);
    router.refresh();
  }

  function handleRegenerateConfirm() {
    setConfirmReset(false);
    setErrorMsg(null);
    setLocalFlow("scanning");
  }

  // --- States ---

  if (localFlow === "scanning") {
    return <FaceCapture onCapture={handleCapture} />;
  }

  if (avatarStatus === "processing") {
    return (
      <section className="panel-card rounded-[28px] p-5 flex min-h-[220px] flex-col items-center justify-center gap-4">
        <p className="eyebrow text-xs self-start">Tu Avatar Marciano</p>
        <Spinner />
        <p className="text-sm font-medium text-zinc-300">Alienizándote...</p>
        <p className="text-xs text-zinc-500 text-center max-w-[240px]">
          Estamos transformando tu rostro. Tarda 2–3 minutos.
        </p>
        <button
          type="button"
          onClick={() => { setConfirmReset(false); handleReset(); }}
          className="ghost-button rounded-[20px] px-4 py-2 text-sm font-medium"
        >
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
        <button
          type="button"
          disabled={resetting}
          onClick={handleReset}
          className="neon-button rounded-[20px] px-4 py-3 text-sm font-semibold disabled:opacity-40"
        >
          {resetting ? "Limpiando..." : "Intentar de nuevo"}
        </button>
      </section>
    );
  }

  if (hasAvatar) {
    return (
      <section className="panel-card rounded-[28px] p-5 flex flex-col items-center gap-4">
        <p className="eyebrow text-xs text-[#8cff59] self-start">Tu Avatar Marciano</p>
        <div className="relative h-40 w-40 overflow-hidden rounded-full border-2 border-[#8cff59]/40 shadow-[0_0_24px_rgba(140,255,89,0.2)] bg-zinc-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={avatarUrl!}
            src={avatarUrl!}
            alt="Avatar Marciano"
            className="h-full w-full object-cover transition-opacity duration-500 opacity-0"
            onLoad={(e) => { (e.currentTarget as HTMLImageElement).classList.replace("opacity-0", "opacity-100"); }}
          />
        </div>
        <p className="text-xs text-zinc-500 text-center max-w-[220px]">Tu forma alienígena.</p>

        {errorMsg && (
          <p className="w-full rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {errorMsg}
          </p>
        )}

        {!confirmReset ? (
          <button
            type="button"
            onClick={() => { setErrorMsg(null); setConfirmReset(true); }}
            className="ghost-button rounded-[20px] px-4 py-2 text-sm font-medium"
          >
            Regenerar avatar
          </button>
        ) : (
          <div className="flex flex-col items-center gap-3 w-full">
            <p className="text-xs text-zinc-400 text-center max-w-[240px]">
              Se borra tu avatar actual y tenés que escanear de nuevo. Tarda 2–3 minutos.
            </p>
            <div className="flex gap-2 w-full">
              <button
                type="button"
                disabled={resetting}
                onClick={() => setConfirmReset(false)}
                className="flex-1 ghost-button rounded-[20px] px-4 py-2 text-sm font-medium disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleRegenerateConfirm}
                className="flex-1 neon-button rounded-[20px] px-4 py-2 text-sm font-semibold"
              >
                Sí, escanear de nuevo
              </button>
            </div>
          </div>
        )}
      </section>
    );
  }

  if (locked) {
    return (
      <section className="panel-card rounded-[28px] p-5 flex flex-col gap-4">
        <div>
          <p className="eyebrow text-xs">Tu Avatar Marciano</p>
          <p className="mt-2 text-sm text-zinc-400">
            Elegí tu color y completá el cuestionario para desbloquearlo.
          </p>
        </div>
        <ColorGrid disabled selected={selectedSlug} onSelect={() => {}} />
        <Link
          href="/marciano/estilo"
          className="neon-button rounded-[20px] px-4 py-3 text-center text-sm font-semibold"
        >
          Completar cuestionario
        </Link>
      </section>
    );
  }

  return (
    <section className="panel-card rounded-[28px] p-5 flex flex-col gap-4">
      <div>
        <p className="eyebrow text-xs">Tu Avatar Marciano</p>
        <p className="mt-1 text-sm text-zinc-400">Elegí tu color alien.</p>
      </div>

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
          setLocalFlow("scanning");
        }}
        className="neon-button rounded-[20px] px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
      >
        Escanear rostro y generar
      </button>
    </section>
  );
}
