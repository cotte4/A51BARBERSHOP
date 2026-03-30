"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState, useRef } from "react";
import { createVisitLogAction } from "@/app/(barbero)/clientes/actions";

type PostCorteFormProps = {
  clientId: string;
};

function PropinaStars({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex gap-2">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(value === n ? 0 : n)}
          className="text-2xl text-amber-400 transition hover:scale-110"
          aria-label={`${n} estrella${n !== 1 ? "s" : ""}`}
        >
          {n <= value ? "★" : "☆"}
        </button>
      ))}
    </div>
  );
}

export default function PostCorteForm({ clientId }: PostCorteFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [propina, setPropina] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formEl = e.currentTarget;
    const fd = new FormData(formEl);

    const barberNotes = String(fd.get("barberNotes") ?? "").trim() || null;
    const tagsRaw = String(fd.get("tags") ?? "").trim();
    const tags = tagsRaw ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean) : [];

    // Upload photos
    const uploadedUrls: string[] = [];
    if (selectedFiles.length > 0) {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setUploadProgress(`Subiendo foto ${i + 1} de ${selectedFiles.length}…`);

        const uploadData = new FormData();
        uploadData.append("file", file);
        uploadData.append("clientId", clientId);

        try {
          const res = await fetch("/api/clients/upload-photo", {
            method: "POST",
            body: uploadData,
          });

          if (!res.ok) {
            const body = (await res.json()) as { error?: string };
            setError(body.error ?? "Error al subir la foto. Podés intentar de nuevo o guardar sin foto.");
            setUploadProgress(null);
            return;
          }

          const data = (await res.json()) as { url: string };
          uploadedUrls.push(data.url);
        } catch {
          setError("No se pudo subir la foto. Verificá tu conexión.");
          setUploadProgress(null);
          return;
        }
      }
      setUploadProgress(null);
    }

    startTransition(async () => {
      const result = await createVisitLogAction(clientId, {
        barberNotes,
        tags,
        photoUrls: uploadedUrls,
        propinaEstrellas: propina,
      });

      if (result?.error) {
        setError(result.error);
        return;
      }

      router.push(`/clientes/${clientId}`);
      router.refresh();
    });
  }

  function handleSaveWithoutPhoto() {
    setSelectedFiles([]);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  const isSubmitting = isPending || Boolean(uploadProgress);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-gray-200 space-y-5">
        {/* Notas */}
        <div>
          <label htmlFor="barberNotes" className="mb-1 block text-sm font-medium text-gray-700">
            Notas del corte
          </label>
          <textarea
            id="barberNotes"
            name="barberNotes"
            rows={4}
            placeholder="Ej: pidió degradado más alto, llegó tarde, preguntó por el nuevo producto…"
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 outline-none focus:border-gray-900 resize-none"
          />
        </div>

        {/* Tags de visita */}
        <div>
          <label htmlFor="tags" className="mb-1 block text-sm font-medium text-gray-700">
            Tags de esta visita
          </label>
          <input
            id="tags"
            name="tags"
            placeholder="degradado-alto, trajo-amigo, llego-tarde"
            className="h-12 w-full rounded-xl border border-gray-300 px-4 text-sm text-gray-900 outline-none focus:border-gray-900"
          />
          <p className="mt-1 text-xs text-gray-500">Separados por coma.</p>
        </div>

        {/* Propina */}
        <div>
          <p className="mb-2 block text-sm font-medium text-gray-700">Propina</p>
          <PropinaStars value={propina} onChange={setPropina} />
          <p className="mt-1 text-xs text-gray-500">
            {propina === 0 ? "Sin propina registrada" : `${propina} estrella${propina !== 1 ? "s" : ""}`}
          </p>
        </div>

        {/* Fotos */}
        <div>
          <label htmlFor="photos" className="mb-1 block text-sm font-medium text-gray-700">
            Fotos del corte
          </label>
          <input
            ref={fileInputRef}
            id="photos"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(e) => {
              setSelectedFiles(Array.from(e.target.files ?? []));
              setError(null);
            }}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-3 file:py-1 file:text-sm file:font-medium file:text-gray-700"
          />
          {selectedFiles.length > 0 ? (
            <p className="mt-1 text-xs text-gray-500">
              {selectedFiles.length} foto{selectedFiles.length !== 1 ? "s" : ""} seleccionada
              {selectedFiles.length !== 1 ? "s" : ""}
            </p>
          ) : null}
        </div>
      </div>

      {/* Upload progress */}
      {uploadProgress ? (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          {uploadProgress}
        </div>
      ) : null}

      {/* Error with retry options */}
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 space-y-3">
          <p>{error}</p>
          {selectedFiles.length > 0 ? (
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl bg-red-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                Reintentar
              </button>
              <button
                type="button"
                onClick={handleSaveWithoutPhoto}
                className="rounded-xl border border-red-300 px-4 py-2 text-sm font-medium text-red-700"
              >
                Guardar sin foto
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="h-14 w-full rounded-2xl bg-gray-900 text-sm font-semibold text-white disabled:opacity-60"
      >
        {uploadProgress ?? (isPending ? "Guardando visita…" : "Guardar visita")}
      </button>
    </form>
  );
}
