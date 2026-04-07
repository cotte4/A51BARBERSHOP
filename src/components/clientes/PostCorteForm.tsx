"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type FormEvent } from "react";
import { createVisitLogAction } from "@/app/(barbero)/clientes/actions";

type PostCorteFormProps = {
  clientId: string;
  clientName: string;
  clientIsMarciano: boolean;
};

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function PropinaStars({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {[1, 2, 3, 4, 5].map((n) => {
        const selected = n <= value;

        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(value === n ? 0 : n)}
            aria-label={`${n} estrella${n !== 1 ? "s" : ""}`}
            aria-pressed={selected}
            className={[
              "flex h-12 w-12 items-center justify-center rounded-2xl border text-lg font-semibold transition",
              selected
                ? "border-[#8cff59]/40 bg-[#8cff59]/12 text-[#b9ff96] shadow-[0_0_0_1px_rgba(140,255,89,0.08)]"
                : "border-zinc-700 bg-zinc-900 text-amber-300 hover:border-zinc-600 hover:bg-zinc-800",
            ].join(" ")}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}

export default function PostCorteForm({
  clientId,
  clientName,
  clientIsMarciano,
}: PostCorteFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const skipPhotoUploadRef = useRef(false);
  const [isPending, startTransition] = useTransition();
  const [propina, setPropina] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formEl = e.currentTarget;
    const fd = new FormData(formEl);

    const barberNotes = String(fd.get("barberNotes") ?? "").trim() || null;
    const tagsRaw = String(fd.get("tags") ?? "").trim();
    const tags = tagsRaw
      ? tagsRaw.split(",").map((tag) => tag.trim()).filter(Boolean)
      : [];
    const filesToUpload = skipPhotoUploadRef.current ? [] : selectedFiles;

    skipPhotoUploadRef.current = false;

    const uploadedUrls: string[] = [];
    if (filesToUpload.length > 0) {
      for (let i = 0; i < filesToUpload.length; i += 1) {
        const file = filesToUpload[i];
        setUploadProgress(`Subiendo foto ${i + 1} de ${filesToUpload.length}...`);

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
            setError(
              body.error ?? "No se pudo subir la foto. Podras intentar de nuevo o guardar sin imagen."
            );
            setUploadProgress(null);
            return;
          }

          const data = (await res.json()) as { url: string };
          uploadedUrls.push(data.url);
        } catch {
          setError("No se pudo subir la foto. Verifica la conexion e intenta otra vez.");
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
    skipPhotoUploadRef.current = true;
    setSelectedFiles([]);
    setUploadProgress(null);
    setError(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    formRef.current?.requestSubmit();
  }

  const isSubmitting = isPending || Boolean(uploadProgress);
  const statusText = uploadProgress ?? (isPending ? "Guardando visita..." : null);

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
      <div className="panel-card rounded-[28px] p-5">
        <div className="flex flex-col gap-2 border-b border-zinc-800 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-500">
              Registro rapido
            </p>
            <h2 className="mt-2 text-lg font-semibold text-white">
              Cerramos la visita de {clientName}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
              Cargá lo esencial en el momento y dejá el resto ordenado para volver a leerlo en el
              siguiente turno.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-xs text-zinc-400">
            <p className="uppercase tracking-[0.24em] text-zinc-500">Estado</p>
            <p className="mt-1 font-semibold text-white">
              {clientIsMarciano ? "Cliente Marciano" : "Cliente regular"}
            </p>
            <p className="mt-1">El guardado admite fotos opcionales.</p>
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            <div>
              <label htmlFor="barberNotes" className="mb-1 block text-sm font-medium text-zinc-300">
                Notas del corte
              </label>
              <textarea
                id="barberNotes"
                name="barberNotes"
                rows={5}
                placeholder="Ej: pidio degradado mas alto, llego tarde, probar el nuevo producto..."
                className="w-full resize-none rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-base text-white placeholder:text-zinc-500 outline-none transition focus:border-[#8cff59]/60 focus:ring-0"
              />
              <p className="mt-2 text-xs leading-5 text-zinc-500">
                Escribí corto y útil. Esto vuelve a aparecer cuando abras el cliente.
              </p>
            </div>

            <div>
              <label htmlFor="tags" className="mb-1 block text-sm font-medium text-zinc-300">
                Tags de esta visita
              </label>
              <input
                id="tags"
                name="tags"
                placeholder="degradado-alto, trajo-amigo, llego-tarde"
                className="h-12 w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 text-base text-white placeholder:text-zinc-500 outline-none transition focus:border-[#8cff59]/60 focus:ring-0"
              />
              <p className="mt-2 text-xs leading-5 text-zinc-500">
                Separados por coma. Sirven para buscar patrones sin leer toda la nota.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
              <p className="text-sm font-medium text-zinc-200">Checklist mental</p>
              <div className="mt-3 grid gap-2 text-sm text-zinc-400 sm:grid-cols-2">
                <p>Notas breves del corte.</p>
                <p>Tags faciles de buscar.</p>
                <p>Propina si hubo.</p>
                <p>Fotos si suman contexto.</p>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
              <p className="text-sm font-medium text-zinc-200">Propina</p>
              <p className="mt-2 text-xs leading-5 text-zinc-500">
                Tocá una opción para marcar rápidamente la experiencia.
              </p>
              <div className="mt-4">
                <PropinaStars value={propina} onChange={setPropina} />
              </div>
              <p className="mt-3 text-xs text-zinc-400">
                {propina === 0
                  ? "Sin propina registrada"
                  : `${propina} punto${propina !== 1 ? "s" : ""} registrado${propina !== 1 ? "s" : ""}`}
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
              <label htmlFor="photos" className="block text-sm font-medium text-zinc-200">
                Fotos del corte
              </label>
              <p className="mt-2 text-xs leading-5 text-zinc-500">
                JPG, PNG o WEBP. Podes subir varias imagenes.
              </p>
              <input
                ref={fileInputRef}
                id="photos"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(e) => {
                  skipPhotoUploadRef.current = false;
                  setSelectedFiles(Array.from(e.target.files ?? []));
                  setError(null);
                }}
                className="mt-4 w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-zinc-300 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-3 file:py-1 file:text-sm file:font-medium file:text-zinc-200"
              />

              {selectedFiles.length > 0 ? (
                <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950/70 p-3">
                  <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">Archivos listos</p>
                  <ul className="mt-3 space-y-2">
                    {selectedFiles.map((file) => (
                      <li
                        key={`${file.name}-${file.size}-${file.lastModified}`}
                        className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-300"
                      >
                        <span className="truncate">{file.name}</span>
                        <span className="shrink-0 text-xs text-zinc-500">
                          {formatFileSize(file.size)}
                        </span>
                      </li>
                  ))}
                </ul>
              </div>
              ) : (
                <p className="mt-4 text-xs leading-5 text-zinc-500">
                  Si no agregas fotos, la visita se guarda igual.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {statusText ? (
        <div className="rounded-2xl border border-sky-500/30 bg-sky-500/12 px-4 py-3 text-sm text-sky-200">
          {statusText}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/12 p-4 text-sm text-red-200">
          <p>{error}</p>
          {selectedFiles.length > 0 ? (
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/15 px-4 text-sm font-medium text-red-200 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Reintentar
              </button>
              <button
                type="button"
                onClick={handleSaveWithoutPhoto}
                disabled={isSubmitting}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-red-500/30 bg-zinc-900 px-4 text-sm font-medium text-red-200 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Guardar sin fotos
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="neon-button flex h-14 w-full items-center justify-center rounded-[20px] text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
      >
        {statusText ?? "Guardar visita"}
      </button>
    </form>
  );
}
