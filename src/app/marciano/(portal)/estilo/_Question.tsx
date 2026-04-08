"use client";

import { useState } from "react";
import Image from "next/image";
import { playSound } from "@/lib/marciano-sounds";

type QuestionOption = {
  value: string;
  label: string;
  imageUrl?: string;
};

type QuestionProps = {
  eyebrow: string;
  title: string;
  type: "choice-text" | "choice-image";
  options: QuestionOption[];
  onAnswer: (value: string) => void;
  progress: number;
};

export default function Question({ eyebrow, title, type, options, onAnswer, progress }: QuestionProps) {
  const [selected, setSelected] = useState<string | null>(null);

  function handleSelect(value: string) {
    if (selected) return;
    setSelected(value);
    playSound("select");
    // Brief highlight then advance
    setTimeout(() => {
      onAnswer(value);
    }, 220);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Progress bar */}
      <div className="w-full h-0.5 bg-zinc-900">
        <div
          className="bg-[#8cff59] h-0.5 transition-all duration-500"
          style={{ width: `${(progress / 5) * 100}%` }}
        />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6 py-10 overflow-y-auto">
        {/* Eyebrow */}
        <p className="text-zinc-500 uppercase tracking-widest text-xs text-center">{eyebrow}</p>

        {/* Title */}
        <h2 className="font-display text-3xl sm:text-5xl text-white text-center px-6 max-w-2xl mx-auto leading-tight">
          {title}
        </h2>

        {/* Options */}
        {type === "choice-text" ? (
          <div className="w-full max-w-md mx-auto flex flex-col gap-3">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt.value)}
                className={[
                  "ghost-button rounded-[20px] px-6 py-4 text-left w-full transition-all duration-200",
                  selected === opt.value
                    ? "border-[#8cff59] bg-[#8cff59]/10 text-white"
                    : "hover:border-[#8cff59]/40",
                ].join(" ")}
              >
                {opt.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto w-full">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt.value)}
                className={[
                  "aspect-square rounded-[22px] overflow-hidden relative cursor-pointer border-2 transition-all duration-200",
                  selected === opt.value
                    ? "border-[#8cff59]"
                    : "border-transparent hover:border-[#8cff59]/60",
                ].join(" ")}
              >
                {opt.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={opt.imageUrl}
                    alt={opt.label}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-zinc-800 flex items-center justify-center">
                    <span className="text-zinc-400 text-sm">{opt.label}</span>
                  </div>
                )}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                  <span className="text-white text-xs font-medium">{opt.label}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
