"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

function SparklesIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2" strokeLinecap="round" />
      <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" />
      <path d="M5.6 5.6l1.4 1.4M16.9 16.9l1.5 1.5M5.6 18.4l1.4-1.4M16.9 7.1l1.5-1.5" strokeLinecap="round" />
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

const NAV_ITEMS = [
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
    icon: <SparklesIcon />,
    isActive: (p: string) => p.startsWith("/marciano/estilo"),
  },
  {
    href: "/marciano/perfil",
    label: "Perfil",
    icon: <UserIcon />,
    isActive: (p: string) => p.startsWith("/marciano/perfil") || p.startsWith("/marciano/seguridad"),
  },
];

export default function MarcianoBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-4 z-30 px-3 sm:px-4">
      <div className="mx-auto max-w-4xl rounded-[28px] border border-zinc-800 bg-zinc-950/94 px-2 py-2 shadow-[0_22px_50px_rgba(0,0,0,0.42)] backdrop-blur">
        <div className="grid grid-cols-4 gap-1">
          {NAV_ITEMS.map((item) => {
            const active = item.isActive(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-[58px] flex-col items-center justify-center rounded-[20px] px-1 py-2 text-center text-[11px] font-semibold transition ${
                  active
                    ? "bg-[#8cff59] text-[#07130a] shadow-[0_12px_24px_rgba(140,255,89,0.18)]"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span>{item.icon}</span>
                <span className="mt-1 leading-none">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
