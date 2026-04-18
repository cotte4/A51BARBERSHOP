"use client";

import { useState } from "react";
import { generateCardSlugAction } from "@/app/marciano/(portal)/actions";

type Props = {
  slug: string | null;
};

export default function ShareCardButton({ slug: initialSlug }: Props) {
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    setSharing(true);
    try {
      let effectiveSlug = initialSlug;
      if (!effectiveSlug) {
        const res = await generateCardSlugAction();
        if (!res.success) return;
        effectiveSlug = res.slug;
      }
      const url = `${window.location.origin}/credencial/${effectiveSlug}`;
      if (typeof navigator.share === "function") {
        await navigator.share({ title: "Mi credencial Marciano — A51 Barber", url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } finally {
      setSharing(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      disabled={sharing}
      className="w-full ghost-button rounded-[20px] px-4 py-3 text-sm font-medium disabled:opacity-40 flex items-center justify-center gap-2"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.9">
        <path d="M4 12v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6" strokeLinecap="round" />
        <path d="M16 6l-4-4-4 4M12 2v13" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {sharing ? "..." : copied ? "¡Enlace copiado!" : "Compartir credencial"}
    </button>
  );
}
