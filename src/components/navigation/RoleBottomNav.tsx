"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

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

function WalletIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6.5A2.5 2.5 0 0 1 4 16.5v-9Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 8h12.5A2.5 2.5 0 0 0 19 5.5V5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15.5 13h4" strokeLinecap="round" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M15 19a4 4 0 0 0-8 0" strokeLinecap="round" />
      <circle cx="11" cy="10" r="3.25" />
      <path d="M19.5 18.5a3.5 3.5 0 0 0-2.8-3.42" strokeLinecap="round" />
      <path d="M16 6.75a3 3 0 1 1 0 6" strokeLinecap="round" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M7.5 3.5V7" strokeLinecap="round" />
      <path d="M16.5 3.5V7" strokeLinecap="round" />
      <path d="M3.5 9.5h17" />
      <path d="M8 13h3" strokeLinecap="round" />
      <path d="M8 16h6" strokeLinecap="round" />
    </svg>
  );
}


function MusicIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M8 18a2.5 2.5 0 1 1-2.5-2.5A2.5 2.5 0 0 1 8 18Z" />
      <path d="M18.5 16.5A2.5 2.5 0 1 1 16 14a2.5 2.5 0 0 1 2.5 2.5Z" />
      <path d="M8 18V7.5l10-2V16" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M8 21h8M12 17v4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 3H3v5a4 4 0 0 0 4 4h1" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 3h2v5a4 4 0 0 1-4 4h-1" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 3h10v8a5 5 0 0 1-10 0V3Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ResultadoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M6 20V14" strokeLinecap="round" />
      <path d="M10 20V10" strokeLinecap="round" />
      <path d="M14 20V13" strokeLinecap="round" />
      <path d="M18 20V7" strokeLinecap="round" />
      <path d="M3 20h18" strokeLinecap="round" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M3 17l4-6 4 3 4-8 4 4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 21h18" strokeLinecap="round" />
    </svg>
  );
}


function FinanzasIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v1.5m0 7V17m0-8.5c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2" strokeLinecap="round" />
    </svg>
  );
}

function ScissorsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
      <circle cx="6" cy="6" r="2.5" />
      <circle cx="6" cy="18" r="2.5" />
      <path d="M8.5 6 20 12 8.5 18" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ClipboardCheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M9 5H7a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9 13l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CashIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
      <rect x="2.5" y="6.5" width="19" height="11" rx="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 9.5v5M18 9.5v5" strokeLinecap="round" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" strokeLinecap="round" />
      <path d="M12 2v2m0 16v2M2 12h2m16 0h2" strokeLinecap="round" />
    </svg>
  );
}

const BARBERO_NAV_ITEMS: NavItem[] = [
  {
    href: "/hoy",
    label: "Hoy",
    icon: <HomeIcon />,
    isActive: (pathname) => pathname === "/hoy",
  },
  {
    href: "/caja",
    label: "Caja",
    icon: <WalletIcon />,
    isActive: (pathname) => pathname.startsWith("/caja"),
  },
  {
    href: "/clientes",
    label: "Clientes",
    icon: <UsersIcon />,
    isActive: (pathname) => pathname.startsWith("/clientes"),
  },
  {
    href: "/turnos",
    label: "Turnos",
    icon: <CalendarIcon />,
    isActive: (pathname) => pathname.startsWith("/turnos"),
  },
  {
    href: "/mi-progreso",
    label: "Progreso",
    icon: <TrophyIcon />,
    isActive: (pathname) => pathname.startsWith("/mi-progreso"),
  },
];

const ADMIN_NAV_LEFT: NavItem[] = [
  {
    href: "/hoy",
    label: "Hoy",
    icon: <HomeIcon />,
    isActive: (pathname) => pathname === "/hoy" || pathname.startsWith("/hoy/"),
  },
  {
    href: "/caja",
    label: "Caja",
    icon: <ScissorsIcon />,
    isActive: (pathname) =>
      pathname === "/caja" ||
      pathname === "/caja/nueva" ||
      pathname === "/caja/vender" ||
      (pathname.startsWith("/caja/") && !pathname.startsWith("/caja/cierre")),
  },
  {
    href: "/caja/cierre",
    label: "Cierre",
    icon: <ClipboardCheckIcon />,
    isActive: (pathname) => pathname.startsWith("/caja/cierre"),
  },
  {
    href: "/gastos-rapidos",
    label: "Gasto",
    icon: <CashIcon />,
    isActive: (pathname) => pathname.startsWith("/gastos-rapidos"),
  },
];

const ADMIN_NAV_RIGHT: NavItem[] = [
  {
    href: "/dashboard",
    label: "Gestión",
    icon: <ChartIcon />,
    isActive: (pathname) =>
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/liquidaciones") ||
      pathname.startsWith("/inventario") ||
      pathname.startsWith("/repago") ||
      pathname.startsWith("/mi-resultado") ||
      pathname.startsWith("/turnos") ||
      pathname.startsWith("/clientes"),
  },
  {
    href: "/configuracion",
    label: "Config",
    icon: <SettingsIcon />,
    isActive: (pathname) => pathname.startsWith("/configuracion"),
  },
];

function getAsesorNavItems(): NavItem[] {
  return [
    {
      href: "/dashboard",
      label: "Hoy",
      icon: <ChartIcon />,
      isActive: (pathname) => pathname.startsWith("/dashboard"),
    },
    {
      href: "/mi-resultado",
      label: "Resultado",
      icon: <ResultadoIcon />,
      isActive: (pathname) => pathname.startsWith("/mi-resultado"),
    },
    {
      href: "/finanzas",
      label: "Costos",
      icon: <FinanzasIcon />,
      isActive: (pathname) => pathname.startsWith("/finanzas"),
    },
    {
      href: "/configuracion",
      label: "Ajustes",
      icon: <SettingsIcon />,
      isActive: (pathname) =>
        pathname.startsWith("/configuracion") ||
        pathname.startsWith("/negocio") ||
        pathname.startsWith("/inventario"),
    },
  ];
}

export default function RoleBottomNav({
  isAdmin,
  isAsesor = false,
}: {
  isAdmin: boolean;
  isAsesor?: boolean;
}) {
  const pathname = usePathname();

  if (isAsesor) {
    const asesorItems = getAsesorNavItems();
    return (
      <nav className="fixed inset-x-0 bottom-4 z-30 px-3 sm:px-4">
        <div className="mx-auto max-w-4xl rounded-[28px] border border-zinc-800 bg-zinc-950/94 px-2 py-2 shadow-[0_22px_50px_rgba(0,0,0,0.42)] backdrop-blur">
          <div className="grid grid-cols-4 gap-1">
            {asesorItems.map((item) => {
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

  if (isAdmin) {
    return (
      <nav className="fixed inset-x-0 bottom-4 z-30 px-3 sm:px-4">
        <div className="mx-auto max-w-4xl rounded-[28px] border border-zinc-800 bg-zinc-950/94 px-2 py-2 shadow-[0_22px_50px_rgba(0,0,0,0.42)] backdrop-blur">
          <div className="flex items-center gap-1">
            {/* Grupo izquierdo — Operación del día */}
            <div className="grid flex-1 grid-cols-4 gap-1">
              {ADMIN_NAV_LEFT.map((item) => {
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

            {/* Divisor vertical */}
            <div className="mx-1 h-10 w-px shrink-0 rounded-full bg-zinc-700/60" />

            {/* Grupo derecho — Gestión */}
            <div className="grid grid-cols-2 gap-1">
              {ADMIN_NAV_RIGHT.map((item) => {
                const active = item.isActive(pathname);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex min-h-[58px] flex-col items-center justify-center rounded-[20px] px-2 py-2 text-center text-[11px] font-semibold transition ${
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
        </div>
      </nav>
    );
  }

  return (
    <nav className="fixed inset-x-0 bottom-4 z-30 px-3 sm:px-4">
      <div className="mx-auto max-w-4xl rounded-[28px] border border-zinc-800 bg-zinc-950/94 px-2 py-2 shadow-[0_22px_50px_rgba(0,0,0,0.42)] backdrop-blur">
        <div className="grid grid-cols-5 gap-1">
          {BARBERO_NAV_ITEMS.map((item) => {
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
