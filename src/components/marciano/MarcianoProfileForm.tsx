"use client";

import { useActionState } from "react";
import {
  updateMarcianoProfileAction,
  type MarcianoProfileState,
} from "@/app/marciano/actions";

const initialState: MarcianoProfileState = {};

type MarcianoProfileFormProps = {
  client: {
    name: string;
    email: string | null;
    phoneRaw: string | null;
    preferences: {
      allergies?: string;
      productPreferences?: string;
      extraNotes?: string;
    } | null;
  };
};

export default function MarcianoProfileForm({ client }: MarcianoProfileFormProps) {
  const [state, formAction, pending] = useActionState(updateMarcianoProfileAction, initialState);

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <ProfilePill label="Nombre" value={client.name} />
        <ProfilePill label="Email" value={client.email ?? "Sin email"} />
        <ProfilePill label="Telefono" value={client.phoneRaw ?? "Pendiente"} />
      </div>

      <div className="grid gap-4">
        <div>
          <label htmlFor="name" className="mb-2 block text-sm font-medium text-zinc-300">
            Nombre
          </label>
          <input
            id="name"
            name="name"
            required
            defaultValue={client.name}
            className="h-12 w-full rounded-2xl border border-zinc-700 bg-zinc-950/75 px-4 text-zinc-50 outline-none focus:border-[#8cff59] focus:ring-2 focus:ring-[#8cff59]/20"
          />
          {state.fieldErrors?.name ? <p className="mt-2 text-sm text-rose-300">{state.fieldErrors.name}</p> : null}
        </div>

        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-medium text-zinc-300">
            Email de acceso
          </label>
          <input
            id="email"
            name="email"
            value={client.email ?? ""}
            disabled
            className="h-12 w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 text-sm text-zinc-500"
          />
        </div>

        <div>
          <label htmlFor="phoneRaw" className="mb-2 block text-sm font-medium text-zinc-300">
            Telefono
          </label>
          <input
            id="phoneRaw"
            name="phoneRaw"
            defaultValue={client.phoneRaw ?? ""}
            className="h-12 w-full rounded-2xl border border-zinc-700 bg-zinc-950/75 px-4 text-zinc-50 outline-none focus:border-[#8cff59] focus:ring-2 focus:ring-[#8cff59]/20"
          />
          {state.fieldErrors?.phoneRaw ? (
            <p className="mt-2 text-sm text-rose-300">{state.fieldErrors.phoneRaw}</p>
          ) : null}
        </div>

        <div>
          <label htmlFor="allergies" className="mb-2 block text-sm font-medium text-zinc-300">
            Alergias
          </label>
          <input
            id="allergies"
            name="allergies"
            defaultValue={client.preferences?.allergies ?? ""}
            className="h-12 w-full rounded-2xl border border-zinc-700 bg-zinc-950/75 px-4 text-zinc-50 outline-none focus:border-[#8cff59] focus:ring-2 focus:ring-[#8cff59]/20"
          />
        </div>

        <div>
          <label htmlFor="productPreferences" className="mb-2 block text-sm font-medium text-zinc-300">
            Preferencias de producto
          </label>
          <input
            id="productPreferences"
            name="productPreferences"
            defaultValue={client.preferences?.productPreferences ?? ""}
            className="h-12 w-full rounded-2xl border border-zinc-700 bg-zinc-950/75 px-4 text-zinc-50 outline-none focus:border-[#8cff59] focus:ring-2 focus:ring-[#8cff59]/20"
          />
        </div>

        <div>
          <label htmlFor="extraNotes" className="mb-2 block text-sm font-medium text-zinc-300">
            Notas de preferencia
          </label>
          <textarea
            id="extraNotes"
            name="extraNotes"
            rows={4}
            defaultValue={client.preferences?.extraNotes ?? ""}
            className="w-full rounded-2xl border border-zinc-700 bg-zinc-950/75 px-4 py-3 text-zinc-50 outline-none focus:border-[#8cff59] focus:ring-2 focus:ring-[#8cff59]/20"
          />
        </div>
      </div>

      {state.message ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-zinc-200">
          {state.message}
        </div>
      ) : null}

      <div className="rounded-[24px] border border-[#8cff59]/20 bg-[#8cff59]/8 p-4 text-sm text-zinc-300">
        Guardar este perfil no cambia tu acceso interno, solo deja mejor preparada tu visita.
      </div>

      <button
        type="submit"
        disabled={pending}
        className="neon-button h-12 w-full rounded-2xl text-base font-semibold disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}

function ProfilePill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
