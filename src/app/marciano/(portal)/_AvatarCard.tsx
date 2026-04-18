"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import AvatarGenerationModal from "./_AvatarGenerationModal";
import { getAvatarStatusAction } from "./_AvatarCard.actions";

type AvatarCardProps = {
  styleCompletedAt: Date | string | null;
  avatarUrl: string | null;
  favoriteColor: string | null;
  avatarStatus: "idle" | "processing" | "ready" | "failed";
  avatarErrorMessage: string | null;
};

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
  const searchParams = useSearchParams();
  const [modalOpen, setModalOpen] = useState(false);
  const [crop, setCrop] = useState<{ zoom: number; x: number; y: number }>({ zoom: 1, x: 0, y: 0 });

  // Auto-open modal when ?generate=1 is in the URL
  useEffect(() => {
    if (searchParams?.get("generate") === "1") {
      setModalOpen(true);
      router.replace("/marciano");
    }
    // Only on mount
  }, []);

  // Restore saved crop position for the avatar display
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

  // Poll when the server-side status arrives as "processing" (user arrived mid-generation, modal not open)
  useEffect(() => {
    if (avatarStatus !== "processing" || modalOpen) return;
    const poll = async () => {
      const snap = await getAvatarStatusAction();
      if (snap.status === "ready" || snap.status === "failed") router.refresh();
    };
    const first = setTimeout(poll, 800);
    const interval = setInterval(poll, 3500);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [avatarStatus, modalOpen, router]);

  const locked = styleCompletedAt === null;
  const hasAvatar = avatarStatus === "ready" && avatarUrl !== null;

  // ── Avatar ready ──────────────────────────────────────────────────────────
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
            style={{
              transform: `translate(${crop.x}px, ${crop.y}px) scale(${crop.zoom})`,
              transformOrigin: "center center",
              transition: "transform 0.15s ease",
            }}
            onLoad={(e) => {
              (e.currentTarget as HTMLImageElement).classList.replace("opacity-0", "opacity-100");
            }}
          />
        </div>
        <Link href="/marciano/estilo" className="text-xs text-zinc-500 hover:text-[#8cff59] transition-colors">
          Ajustar en Mi Estilo →
        </Link>
      </section>
    );
  }

  // ── Processing (arrived mid-generation, modal not open) ───────────────────
  if (avatarStatus === "processing") {
    return (
      <section className="panel-card rounded-[28px] p-5 flex min-h-[220px] flex-col items-center justify-center gap-4">
        <p className="eyebrow text-xs self-start">Tu Avatar Marciano</p>
        <Spinner />
        <p className="text-sm font-medium text-zinc-300">Alienizándote...</p>
        <p className="text-xs text-zinc-500 text-center max-w-[240px]">
          Estamos transformando tu rostro. Tarda 2–3 minutos.
        </p>
      </section>
    );
  }

  // ── Failed ────────────────────────────────────────────────────────────────
  if (avatarStatus === "failed") {
    return (
      <section className="panel-card rounded-[28px] p-5 flex flex-col gap-4">
        <p className="eyebrow text-xs">Tu Avatar Marciano</p>
        <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {avatarErrorMessage ?? "No pudimos generar tu avatar."}
        </p>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="neon-button rounded-[20px] px-4 py-3 text-sm font-semibold"
        >
          Intentar de nuevo
        </button>
        {modalOpen && (
          <AvatarGenerationModal
            favoriteColor={favoriteColor}
            onClose={() => setModalOpen(false)}
            onComplete={() => {
              setModalOpen(false);
              router.refresh();
            }}
          />
        )}
      </section>
    );
  }

  // ── Locked (style not completed) ──────────────────────────────────────────
  if (locked) {
    return (
      <section className="panel-card rounded-[28px] p-5 flex flex-col gap-4">
        <div>
          <p className="eyebrow text-xs">Tu Avatar Marciano</p>
          <p className="mt-2 text-sm text-zinc-400">Completá el cuestionario de estilo para desbloquearlo.</p>
        </div>
        <Link href="/marciano/estilo" className="neon-button rounded-[20px] px-4 py-3 text-center text-sm font-semibold">
          Completar cuestionario
        </Link>
      </section>
    );
  }

  // ── Idle (unlocked, no avatar yet) ───────────────────────────────────────
  return (
    <section className="panel-card rounded-[28px] p-5 flex flex-col gap-4">
      <div>
        <p className="eyebrow text-xs">Tu Avatar Marciano</p>
        <p className="mt-1 text-sm text-zinc-400">Generá tu avatar alienígena personalizado.</p>
      </div>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="neon-button rounded-[20px] px-4 py-3 text-sm font-semibold"
      >
        Generar avatar
      </button>
      {modalOpen && (
        <AvatarGenerationModal
          favoriteColor={favoriteColor}
          onClose={() => setModalOpen(false)}
          onComplete={() => {
            setModalOpen(false);
            router.refresh();
          }}
        />
      )}
    </section>
  );
}
