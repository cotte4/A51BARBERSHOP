"use client";

import { useState } from "react";

type ClientTagsInputProps = {
  initialTags: string[];
  inputName?: string;
};

const QUICK_TAGS = [
  "Fade alto",
  "Tijera",
  "Barba",
  "Trajo amigo",
  "Llego tarde",
  "Producto nuevo",
  "Degradado suave",
  "Pelo corto",
];

function normalizeTag(value: string) {
  return value.trim().replace(/\s+/g, "-").toLowerCase();
}

function formatTagLabel(tag: string) {
  return tag.replace(/-/g, " ");
}

export default function ClientTagsInput({
  initialTags,
  inputName = "tags",
}: ClientTagsInputProps) {
  const [tags, setTags] = useState<string[]>(initialTags);
  const [draft, setDraft] = useState("");

  function addTag(rawValue: string) {
    const nextTag = normalizeTag(rawValue);
    if (!nextTag || tags.includes(nextTag)) {
      return;
    }

    setTags((current) => [...current, nextTag].slice(0, 12));
    setDraft("");
  }

  function removeTag(tagToRemove: string) {
    setTags((current) => current.filter((tag) => tag !== tagToRemove));
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name={inputName} value={tags.join(", ")} />

      <div className="space-y-2">
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-600">Sugerencias rapidas</p>
          <p className="text-xs text-zinc-500">Toca para sumar o sacar memoria util del cliente.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {QUICK_TAGS.map((tag) => {
            const normalizedTag = normalizeTag(tag);
            const active = tags.includes(normalizedTag);

            return (
              <button
                key={tag}
                type="button"
                onClick={() => (active ? removeTag(normalizedTag) : addTag(tag))}
                className={[
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                  active
                    ? "border-[#8cff59]/25 bg-[#8cff59]/10 text-[#8cff59]"
                    : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200",
                ].join(" ")}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-[18px] border border-zinc-800 bg-zinc-900 p-3">
        <div className="flex flex-wrap gap-2">
          {tags.length > 0 ? (
            tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-2 rounded-full border border-[#8cff59]/25 bg-[#8cff59]/10 px-3 py-1.5 text-xs font-medium text-[#8cff59]"
              >
                {formatTagLabel(tag)}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  aria-label={`Quitar ${tag}`}
                  className="rounded-full text-[#8cff59]/70 transition hover:text-[#8cff59]"
                >
                  x
                </button>
              </span>
            ))
          ) : (
            <p className="text-xs text-zinc-500">Sin tags todavia. Agrega los que ayuden al corte.</p>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              addTag(draft);
            }
          }}
          placeholder="Tag personalizado..."
          className="h-11 flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-sm text-white placeholder:text-zinc-500 outline-none transition focus:border-[#8cff59]"
        />
        <button
          type="button"
          onClick={() => addTag(draft)}
          className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-sm font-medium text-zinc-300 transition hover:border-zinc-600 hover:bg-zinc-800 hover:text-white"
        >
          Agregar
        </button>
      </div>
    </div>
  );
}
