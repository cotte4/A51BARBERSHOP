"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navGroups = [
  {
    title: "Uso diario",
    items: [
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
    ],
  },
  {
    title: "Gestion negocio",
    items: [
      {
        href: "/dashboard",
        label: "Panel",
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
    ],
  },
] as const;

export default function AdminBottomNav() {
  const pathname = usePathname();
  const [dailyGroup, businessGroup] = navGroups;

  return (
    <nav className="fixed inset-x-0 bottom-4 z-20 px-4">
      <div className="mx-auto max-w-3xl rounded-[30px] border border-zinc-800 bg-zinc-950/92 px-3 py-3 shadow-[0_22px_50px_rgba(0,0,0,0.4)] backdrop-blur">
        <div className="grid gap-3 md:grid-cols-[1.55fr_auto_1fr] md:items-stretch">
          <div className="min-w-0">
            <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.26em] text-zinc-500">
              {dailyGroup.title}
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {dailyGroup.items.map((item) => {
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

          <div className="hidden w-px self-stretch bg-white/10 md:block" aria-hidden="true" />

          <div className="min-w-0">
            <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.26em] text-zinc-500">
              {businessGroup.title}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {businessGroup.items.map((item) => {
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
      </div>
    </nav>
  );
}
