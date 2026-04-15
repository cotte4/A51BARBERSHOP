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
    <div className="grid grid-cols-4 gap-2">
      {GASTO_RAPIDO_CATEGORIAS.map((categoria) => {
        const isSelected = selectedEmoji === categoria.emoji;
        return (
          <button
            key={categoria.key}
            type="button"
            title={categoria.label}
            onClick={() => onSelect(categoria.emoji)}
            className={`flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-[16px] border px-2 py-2 transition ${
              isSelected
                ? "border-[#8cff59]/40 bg-[#8cff59]/10"
                : "border-zinc-700 bg-zinc-800 hover:border-zinc-600 hover:bg-zinc-700"
            }`}
          >
            <span className="text-xl leading-none">{categoria.emoji}</span>
            <span
              className={`w-full truncate text-center text-[10px] font-medium ${
                isSelected ? "text-[#8cff59]" : "text-zinc-400"
              }`}
            >
              {categoria.label.split(" /")[0]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
