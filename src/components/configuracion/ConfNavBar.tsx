"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/configuracion", label: "Resumen" },
  { href: "/configuracion/barberos", label: "Barberos" },
  { href: "/configuracion/servicios", label: "Servicios" },
  { href: "/configuracion/musica", label: "Musica" },
  { href: "/configuracion/medios-de-pago", label: "Medios de Pago" },
  { href: "/configuracion/gastos-fijos", label: "Gastos Fijos" },
  { href: "/configuracion/temporadas", label: "Temporadas" },
];

export default function ConfNavBar() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/90 px-4 backdrop-blur">
      <div className="mx-auto max-w-6xl">
        <div className="flex overflow-x-auto gap-0">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors
                  ${
                    isActive
                      ? "border-[#8cff59] text-[#8cff59]"
                      : "border-transparent text-zinc-400 hover:border-zinc-600 hover:text-white"
                  }
                `}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
