"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { eliminarAssetAction } from "./actions";

export default function EliminarAssetButton({ assetId }: { assetId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    if (!confirm("¿Eliminar este activo? No tiene pagos registrados y se borrará definitivamente.")) return;
    startTransition(async () => {
      const result = await eliminarAssetAction(assetId);
      if (result.error) {
        alert(result.error);
        return;
      }
      router.push("/negocio/activos");
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-300 transition hover:border-red-500/60 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isPending ? "..." : "Eliminar activo"}
    </button>
  );
}
