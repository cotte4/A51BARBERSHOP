"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  isActive: (pathname: string) => boolean;
};

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M3 10.5L12 3l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.5 9.5V21h13V9.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.5 21v-6.5h5V21" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M7.5 3.5V7M16.5 3.5V7M3.5 9.5h17" strokeLinecap="round" />
    </svg>
  );
}

function AlienIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
      <ellipse cx="12" cy="10" rx="7" ry="8.5" />
      <ellipse cx="9" cy="9.5" rx="2" ry="2.8" />
      <ellipse cx="15" cy="9.5" rx="2" ry="2.8" />
      <path d="M9.5 16.5c.7.7 4.3.7 5 0" strokeLinecap="round" />
      <path d="M5.5 5.5C4 3.5 3 2 3 2M18.5 5.5C20 3.5 21 2 21 2" strokeLinecap="round" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" strokeLinecap="round" />
    </svg>
  );
}

function PendingGlyph() {
  return (
    <span className="absolute right-2.5 top-2.5 flex h-3.5 w-3.5 items-center justify-center">
      <span className="absolute h-3.5 w-3.5 rounded-full bg-current/18 animate-ping" />
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
    </span>
  );
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/marciano",
    label: "Inicio",
    icon: <HomeIcon />,
    isActive: (p: string) => p === "/marciano",
  },
  {
    href: "/marciano/turnos",
    label: "Turnos",
    icon: <CalendarIcon />,
    isActive: (p: string) => p.startsWith("/marciano/turnos"),
  },
  {
    href: "/marciano/estilo",
    label: "Mi Estilo",
    icon: <AlienIcon />,
    isActive: (p: string) => p.startsWith("/marciano/estilo"),
  },
  {
    href: "/marciano/perfil",
    label: "Perfil",
    icon: <UserIcon />,
    isActive: (p: string) => p.startsWith("/marciano/perfil") || p.startsWith("/marciano/seguridad"),
  },
];

function NavLinkBody({
  icon,
  label,
  active,
  optimisticPending,
}: {
  icon: ReactNode;
  label: string;
  active: boolean;
  optimisticPending: boolean;
}) {
  const { pending } = useLinkStatus();
  const busy = pending || optimisticPending;

  return (
    <>
      {busy ? <PendingGlyph /> : null}

      <span
        className={`relative transition-transform duration-200 ${
          busy ? "scale-110 text-white" : active ? "" : ""
        }`}
      >
        {icon}
      </span>
      <span className={`mt-1 leading-none transition-colors duration-200 ${busy ? "text-white" : ""}`}>
        {label}
      </span>

      <span
        aria-hidden
        className={`absolute inset-x-3 bottom-1.5 h-0.5 overflow-hidden rounded-full transition-opacity duration-150 ${
          busy ? "opacity-100" : "opacity-0"
        }`}
      >
        <span className="absolute inset-0 rounded-full bg-current/12" />
        <span className="block h-full w-8 rounded-full bg-current animate-[a51-nav-glide_900ms_ease-in-out_infinite]" />
      </span>
    </>
  );
}

export default function MarcianoBottomNav() {
  const pathname = usePathname();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  return (
    <nav className="fixed inset-x-0 bottom-4 z-30 px-3 sm:px-4">
      <div className="mx-auto max-w-4xl rounded-[28px] border border-zinc-800 bg-zinc-950/94 px-2 py-2 shadow-[0_22px_50px_rgba(0,0,0,0.42)] backdrop-blur">
        <div className="grid grid-cols-4 gap-1">
          {NAV_ITEMS.map((item) => {
            const active = item.isActive(pathname);
            const optimisticPending = pendingHref === item.href && !active;
            const highlighted = active || optimisticPending;

            return (
              <Link
                key={item.href}
                href={item.href}
                onNavigate={() => {
                  if (!active) {
                    setPendingHref(item.href);
                  }
                }}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-h-[58px] flex-col items-center justify-center rounded-[20px] px-1 py-2 text-center text-[11px] font-semibold transition duration-200 ${
                  highlighted
                    ? optimisticPending
                      ? "bg-white/8 text-zinc-100 shadow-[0_10px_24px_rgba(255,255,255,0.06)]"
                      : "bg-[#8cff59] text-[#07130a] shadow-[0_12px_24px_rgba(140,255,89,0.18)]"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <NavLinkBody
                  icon={item.icon}
                  label={item.label}
                  active={active}
                  optimisticPending={optimisticPending}
                />
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
