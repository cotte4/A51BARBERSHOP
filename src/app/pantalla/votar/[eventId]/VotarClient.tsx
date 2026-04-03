"use client";

import { useEffect, useState } from "react";

const DEVICE_KEY_STORAGE_KEY = "a51-pantalla-device-key";

type VoteState = "loading" | "ready" | "submitting" | "success" | "error";

type VoteResponse = {
  ok?: boolean;
  duplicate?: boolean;
  count?: number;
  error?: string;
};

function getOrCreateDeviceKey(): string {
  const existing = localStorage.getItem(DEVICE_KEY_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const generated =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random()
          .toString(36)
          .slice(2)}`;

  localStorage.setItem(DEVICE_KEY_STORAGE_KEY, generated);
  return generated;
}

export default function VotarClient({
  eventId,
  cancion,
  clienteNombre,
}: {
  eventId: string;
  cancion: string;
  clienteNombre: string;
}) {
  const [voteState, setVoteState] = useState<VoteState>("loading");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    const alreadyVoted = localStorage.getItem(`voted_${eventId}`);
    getOrCreateDeviceKey();

    if (alreadyVoted) {
      setVoteState("success");
      setMessage("Ya votaste esta cancion.");
      return;
    }

    setVoteState("ready");
    setMessage("");
  }, [eventId]);

  async function handleVote() {
    try {
      setVoteState("submitting");
      setMessage("");

      const deviceKey = getOrCreateDeviceKey();
      const response = await fetch("/api/pantalla/votos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventId,
          deviceKey,
        }),
      });

      const data = (await response.json().catch(() => null)) as VoteResponse | null;

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error ?? "No pude registrar tu voto.");
      }

      localStorage.setItem(`voted_${eventId}`, "1");
      setVoteState("success");
      setMessage(data.duplicate ? "Ya habias votado esta cancion." : "Gracias por votar.");
    } catch (error) {
      setVoteState("error");
      setMessage(error instanceof Error ? error.message : "No pude registrar tu voto.");
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_30%),radial-gradient(circle_at_bottom,_rgba(217,70,239,0.16),_transparent_35%),#020617] px-6 py-8 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md items-center">
        <section className="w-full rounded-[36px] border border-white/10 bg-white/6 px-7 py-8 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-sky-200/80">
            A51 Barber
          </p>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white">Vota la cancion</h1>

          <div className="mt-8 rounded-[28px] border border-white/10 bg-white/5 p-5">
            <p className="text-sm uppercase tracking-[0.25em] text-fuchsia-200/75">Suena ahora</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">{cancion}</h2>
            <p className="mt-2 text-sm text-zinc-300">La eligio {clienteNombre}</p>
          </div>

          <div className="mt-8">
            {voteState === "loading" && (
              <div className="rounded-3xl border border-white/10 bg-white/5 px-5 py-6 text-center text-sm text-zinc-300">
                Preparando voto...
              </div>
            )}

            {voteState === "ready" && (
              <button
                type="button"
                onClick={handleVote}
                className="flex w-full items-center justify-center rounded-[28px] border border-sky-300/30 bg-sky-400/15 px-6 py-6 text-lg font-semibold text-sky-50 shadow-[0_20px_80px_rgba(14,165,233,0.18)] transition hover:bg-sky-400/25"
              >
                👍 Me gusto
              </button>
            )}

            {voteState === "submitting" && (
              <div className="rounded-[28px] border border-sky-300/20 bg-sky-400/10 px-5 py-6 text-center text-base font-medium text-sky-100">
                Registrando tu voto...
              </div>
            )}

            {voteState === "success" && (
              <div className="rounded-[28px] border border-emerald-300/20 bg-emerald-400/10 px-5 py-6 text-center">
                <p className="text-4xl">👍</p>
                <p className="mt-3 text-xl font-semibold text-emerald-100">Listo</p>
                <p className="mt-2 text-sm text-emerald-50/85">{message}</p>
              </div>
            )}

            {voteState === "error" && (
              <div className="space-y-4">
                <div className="rounded-[28px] border border-red-300/20 bg-red-400/10 px-5 py-5 text-center">
                  <p className="text-base font-semibold text-red-100">No pude registrar tu voto</p>
                  <p className="mt-2 text-sm text-red-50/85">{message}</p>
                </div>
                <button
                  type="button"
                  onClick={handleVote}
                  className="w-full rounded-[24px] border border-white/10 bg-white/8 px-5 py-4 text-sm font-semibold text-white hover:bg-white/12"
                >
                  Reintentar
                </button>
              </div>
            )}
          </div>

          <p className="mt-8 text-center text-xs uppercase tracking-[0.2em] text-zinc-500">
            Un voto por dispositivo
          </p>
        </section>
      </div>
    </main>
  );
}
