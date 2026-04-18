import Link from "next/link";
import type { ReactNode } from "react";

type MarcianoPublicShellProps = {
  badge: string;
  title: string;
  description: string;
  sideTitle: string;
  sideDescription: string;
  notes: Array<{ label: string; value: string }>;
  highlight?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export default function MarcianoPublicShell({
  badge,
  title,
  description,
  sideTitle,
  sideDescription,
  notes,
  highlight,
  children,
  footer,
}: MarcianoPublicShellProps) {
  return (
    <div className="mx-auto flex min-h-screen max-w-6xl items-start px-4 py-4 sm:px-6 sm:py-8 lg:items-center lg:px-8 lg:py-12">
      <div className="grid w-full gap-6 lg:grid-cols-[1fr_0.98fr] lg:gap-8">
        <section className="public-panel relative hidden overflow-hidden rounded-[36px] p-8 lg:block">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-12 top-8 h-52 w-52 rounded-full bg-[#8cff59]/10 blur-3xl" />
            <div className="absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-[#8cff59]/50 to-transparent" />
            <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(255,255,255,0.03),transparent_36%,rgba(140,255,89,0.04)_100%)]" />
          </div>

          <div className="relative flex h-full flex-col justify-between">
            <div>
              <p className="public-badge inline-flex rounded-full px-3 py-1.5 text-[11px] font-semibold">
                {badge}
              </p>
              <h1 className="mt-6 font-display text-5xl font-semibold leading-[0.94] text-white">
                {sideTitle}
              </h1>
              <p className="mt-5 max-w-lg text-base leading-7 text-zinc-300">{sideDescription}</p>
            </div>

            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {notes.map((note) => (
                  <div
                    key={note.label}
                    className="rounded-[24px] border border-white/10 bg-black/20 px-4 py-4"
                  >
                    <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                      {note.label}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-white">{note.value}</p>
                  </div>
                ))}
              </div>

              {highlight ? (
                <div className="rounded-[26px] border border-[#8cff59]/20 bg-[#8cff59]/8 px-5 py-4 text-sm text-zinc-200">
                  {highlight}
                </div>
              ) : null}
            </div>
          </div>
        </section>

        <section className="public-panel relative overflow-hidden rounded-[32px] border border-white/10 p-5 sm:rounded-[36px] sm:p-8">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-8 top-0 h-24 w-24 rounded-full bg-[#8cff59]/10 blur-3xl" />
            <div className="absolute bottom-0 right-0 h-28 w-28 rounded-full bg-white/5 blur-3xl" />
          </div>

          <div className="relative">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-zinc-400">
                {badge}
              </p>
              <Link
                href="/"
                className="inline-flex min-h-[42px] items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3.5 text-sm font-medium text-zinc-300 transition hover:border-[#8cff59]/22 hover:text-[#8cff59]"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5M12 5l-7 7 7 7" />
                </svg>
                Volver
              </Link>
            </div>

            <h1 className="mt-4 font-display text-[2.35rem] font-semibold leading-[0.95] text-white sm:text-5xl">
              {title}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-400 sm:text-base">
              {description}
            </p>

            <div className="mt-5 space-y-3 lg:hidden">
              <div className="grid grid-cols-2 gap-3">
                {notes.map((note) => (
                  <div
                    key={note.label}
                    className="flex min-h-[84px] flex-col justify-between rounded-[22px] border border-white/10 bg-black/20 px-4 py-3"
                  >
                    <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                      {note.label}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-white">{note.value}</p>
                  </div>
                ))}
              </div>

              {highlight ? (
                <div className="rounded-[22px] border border-[#8cff59]/20 bg-[#8cff59]/8 px-4 py-3 text-sm text-zinc-200">
                  {highlight}
                </div>
              ) : null}
            </div>

            <div className="mt-7 sm:mt-8">{children}</div>

            {footer ? <div className="mt-5 sm:mt-6">{footer}</div> : null}
          </div>
        </section>
      </div>
    </div>
  );
}
