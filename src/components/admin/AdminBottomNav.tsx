"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    href: "/dashboard",
    label: "Inicio",
    isActive: (pathname: string) =>
      !pathname.startsWith("/configuracion") && !pathname.startsWith("/mi-resultado"),
  },
  {
    href: "/mi-resultado",
    label: "Finanzas",
    isActive: (pathname: string) => pathname.startsWith("/mi-resultado"),
  },
  {
    href: "/configuracion",
    label: "Ajustes",
    isActive: (pathname: string) => pathname.startsWith("/configuracion"),
  },
];

export default function AdminBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-4 z-20 px-4">
      <div className="mx-auto flex max-w-md items-center justify-between rounded-full border border-zinc-800 bg-zinc-950/90 px-3 py-2 shadow-[0_22px_50px_rgba(0,0,0,0.4)] backdrop-blur">
        {navItems.map((item) => {
          const active = item.isActive(pathname);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 rounded-full px-4 py-3 text-center text-sm font-semibold transition ${
                active ? "neon-button" : "text-zinc-400 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
