"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

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

function SwapIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M7 16V5m0 0L3.5 8.5M7 5l3.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 8v11m0 0 3.5-3.5M17 19l-3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M4 21V6.5A1.5 1.5 0 0 1 5.5 5H10v16" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 21V3h8.5A1.5 1.5 0 0 1 20 4.5V21" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M7 8.5h.01M7 12h.01M7 15.5h.01M13.5 7h.01M13.5 10.5h.01M13.5 14h.01M17 7h.01M17 10.5h.01M17 14h.01"
        strokeLinecap="round"
      />
      <path d="M2.5 21h19" strokeLinecap="round" />
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
    // El cierre es el último paso de Caja, no un lugar aparte
    isActive: (pathname) => pathname === "/caja" || pathname.startsWith("/caja/"),
  },
  {
    href: "/clientes",
    label: "Clientes",
    icon: <UsersIcon />,
    isActive: (pathname) => pathname.startsWith("/clientes"),
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
    label: "Números",
    icon: <ChartIcon />,
    isActive: (pathname) =>
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/liquidaciones") ||
      pathname.startsWith("/inventario") ||
      pathname.startsWith("/mi-resultado"),
  },
  {
    href: "/negocio",
    label: "Negocio",
    icon: <BuildingIcon />,
    isActive: (pathname) => pathname.startsWith("/negocio"),
  },
  {
    href: "/repago",
    label: "Repago",
    icon: <FinanzasIcon />,
    isActive: (pathname) => pathname.startsWith("/repago"),
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
      label: "Números",
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
      href: "/negocio",
      label: "Negocio",
      icon: <BuildingIcon />,
      isActive: (pathname) =>
        pathname.startsWith("/negocio") ||
        pathname.startsWith("/liquidaciones") ||
        pathname.startsWith("/inventario") ||
        pathname.startsWith("/repago") ||
        pathname.startsWith("/ovnis"),
    },
    {
      href: "/configuracion",
      label: "Config",
      icon: <SettingsIcon />,
      isActive: (pathname) => pathname.startsWith("/configuracion"),
    },
  ];
}

function SparkIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" strokeLinecap="round" />
      <path d="M12 8.5 13.2 10.8 15.5 12 13.2 13.2 12 15.5 10.8 13.2 8.5 12 10.8 10.8Z" strokeLinejoin="round" />
    </svg>
  );
}

function HeadphonesIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
      <path d="M4 15v-3a8 8 0 0 1 16 0v3" strokeLinecap="round" />
      <rect x="3" y="14" width="4.5" height="7" rx="1.8" />
      <rect x="16.5" y="14" width="4.5" height="7" rx="1.8" />
    </svg>
  );
}

function VinylIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M12 5.5a6.5 6.5 0 0 1 6.5 6.5" strokeLinecap="round" />
    </svg>
  );
}

function BallIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
      <circle cx="12" cy="12" r="9" />
      <path d="m12 7.5 4 2.9-1.5 4.7h-5L8 10.4 12 7.5Z" strokeLinejoin="round" />
    </svg>
  );
}

function BriefcaseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9">
      <rect x="3" y="7" width="18" height="13" rx="2.5" />
      <path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3 12.5h18" strokeLinecap="round" />
    </svg>
  );
}

// Ocio: lo que se usa por gusto. Es el modo con el que arrancan los admin (ver /ocio).
function ocioNavItems(conEstudio: boolean): NavItem[] {
  const estudio: NavItem[] = conEstudio
    ? [
        {
          href: "/estudio",
          label: "Estudio",
          icon: <HeadphonesIcon />,
          isActive: (pathname) => pathname.startsWith("/estudio"),
        },
      ]
    : [];
  return [
    {
      href: "/ocio",
      label: "Ocio",
      icon: <SparkIcon />,
      isActive: (pathname) => pathname === "/ocio",
    },
    ...estudio,
    {
      href: "/musica/jukebox",
      label: "Música",
      icon: <VinylIcon />,
      isActive: (pathname) => pathname.startsWith("/musica"),
    },
    {
      href: "/torneo-admin",
      label: "Torneo",
      icon: <BallIcon />,
      isActive: (pathname) => pathname.startsWith("/torneo-admin"),
    },
  ];
}

type AdminMode = "ocio" | "laboral" | "gestion";

const SWAP_BUTTON_CLASS =
  "flex min-h-[58px] min-w-0 flex-col items-center justify-center rounded-[20px] border border-[#8cff59]/25 bg-[#8cff59]/8 px-1 py-2 text-center text-[11px] font-semibold text-[#8cff59] transition hover:bg-[#8cff59]/15";

// Nav admin con tres modos: "Ocio" (estudio, música, torneo; el de arranque),
// "Laboral" (operación del día) y "Gestión" (números, negocio, repago, config).
// El modo se deduce de la ruta activa y los botones lo cambian a mano hasta la
// próxima navegación. En Ocio, el botón de la derecha lleva a Trabajo; en
// Trabajo, el de la izquierda vuelve a Ocio y el de la derecha alterna
// Laboral/Gestión.
function AdminModalNav({ pathname, conEstudio }: { pathname: string; conEstudio: boolean }) {
  const ocioItems = ocioNavItems(conEstudio);
  const routeMode: AdminMode = ocioItems.some((item) => item.isActive(pathname))
    ? "ocio"
    : ADMIN_NAV_RIGHT.some((item) => item.isActive(pathname))
      ? "gestion"
      : "laboral";
  const [override, setOverride] = useState<AdminMode | null>(null);

  useEffect(() => {
    setOverride(null);
  }, [pathname]);

  const mode = override ?? routeMode;
  const items = mode === "ocio" ? ocioItems : mode === "gestion" ? ADMIN_NAV_RIGHT : ADMIN_NAV_LEFT;
  const targetLabel = mode === "ocio" ? "Trabajo" : mode === "gestion" ? "Laboral" : "Gestión";

  return (
    <nav className="fixed inset-x-0 bottom-4 z-30 px-3 pb-[env(safe-area-inset-bottom,0px)] sm:px-4">
      <div className="mx-auto max-w-4xl rounded-[28px] border border-zinc-800 bg-zinc-950/94 px-2 py-2 shadow-[0_22px_50px_rgba(0,0,0,0.42)] backdrop-blur">
        <div className="flex items-stretch gap-1">
          {mode !== "ocio" ? (
            <>
              <button
                type="button"
                onClick={() => setOverride("ocio")}
                className={`${SWAP_BUTTON_CLASS} w-12 shrink-0`}
              >
                <span><SparkIcon /></span>
                <span className="mt-1 truncate leading-none">Ocio</span>
              </button>
              <div className="h-10 w-px shrink-0 self-center rounded-full bg-zinc-700/60" />
            </>
          ) : null}

          {/* key={mode} remonta el grupo al alternar: Gestión entra desde la
              derecha, Laboral y Ocio desde la izquierda, con stagger por tab */}
          <div
            key={mode}
            className={`flex min-w-0 flex-[4] items-stretch gap-1 ${
              mode === "gestion" ? "nav-mode-enter-right" : "nav-mode-enter-left"
            }`}
          >
            {items.map((item, index) => {
              const active = item.isActive(pathname);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{ animationDelay: `${index * 35}ms` }}
                  className={`flex min-h-[58px] min-w-0 flex-1 flex-col items-center justify-center rounded-[20px] px-1 py-2 text-center text-[11px] font-semibold transition ${
                    active
                      ? "bg-[#8cff59] text-[#07130a] shadow-[0_12px_24px_rgba(140,255,89,0.18)]"
                      : "text-zinc-400 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span>{item.icon}</span>
                  <span className="mt-1 truncate leading-none">{item.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="h-10 w-px shrink-0 self-center rounded-full bg-zinc-700/60" />

          <button
            type="button"
            onClick={() => setOverride(mode === "laboral" ? "gestion" : "laboral")}
            className={`${SWAP_BUTTON_CLASS} flex-1`}
          >
            <span>{mode === "ocio" ? <BriefcaseIcon /> : <SwapIcon />}</span>
            <span className="mt-1 truncate leading-none">{targetLabel}</span>
          </button>
        </div>
      </div>
    </nav>
  );
}

export default function RoleBottomNav({
  isAdmin,
  isAsesor = false,
  conEstudio = false,
}: {
  isAdmin: boolean;
  isAsesor?: boolean;
  conEstudio?: boolean;
}) {
  const pathname = usePathname();

  if (isAsesor) {
    const asesorItems = getAsesorNavItems();
    return (
      <nav className="fixed inset-x-0 bottom-4 z-30 px-3 pb-[env(safe-area-inset-bottom,0px)] sm:px-4">
        <div className="mx-auto max-w-4xl rounded-[28px] border border-zinc-800 bg-zinc-950/94 px-2 py-2 shadow-[0_22px_50px_rgba(0,0,0,0.42)] backdrop-blur">
          <div className="grid grid-cols-5 gap-1">
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
    return <AdminModalNav pathname={pathname} conEstudio={conEstudio} />;
  }

  return (
    <nav className="fixed inset-x-0 bottom-4 z-30 px-3 pb-[env(safe-area-inset-bottom,0px)] sm:px-4">
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
