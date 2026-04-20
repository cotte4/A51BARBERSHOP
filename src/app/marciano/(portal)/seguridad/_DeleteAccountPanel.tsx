"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import { deleteMarcianoAccountAction } from "./actions";

export default function DeleteAccountPanel() {
  const router = useRouter();
  const [step, setStep] = useState<"idle" | "confirm" | "deleting">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setStep("deleting");
    setError(null);
    const result = await deleteMarcianoAccountAction();
    if (!result.success) {
      setError(result.error);
      setStep("confirm");
      return;
    }
    await signOut();
    router.push("/marciano/login");
  }

  if (step === "idle") {
    return (
      <button
        type="button"
        onClick={() => setStep("confirm")}
        className="w-full rounded-[20px] border border-red-500/30 bg-red-500/8 px-4 py-3 text-sm font-semibold text-red-400 transition hover:border-red-500/50 hover:bg-red-500/12 hover:text-red-300"
      >
        Eliminar mi cuenta
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-[24px] border border-red-500/30 bg-red-500/8 p-5">
      <p className="text-sm font-semibold text-red-300">¿Seguro que querés eliminar tu cuenta?</p>
      <ul className="space-y-1.5 text-xs text-zinc-400">
        <li>· Tus apuestas activas se cancelan y los OVNIS se devuelven</li>
        <li>· Tu historial de visitas y Style DNA se conservan en A51</li>
        <li>· Perdés acceso al portal Marciano de forma permanente</li>
        <li>· Para volver necesitás pedirle a A51 que te reactive</li>
      </ul>
      {error && (
        <p className="rounded-xl border border-red-500/35 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {error}
        </p>
      )}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => setStep("idle")}
          disabled={step === "deleting"}
          className="flex-1 rounded-[18px] border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-zinc-300 hover:border-zinc-600 disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={step === "deleting"}
          className="flex-1 rounded-[18px] border border-red-500/40 bg-red-500/15 px-4 py-2.5 text-sm font-semibold text-red-300 hover:bg-red-500/20 disabled:opacity-50"
        >
          {step === "deleting" ? "Eliminando..." : "Sí, eliminar"}
        </button>
      </div>
    </div>
  );
}
