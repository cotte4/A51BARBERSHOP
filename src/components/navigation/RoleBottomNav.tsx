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

function BriefcaseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
      <rect x="3.5" y="6.5" width="17" height="12" rx="2.5" />
      <path d="M9 6.5V5.75A1.75 1.75 0 0 1 10.75 4h2.5A1.75 1.75 0 0 1 15 5.75v.75" />
      <path d="M3.5 11.5h17" />
      <path d="M10 11.5v2h4v-2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function getNavItems(isAdmin: boolean): NavItem[] {
  const items: NavItem[] = [
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
  ];

  if (isAdmin) {
    items.push({
      href: "/negocio",
      label: "Negocio",
      icon: <BriefcaseIcon />,
      isActive: (pathname) =>
        pathname.startsWith("/negocio") ||
        pathname.startsWith("/dashboard") ||
        pathname.startsWith("/configuracion") ||
        pathname.startsWith("/liquidaciones") ||
        pathname.startsWith("/inventario") ||
        pathname.startsWith("/repago") ||
        pathname.startsWith("/mi-resultado") ||
        pathname.startsWith("/gastos-rapidos"),
    });
  }

  return items;
}

export default function RoleBottomNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const navItems = getNavItems(isAdmin);

  return (
    <nav className="fixed inset-x-0 bottom-4 z-30 px-3 sm:px-4">
      <div className="mx-auto max-w-4xl rounded-[28px] border border-zinc-800 bg-zinc-950/94 px-2 py-2 shadow-[0_22px_50px_rgba(0,0,0,0.42)] backdrop-blur">
        <div className={`grid gap-1 ${isAdmin ? "grid-cols-5" : "grid-cols-4"}`}>
          {navItems.map((item) => {
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

