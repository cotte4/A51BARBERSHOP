"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/configuracion/barberos", label: "Barberos" },
  { href: "/configuracion/servicios", label: "Servicios" },
  { href: "/configuracion/medios-de-pago", label: "Medios de Pago" },
  { href: "/configuracion/gastos-fijos", label: "Gastos Fijos" },
  { href: "/configuracion/temporadas", label: "Temporadas" },
];

export default function ConfNavBar() {
  const pathname = usePathname();

  return (
    <nav className="bg-white border-b border-gray-200 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex overflow-x-auto gap-0">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  whitespace-nowrap px-4 py-3 text-sm font-medium border-b-2 transition-colors
                  ${
                    isActive
                      ? "border-gray-900 text-gray-900"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
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
