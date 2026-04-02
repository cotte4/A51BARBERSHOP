"use client";

import { GASTO_RAPIDO_CATEGORIAS } from "@/lib/gastos-rapidos";

type CategoriaEmojiGridProps = {
  selectedEmoji: string;
  onSelect: (emoji: string) => void;
};

export default function CategoriaEmojiGrid({
  selectedEmoji,
  onSelect,
}: CategoriaEmojiGridProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {GASTO_RAPIDO_CATEGORIAS.map((categoria) => {
        const isSelected = selectedEmoji === categoria.emoji;
        return (
          <button
            key={categoria.key}
            type="button"
            onClick={() => onSelect(categoria.emoji)}
            className={`min-h-[68px] rounded-[18px] border px-3 py-3 text-left transition ${
              isSelected
                ? "border-[#8cff59]/40 bg-[#8cff59]/10 text-white"
                : "border-zinc-700 bg-zinc-800 text-white hover:border-zinc-600 hover:bg-zinc-700"
            }`}
          >
            <span className="block text-2xl">{categoria.emoji}</span>
            <span
              className={`mt-1.5 block text-xs font-medium ${
                isSelected ? "text-[#8cff59]" : "text-zinc-400"
              }`}
            >
              {categoria.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
