"use client";

import { useTransition } from "react";
import { darDeBajaAssetAction } from "./actions";

export default function DarDeBajaButton({ assetId }: { assetId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      await darDeBajaAssetAction(assetId);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="rounded-full border border-zinc-600/50 bg-zinc-800/60 px-3 py-1 text-xs font-semibold text-zinc-400 transition hover:border-red-500/40 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isPending ? "..." : "Dar de baja"}
    </button>
  );
}
