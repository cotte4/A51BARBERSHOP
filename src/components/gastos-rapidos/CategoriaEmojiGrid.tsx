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
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {GASTO_RAPIDO_CATEGORIAS.map((categoria) => {
        const isSelected = selectedEmoji === categoria.emoji;
        return (
          <button
            key={categoria.key}
            type="button"
            onClick={() => onSelect(categoria.emoji)}
            className={`min-h-[72px] rounded-2xl border px-3 py-3 text-left transition ${
              isSelected
                ? "border-gray-900 bg-gray-900 text-white"
                : "border-gray-200 bg-white text-gray-900 hover:border-gray-300 hover:bg-gray-50"
            }`}
          >
            <span className="block text-2xl">{categoria.emoji}</span>
            <span
              className={`mt-2 block text-xs font-medium ${
                isSelected ? "text-gray-200" : "text-gray-600"
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
