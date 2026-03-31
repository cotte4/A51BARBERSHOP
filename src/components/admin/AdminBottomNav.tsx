"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    href: "/caja",
    label: "Caja",
    icon: "CA",
    isActive: (pathname: string) =>
      pathname === "/caja" ||
      pathname.startsWith("/caja/nueva") ||
      pathname.startsWith("/caja/vender") ||
      /^\/caja\/[^/]+\/editar$/.test(pathname),
  },
  {
    href: "/caja/cierre",
    label: "Cierre",
    icon: "CI",
    isActive: (pathname: string) => pathname.startsWith("/caja/cierre"),
  },
  {
    href: "/gastos-rapidos",
    label: "Gasto",
    icon: "GA",
    isActive: (pathname: string) => pathname.startsWith("/gastos-rapidos"),
  },
  {
    href: "/dashboard",
    label: "Gestion",
    icon: "GE",
    isActive: (pathname: string) =>
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
    icon: "CO",
    isActive: (pathname: string) => pathname.startsWith("/configuracion"),
  },
];

export default function AdminBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-4 z-20 px-4">
      <div className="mx-auto max-w-3xl rounded-[30px] border border-zinc-800 bg-zinc-950/92 px-3 py-3 shadow-[0_22px_50px_rgba(0,0,0,0.4)] backdrop-blur">
        <div className="grid grid-cols-[1.55fr_auto_1fr] items-stretch gap-3">
          <div className="grid grid-cols-3 gap-2">
            {navItems.slice(0, 3).map((item) => {
              const active = item.isActive(pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex min-h-[56px] flex-col items-center justify-center rounded-[22px] px-2 py-2 text-center text-xs font-semibold transition ${
                    active ? "neon-button" : "text-zinc-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span className="text-[11px] tracking-[0.22em]">{item.icon}</span>
                  <span className="mt-1">{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="w-px self-stretch bg-white/10" aria-hidden="true" />

          <div className="grid grid-cols-2 gap-2">
            {navItems.slice(3).map((item) => {
              const active = item.isActive(pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex min-h-[56px] flex-col items-center justify-center rounded-[22px] px-2 py-2 text-center text-xs font-semibold transition ${
                    active ? "neon-button" : "text-zinc-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span className="text-[11px] tracking-[0.22em]">{item.icon}</span>
                  <span className="mt-1">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
