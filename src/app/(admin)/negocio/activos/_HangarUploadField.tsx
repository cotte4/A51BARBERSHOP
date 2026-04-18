"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";

type HangarUploadFieldProps = {
  name: string;
  label: string;
  helper: string;
  kind: "photo" | "receipt";
  accept: string;
  initialValue?: string | null;
  assetId?: string;
};

function isImageUrl(url: string) {
  return /\.(png|jpe?g|webp)(\?|$)/i.test(url);
}

export default function HangarUploadField({
  name,
  label,
  helper,
  kind,
  accept,
  initialValue,
  assetId,
}: HangarUploadFieldProps) {
  const [value, setValue] = useState(initialValue ?? "");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const draftId = useMemo(() => assetId ?? `draft-${name}-${Date.now()}`, [assetId, name]);
  const hasImagePreview = Boolean(value) && isImageUrl(value);

  async function handleFileChange(file: File | null) {
    if (!file) return;

    setError(null);
    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("assetId", draftId);
    formData.append("kind", kind);

    try {
      const response = await fetch("/api/hangar/upload", {
        method: "POST",
        body: formData,
      });

      const body = (await response.json()) as { error?: string; url?: string };
      if (!response.ok || !body.url) {
        setError(body.error ?? "No se pudo subir el archivo.");
        return;
      }

      setValue(body.url);
    } catch {
      setError("No se pudo subir el archivo.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={value} />

      <div className="rounded-[24px] border border-zinc-800 bg-zinc-950/70 p-4">
        <div className="flex items-start gap-4">
          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[22px] border border-zinc-800 bg-zinc-900 text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
            {hasImagePreview ? (
              <Image
                src={value}
                alt={label}
                fill
                sizes="80px"
                className="object-cover"
              />
            ) : value ? (
              <span>FILE</span>
            ) : (
              <span>{kind === "photo" ? "IMG" : "PDF"}</span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">{label}</p>
            <p className="mt-1 text-xs leading-5 text-zinc-500">{helper}</p>

            {value ? (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <a
                  href={value}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-zinc-300 hover:border-[#8cff59]/40 hover:text-[#b9ff96]"
                >
                  Ver archivo
                </a>
                <button
                  type="button"
                  onClick={() => setValue("")}
                  className="rounded-full border border-zinc-800 px-3 py-1 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
                >
                  Quitar
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="ghost-button inline-flex min-h-[42px] items-center justify-center rounded-[16px] px-4 text-sm font-semibold"
          >
            {value ? "Reemplazar" : "Subir archivo"}
          </button>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
      />

      {isUploading ? <p className="text-xs text-zinc-500">Subiendo archivo...</p> : null}
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </div>
  );
}
