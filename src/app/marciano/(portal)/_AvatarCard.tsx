"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import FaceCapture from "./estilo/_FaceCapture";
import { MARCIANO_COLORS } from "@/lib/marciano-colors";
import { saveFavoriteColorAction, generateAvatarAction } from "./_AvatarCard.actions";
import type { FaceShape } from "@/lib/types";
import type { FaceMetrics } from "@/lib/marciano-style";

type AvatarCardProps = {
  styleCompletedAt: Date | string | null;
  avatarUrl: string | null;
  favoriteColor: string | null;
};

type FlowState = "idle" | "scanning" | "generating" | "error";

function ColorGrid({
  selected,
  onSelect,
  disabled,
}: {
  selected: string | null;
  onSelect: (slug: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-8 gap-2">
      {MARCIANO_COLORS.map((c) => (
        <button
          key={c.slug}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(c.slug)}
          aria-label={c.nombre}
          title={c.nombre}
          className={[
            "aspect-square rounded-2xl border-2 transition-all duration-200",
            disabled ? "opacity-30 cursor-not-allowed" : "hover:scale-105",
            selected === c.slug ? "border-white scale-110 shadow-lg" : "border-transparent",
          ].join(" ")}
          style={{ backgroundColor: c.hex }}
        />
      ))}
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

export default function AvatarCard({ styleCompletedAt, avatarUrl, favoriteColor }: AvatarCardProps) {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(favoriteColor);
  const [flow, setFlow] = useState<FlowState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const locked = styleCompletedAt === null;
  const hasAvatar = avatarUrl !== null;

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

    if (!frameBase64) {
      setErrorMsg("No se capturó el rostro. Intentá de nuevo.");
      setFlow("error");
      return;
    }

    if (!selectedSlug) {
      setErrorMsg("Elegí un color primero.");
      setFlow("error");
      return;
    }

    setFlow("generating");
    setErrorMsg(null);

    const res = await generateAvatarAction({ frameBase64, faceShape, colorSlug: selectedSlug });

    if (!res.success) {
      setErrorMsg(res.error);
      setFlow("error");
      return;
    }

    setFlow("idle");
  }

  if (hasAvatar) {
    return (
      <section className="panel-card rounded-[28px] p-5 flex flex-col items-center gap-4">
        <p className="eyebrow text-xs text-[#8cff59] self-start">Tu Avatar Marciano</p>
        <div className="relative h-40 w-40 overflow-hidden rounded-full border-2 border-[#8cff59]/40 shadow-[0_0_24px_rgba(140,255,89,0.2)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={avatarUrl} alt="Avatar Marciano" className="h-full w-full object-cover" />
        </div>
        <p className="text-xs text-zinc-500 text-center max-w-[220px]">
          Tu forma alienígena. Generada una sola vez.
        </p>
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

  if (flow === "scanning") {
    return <FaceCapture onCapture={handleCapture} />;
  }

  if (flow === "generating") {
    return (
      <section className="panel-card rounded-[28px] p-5 flex min-h-[200px] flex-col items-center justify-center gap-4">
        <p className="eyebrow text-xs self-start">Tu Avatar Marciano</p>
        <Spinner />
        <p className="text-sm text-zinc-400">Generando tu avatar alien...</p>
        <p className="text-xs text-zinc-600 text-center max-w-[200px]">
          Puede tardar hasta 2 minutos.
        </p>
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
          setFlow("scanning");
        }}
        className="neon-button rounded-[20px] px-4 py-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40"
      >
        Escanear rostro y generar
      </button>
    </section>
  );
}
