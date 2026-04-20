"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatOvnis, BET_MIN_AMOUNT } from "@/lib/ovnis";
import { searchMarcianoForBetAction, crearApuestaAction } from "./actions";

interface Game {
  id: string;
  nombre: string;
  externalUrl: string | null;
}

interface Props {
  games: Game[];
  myBalance: number;
}

type OpponentResult = { id: string; name: string };

export default function CrearApuestaPanel({ games, myBalance }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<OpponentResult[]>([]);
  const [opponent, setOpponent] = useState<OpponentResult | null>(null);
  const [gameId, setGameId] = useState(games[0]?.id ?? "");
  const [amount, setAmount] = useState(BET_MIN_AMOUNT);
  const [status, setStatus] = useState<"idle" | "searching" | "loading" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSearch() {
    if (!query.trim()) return;
    setStatus("searching");
    const res = await searchMarcianoForBetAction(query);
    setResults(res);
    setStatus("idle");
  }

  async function handleCrear(e: React.FormEvent) {
    e.preventDefault();
    if (!opponent || !gameId) return;

    setStatus("loading");
    setErrorMsg("");
    const result = await crearApuestaAction(opponent.id, gameId, amount);
    if (result.success) {
      router.push(`/marciano/juegos/${result.betId}`);
    } else {
      setStatus("error");
      setErrorMsg(result.error);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Search opponent */}
      <div>
        <label className="text-sm font-medium text-zinc-300">Oponente</label>
        <div className="mt-1.5 flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Nombre del Marciano..."
            className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-white placeholder:text-zinc-500 focus:border-[#8cff59]/60 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={status === "searching"}
            className="ghost-button rounded-[16px] px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            {status === "searching" ? "..." : "Buscar"}
          </button>
        </div>

        {results.length > 0 && !opponent && (
          <div className="mt-2 overflow-hidden divide-y divide-zinc-800 rounded-2xl border border-zinc-700 bg-zinc-900">
            {results.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => { setOpponent(r); setResults([]); }}
                className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-white/4"
              >
                <span className="text-sm font-medium text-white">{r.name}</span>
                <span className="text-xs text-zinc-500">Marciano →</span>
              </button>
            ))}
          </div>
        )}

        {opponent && (
          <div className="mt-2 flex items-center justify-between rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3">
            <p className="text-sm font-semibold text-white">{opponent.name}</p>
            <button
              type="button"
              onClick={() => setOpponent(null)}
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              Cambiar
            </button>
          </div>
        )}
      </div>

      {/* Game + amount */}
      {opponent && (
        <form onSubmit={handleCrear} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium text-zinc-300">Juego</label>
            <select
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-white focus:border-[#8cff59]/60 focus:outline-none"
            >
              {games.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nombre}
                </option>
              ))}
            </select>
            {games.find((g) => g.id === gameId)?.externalUrl && (
              <a
                href={games.find((g) => g.id === gameId)!.externalUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 block text-xs text-[#8cff59] hover:underline"
              >
                Jugar ahora →
              </a>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-300">
              OVNIS a apostar{" "}
              <span className="text-zinc-500">(mín. {BET_MIN_AMOUNT}, máx. {myBalance.toLocaleString("es-AR")})</span>
            </label>
            <input
              type="number"
              min={BET_MIN_AMOUNT}
              max={myBalance}
              step={1}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              required
              className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-white focus:border-[#8cff59]/60 focus:outline-none"
            />
            {amount > 0 && (
              <p className="mt-1 text-xs text-zinc-500">
                Si ganás, te llevás {formatOvnis(amount * 2)}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={status === "loading" || amount < BET_MIN_AMOUNT || amount > myBalance}
            className="neon-button rounded-[20px] py-3 text-sm font-semibold disabled:opacity-50"
          >
            {status === "loading" ? "Creando apuesta..." : "Crear apuesta"}
          </button>

          {status === "error" && (
            <p className="text-center text-sm text-red-300">{errorMsg}</p>
          )}
        </form>
      )}
    </div>
  );
}
