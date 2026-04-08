"use client";

import { getInitials } from "@/components/caja/atencion-form-utils";

type BarberoAvatarButtonProps = {
  active: boolean;
  locked?: boolean;
  nombre: string;
  subtitle: string;
  emoji: string;
  onClick?: () => void;
};

export default function BarberoAvatarButton({
  active,
  locked,
  nombre,
  subtitle,
  emoji,
  onClick,
}: BarberoAvatarButtonProps) {
  const classes = active
    ? "border-emerald-400 bg-emerald-400 text-emerald-950 shadow-[0_20px_40px_rgba(16,185,129,0.22)]"
    : "border-zinc-700 bg-zinc-900 text-white hover:-translate-y-0.5 hover:border-zinc-600 hover:bg-zinc-800";

  const content = (
    <>
      <div
        className={`relative flex h-20 w-20 items-center justify-center rounded-full border text-xl font-semibold ${
          active
            ? "border-emerald-950/10 bg-emerald-950/10 text-emerald-950"
            : "border-zinc-700 bg-zinc-800 text-zinc-300"
        }`}
      >
        <span>{getInitials(nombre)}</span>
        <span className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border border-white bg-zinc-950 text-xs font-semibold text-white">
          {emoji}
        </span>
      </div>
      <div className="mt-4 text-center">
        <p className="text-base font-semibold">{nombre}</p>
        <p className={`mt-1 text-sm ${active ? "text-emerald-950/80" : "text-zinc-400"}`}>
          {subtitle}
        </p>
      </div>
    </>
  );

  if (locked) {
    return <div className={`rounded-[28px] border p-4 transition ${classes}`}>{content}</div>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[28px] border p-4 transition ${classes}`}
    >
      {content}
    </button>
  );
}
