"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import {
  createClientAction,
  type ClientFormState,
} from "@/app/(barbero)/clientes/actions";
import ClientAvatarUploader from "@/components/clientes/ClientAvatarUploader";

const initialState: ClientFormState = {};

type ClientCreateFormProps = {
  isAdmin: boolean;
};

const inputClass =
  "h-12 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-[#8cff59]/60 focus:outline-none";
const textareaClass =
  "min-h-[120px] w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-[#8cff59]/60 focus:outline-none";
const helpClass = "mt-1 text-xs leading-5 text-zinc-500";
const fieldErrorClass = "mt-1 text-sm text-red-300";

function FieldBlock({
  htmlFor,
  label,
  description,
  error,
  children,
}: {
  htmlFor: string;
  label: string;
  description?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="space-y-1">
        <label htmlFor={htmlFor} className="block text-sm font-medium text-zinc-200">
          {label}
        </label>
        {description ? <p className={helpClass}>{description}</p> : null}
      </div>
      {children}
      {error ? <p className={fieldErrorClass}>{error}</p> : null}
    </div>
  );
}

export default function ClientCreateForm({ isAdmin }: ClientCreateFormProps) {
  const [state, action, pending] = useActionState(createClientAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const confirmDuplicateRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!state.possibleDuplicates?.length && confirmDuplicateRef.current) {
      confirmDuplicateRef.current.value = "false";
    }
  }, [state.possibleDuplicates]);

  const duplicateCandidates = state.possibleDuplicates ?? [];
  const hasDuplicateCandidates = duplicateCandidates.length > 0;

  function handleCreateAnyway() {
    if (confirmDuplicateRef.current) {
      confirmDuplicateRef.current.value = "true";
    }

    formRef.current?.requestSubmit();
  }

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <input
        ref={confirmDuplicateRef}
        type="hidden"
        name="confirmDuplicate"
        defaultValue="false"
      />

      <div className="panel-card rounded-[28px] p-5 lg:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-800 pb-5">
          <div className="space-y-2">
            <p className="eyebrow text-[11px] font-semibold">Registro base</p>
            <h2 className="text-xl font-semibold text-white">Identidad y contacto</h2>
            <p className="max-w-2xl text-sm leading-6 text-zinc-400">
              El formulario prioriza lo que evita duplicados y deja el siguiente corte mejor
              documentado.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-xs text-zinc-400">
            <p className="font-medium text-zinc-200">Orden sugerido</p>
            <p className="mt-1 leading-5">Nombre, telefono, foto y despues contexto.</p>
          </div>
        </div>

        <div className="mt-5 space-y-5">
          <div className="rounded-[24px] border border-zinc-800 bg-zinc-950/60 p-4">
            <div className="space-y-1">
              <p className="eyebrow text-[11px] font-semibold">Foto</p>
              <p className="text-sm leading-6 text-zinc-300">
                Sube un avatar si ayuda a reconocerlo mas rapido en la ficha.
              </p>
            </div>
            <div className="mt-4">
              <ClientAvatarUploader />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FieldBlock
              htmlFor="name"
              label="Nombre"
              description="Tal como queres que aparezca en clientes y en el historial."
              error={state.fieldErrors?.name}
            >
              <input
                id="name"
                name="name"
                required
                autoComplete="name"
                className={inputClass}
              />
            </FieldBlock>

            <FieldBlock
              htmlFor="phoneRaw"
              label="Telefono"
              description="Sirve para ubicarlo rapido y detectar coincidencias."
              error={state.fieldErrors?.phoneRaw}
            >
              <input
                id="phoneRaw"
                name="phoneRaw"
                autoComplete="tel"
                className={inputClass}
              />
            </FieldBlock>
          </div>

          {isAdmin ? (
            <div className="rounded-[24px] border border-[#8cff59]/20 bg-[#8cff59]/10 p-4">
              <div className="space-y-1">
                <p className="eyebrow text-[11px] font-semibold">Acceso Marciano</p>
                <p className="text-sm leading-6 text-zinc-300">
                  Solo visible para admins. Si este cliente entra al portal, cargalo aca.
                </p>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <FieldBlock
                  htmlFor="email"
                  label="Email Marciano"
                  description="Usalo para vincular la cuenta del portal."
                  error={state.fieldErrors?.email}
                >
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="cliente@email.com"
                    className={inputClass}
                  />
                </FieldBlock>

                <label className="flex h-full items-center gap-3 rounded-xl border border-zinc-700 px-4 py-3 text-sm text-zinc-200">
                  <input
                    type="checkbox"
                    name="esMarciano"
                    className="size-4 rounded border-zinc-600 bg-zinc-900"
                  />
                  Crear como Marciano
                </label>
              </div>
            </div>
          ) : null}

          <div className="rounded-[24px] border border-zinc-800 bg-zinc-950/60 p-4">
            <div className="space-y-1">
              <p className="eyebrow text-[11px] font-semibold">Contexto del cliente</p>
              <p className="text-sm leading-6 text-zinc-300">
                Todo lo que ayude al siguiente corte sin volver a preguntar.
              </p>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <FieldBlock
                htmlFor="tags"
                label="Tags"
                description="Separados por coma. Ej: puntual, trae-referidos, corte-clasico."
              >
                <input
                  id="tags"
                  name="tags"
                  placeholder="puntual, trae-referidos, corte-clasico"
                  className={inputClass}
                />
              </FieldBlock>

              <FieldBlock
                htmlFor="allergies"
                label="Alergias"
                description="Clave para cuidar productos y procesos."
              >
                <input id="allergies" name="allergies" className={inputClass} />
              </FieldBlock>

              <FieldBlock
                htmlFor="productPreferences"
                label="Preferencias de producto"
                description="Ej: cera mate, shampoo suave, sin perfume."
              >
                <input id="productPreferences" name="productPreferences" className={inputClass} />
              </FieldBlock>

              <FieldBlock
                htmlFor="extraNotes"
                label="Extra preferencias"
                description="Cualquier detalle que quieras que el equipo recuerde."
              >
                <input id="extraNotes" name="extraNotes" className={inputClass} />
              </FieldBlock>
            </div>

            <div className="mt-4">
              <FieldBlock
                htmlFor="notes"
                label="Nota general"
                description="Visible en la ficha para dejar contexto rapido."
              >
                <textarea id="notes" name="notes" rows={4} className={textareaClass} />
              </FieldBlock>
            </div>
          </div>
        </div>
      </div>

      {state.error ? (
        <div className="rounded-[24px] border border-amber-500/30 bg-amber-500/15 p-4 text-sm text-amber-200">
          <div className="space-y-1">
            <p className="font-semibold text-amber-100">Revisar antes de guardar</p>
            <p>{state.error}</p>
          </div>

          {hasDuplicateCandidates ? (
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-amber-500/25 bg-zinc-950/50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">
                  Posibles coincidencias
                </p>
                <ul className="mt-3 space-y-2 text-sm text-zinc-100">
                  {duplicateCandidates.map((duplicate) => (
                    <li
                      key={duplicate.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2"
                    >
                      <span className="font-medium">{duplicate.name}</span>
                      <span className="text-xs text-zinc-400">
                        {duplicate.phoneRaw ?? "Sin telefono"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={handleCreateAnyway}
                  disabled={pending}
                  className="ghost-button inline-flex h-12 items-center justify-center rounded-[20px] px-4 text-sm font-semibold disabled:opacity-60"
                >
                  Crear igual
                </button>
                <p className="text-xs leading-5 text-amber-100/80">
                  Si ya existe, revisalo antes. Si igual queres crear el perfil, este boton
                  confirma la accion.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="panel-soft rounded-[24px] p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-white">Listo para guardar</p>
            <p className="text-sm leading-6 text-zinc-400">
              Se crea el perfil base con foto, tags, preferencias y notas.
            </p>
          </div>

          <button
            type="submit"
            disabled={pending}
            className="neon-button inline-flex h-12 items-center justify-center rounded-[20px] px-5 text-sm font-semibold disabled:opacity-60"
          >
            {pending ? "Guardando..." : "Crear cliente"}
          </button>
        </div>
      </div>
    </form>
  );
}
