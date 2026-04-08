"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type FormEvent } from "react";
import { createVisitLogAction } from "@/app/(barbero)/clientes/actions";

type PostCorteFormProps = {
  clientId: string;
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

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function PropinaSelector({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  const levels = [
    {
      n: 1,
      label: "Bronce",
      stars: "\u2605",
      activeClass:
        "border-amber-500/60 bg-amber-500/15 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.12)]",
    },
    {
      n: 2,
      label: "Plata",
      stars: "\u2605\u2605",
      activeClass:
        "border-sky-400/60 bg-sky-400/15 text-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.12)]",
    },
    {
      n: 3,
      label: "Verde",
      stars: "\u2605\u2605\u2605",
      activeClass:
        "border-[#8cff59]/50 bg-[#8cff59]/12 text-[#b9ff96] shadow-[0_0_12px_rgba(140,255,89,0.1)]",
    },
  ];

  return (
    <div className="flex gap-3">
      {levels.map(({ n, label, stars, activeClass }) => {
        const selected = value === n;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(value === n ? 0 : n)}
            aria-label={label}
            aria-pressed={selected}
            className={[
              "flex flex-1 flex-col items-center gap-1.5 rounded-2xl border py-3 transition",
              selected
                ? activeClass
                : "border-zinc-700 bg-zinc-900 text-zinc-500 hover:border-zinc-600 hover:bg-zinc-800 hover:text-zinc-300",
            ].join(" ")}
          >
            <span className="text-xl">{stars}</span>
            <span className="text-xs font-medium">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function PostCorteForm({ clientId }: PostCorteFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const skipPhotoUploadRef = useRef(false);
  const [isPending, startTransition] = useTransition();
  const [propina, setPropina] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState("");
  const [corteNombre, setCorteNombre] = useState("");
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggleTag(tag: string) {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  function addCustomTag() {
    const trimmed = customTagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed]);
    }
    setCustomTagInput("");
  }

  function removeTag(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag));
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    skipPhotoUploadRef.current = false;
    const files = Array.from(e.target.files ?? []);
    setSelectedFiles(files);
    setError(null);

    const urls: string[] = new Array(files.length).fill("");
    let loaded = 0;
    files.forEach((file, i) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        urls[i] = ev.target?.result as string;
        loaded += 1;
        if (loaded === files.length) setThumbnails([...urls]);
      };
      reader.readAsDataURL(file);
    });
    if (files.length === 0) setThumbnails([]);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formEl = e.currentTarget;
    const fd = new FormData(formEl);
    const barberNotes = String(fd.get("barberNotes") ?? "").trim() || null;
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
            setError(body.error ?? "No se pudo subir la foto.");
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
        corteNombre: corteNombre.trim() || null,
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
    setThumbnails([]);
    setUploadProgress(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    formRef.current?.requestSubmit();
  }

  const isSubmitting = isPending || Boolean(uploadProgress);
  const statusText = uploadProgress ?? (isPending ? "Guardando visita..." : null);

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
      <section className="rounded-[28px] border border-zinc-800 bg-[linear-gradient(180deg,rgba(24,24,27,0.98),rgba(9,9,11,0.98))] p-5 shadow-[0_18px_36px_rgba(0,0,0,0.26)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
              Sesion
            </p>
            <h2 className="mt-1 text-lg font-semibold text-white">Cerrar corte y guardar memoria</h2>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
            <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1">notas</span>
            <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1">tags</span>
            <span className="rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1">fotos</span>
          </div>
        </div>
      </section>

      <div className="panel-card space-y-6 rounded-[28px] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-500">
              Libro de cortes
            </p>
            <h3 className="mt-1 text-lg font-semibold text-white">Que paso en esta sesion</h3>
          </div>
        </div>

        <div>
          <label htmlFor="barberNotes" className="mb-1.5 block text-sm font-medium text-zinc-300">
            Brief del corte
          </label>
          <textarea
            id="barberNotes"
            name="barberNotes"
            rows={4}
            placeholder="Ej: pidio degradado mas alto, vino apurado, mantener laterales cortos, ofrecer producto nuevo..."
            className="w-full resize-none rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-base text-white placeholder:text-zinc-500 outline-none transition focus:border-[#8cff59]/60"
          />
          <p className="mt-2 text-xs text-zinc-500">
            Deja una nota corta y accionable para el proximo barbero.
          </p>
        </div>

        <div>
          <label className="text-sm font-medium text-zinc-300">Nombre del corte</label>
          <input
            type="text"
            placeholder="Ej: Taper Fade bajo, French Crop..."
            value={corteNombre}
            onChange={(e) => setCorteNombre(e.target.value)}
            className="mt-1 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-white placeholder:text-zinc-500 focus:border-[#8cff59]/60 focus:outline-none"
          />
        </div>

        <div>
          <div className="mb-1.5 space-y-1">
            <label className="block text-sm font-medium text-zinc-300">Tags</label>
            <p className="text-xs text-zinc-500">
              Marca rapido el tipo de corte, contexto o comportamiento.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {QUICK_TAGS.map((tag) => {
              const active = tags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={[
                    "rounded-full border px-3 py-1.5 text-sm font-medium transition",
                    active
                      ? "border-[#8cff59]/40 bg-[#8cff59]/12 text-[#b9ff96]"
                      : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200",
                  ].join(" ")}
                >
                  {tag}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex gap-2">
            <input
              value={customTagInput}
              onChange={(e) => setCustomTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCustomTag();
                }
              }}
              placeholder="Tag personalizado..."
              className="h-10 flex-1 rounded-2xl border border-zinc-700 bg-zinc-900 px-4 text-sm text-white placeholder:text-zinc-500 outline-none transition focus:border-[#8cff59]/60"
            />
            <button
              type="button"
              onClick={addCustomTag}
              className="h-10 rounded-2xl border border-zinc-700 bg-zinc-900 px-4 text-sm font-medium text-zinc-300 transition hover:border-zinc-600 hover:bg-zinc-800"
            >
              + Agregar
            </button>
          </div>

          {tags.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#8cff59]/25 bg-[#8cff59]/8 px-2.5 py-0.5 text-xs font-medium text-[#8cff59]"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    aria-label={`Quitar ${tag}`}
                    className="leading-none text-[#8cff59]/60 hover:text-[#8cff59]"
                  >
                    x
                  </button>
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-300">Propina</label>
          <PropinaSelector value={propina} onChange={setPropina} />
          <p className="mt-2 text-xs text-zinc-500">
            Usalo como termometro rapido de la experiencia.
          </p>
        </div>

        <div>
          <div className="mb-1.5 space-y-1">
            <label className="block text-sm font-medium text-zinc-300">Fotos del corte</label>
            <p className="text-xs text-zinc-500">
              Una buena foto convierte este corte en referencia real para la proxima visita.
            </p>
          </div>

          <input
            ref={fileInputRef}
            id="photos"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleFileChange}
            className="sr-only"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl border border-zinc-700 bg-zinc-900 text-sm font-medium text-zinc-300 transition hover:border-zinc-600 hover:bg-zinc-800 hover:text-white"
          >
            <CameraIcon />
            {selectedFiles.length > 0
              ? `${selectedFiles.length} foto${selectedFiles.length !== 1 ? "s" : ""} seleccionada${selectedFiles.length !== 1 ? "s" : ""}`
              : "Tomar / Subir fotos"}
          </button>

          {thumbnails.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {thumbnails.map((src, i) => (
                <div
                  key={i}
                  className="relative h-20 w-20 overflow-hidden rounded-xl border border-zinc-700"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`Foto ${i + 1}`} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          ) : null}
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
        {statusText ?? "Cerrar y guardar sesion"}
      </button>
    </form>
  );
}
