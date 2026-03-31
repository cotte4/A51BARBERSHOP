"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";

type ClientAvatarUploaderProps = {
  initialValue?: string | null;
  clientId?: string;
};

export default function ClientAvatarUploader({ initialValue, clientId }: ClientAvatarUploaderProps) {
  const [avatarUrl, setAvatarUrl] = useState(initialValue ?? "");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const uploadKey = useMemo(() => `draft-${Date.now()}`, []);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(file: File | null) {
    if (!file) return;

    setError(null);
    setIsUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("clientId", clientId ?? uploadKey);
    formData.append("kind", "avatar");

    try {
      const response = await fetch("/api/clients/upload-photo", {
        method: "POST",
        body: formData,
      });

      const body = (await response.json()) as { error?: string; url?: string };
      if (!response.ok || !body.url) {
        setError(body.error ?? "No se pudo subir la foto.");
        return;
      }

      setAvatarUrl(body.url);
    } catch {
      setError("No se pudo subir la foto.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name="avatarUrl" value={avatarUrl} />
      <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
        <div className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-gray-900 text-lg font-semibold text-white">
          {avatarUrl ? (
            <Image src={avatarUrl} alt="Avatar del cliente" fill sizes="64px" className="object-cover" />
          ) : (
            <span>+</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900">Foto o avatar del cliente</p>
          <p className="mt-1 text-xs text-gray-500">Sirve para reconocerlo rapido en clientes y su perfil.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-medium text-white"
          >
            {avatarUrl ? "Cambiar foto" : "Subir foto"}
          </button>
          {avatarUrl ? (
            <button
              type="button"
              onClick={() => setAvatarUrl("")}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
            >
              Quitar
            </button>
          ) : null}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
      />

      {isUploading ? <p className="text-xs text-gray-500">Subiendo foto...</p> : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
