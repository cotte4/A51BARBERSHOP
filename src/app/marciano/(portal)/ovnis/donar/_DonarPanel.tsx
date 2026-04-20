"use client";

import { useState } from "react";
import { formatOvnis, BET_MIN_AMOUNT } from "@/lib/ovnis";
import { searchMarcianoAction, donarAction } from "./actions";

interface Props {
  myBalance: number;
}

type RecipientResult = { id: string; name: string };

export default function DonarPanel({ myBalance }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<RecipientResult[]>([]);
  const [selected, setSelected] = useState<RecipientResult | null>(null);
  const [amount, setAmount] = useState(11);
  const [status, setStatus] = useState<"idle" | "searching" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSearch() {
    if (!query.trim()) return;
    setStatus("searching");
    const res = await searchMarcianoAction(query);
    setResults(res);
    setStatus("idle");
  }

  async function handleDonar(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    if (amount <= 0 || amount > myBalance) return;

    setStatus("loading");
    setErrorMsg("");
    const result = await donarAction(selected.id, amount);
    if (result.success) {
      setStatus("done");
    } else {
      setStatus("error");
      setErrorMsg(result.error);
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-[22px] border border-[#8cff59]/25 bg-[#8cff59]/10 p-6 text-center">
        <p className="text-2xl">🛸</p>
        <p className="mt-3 font-semibold text-[#8cff59]">
          {formatOvnis(amount)} enviados a {selected?.name}
        </p>
        <p className="mt-1 text-sm text-zinc-400">El universo los recibió.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Search */}
      <div>
        <label className="text-sm font-medium text-zinc-300">Buscar Marciano</label>
        <div className="mt-1.5 flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Nombre..."
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

        {results.length > 0 && !selected && (
          <div className="mt-2 divide-y divide-zinc-800 rounded-2xl border border-zinc-700 bg-zinc-900 overflow-hidden">
            {results.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => { setSelected(r); setResults([]); }}
                className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-white/4"
              >
                <span className="text-sm font-medium text-white">{r.name}</span>
                <span className="text-xs text-zinc-500">Marciano →</span>
              </button>
            ))}
          </div>
        )}

        {results.length === 0 && status === "idle" && query.trim() && !selected && (
          <p className="mt-2 text-xs text-zinc-500">Sin resultados. Probá con otro nombre.</p>
        )}
      </div>

      {/* Recipient + amount form */}
      {selected && (
        <form onSubmit={handleDonar} className="flex flex-col gap-4">
          <div className="flex items-center justify-between rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3">
            <div>
              <p className="text-xs text-zinc-500">Para</p>
              <p className="font-semibold text-white">{selected.name}</p>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              Cambiar
            </button>
          </div>

          <div>
            <label className="text-sm font-medium text-zinc-300">
              Cantidad{" "}
              <span className="text-zinc-500">(máx. {myBalance.toLocaleString("es-AR")})</span>
            </label>
            <input
              type="number"
              min={1}
              max={myBalance}
              step={1}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              required
              className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-white focus:border-[#8cff59]/60 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={status === "loading" || amount <= 0 || amount > myBalance}
            className="neon-button rounded-[20px] py-3 text-sm font-semibold disabled:opacity-50"
          >
            {status === "loading"
              ? "Enviando..."
              : `Donar ${amount > 0 ? formatOvnis(amount) : "OVNIS"}`}
          </button>

          {status === "error" && (
            <p className="text-center text-sm text-red-300">{errorMsg}</p>
          )}
        </form>
      )}
    </div>
  );
}
