import type { CSSProperties, ReactNode } from "react";

const ICONO = {
  width: 22,
  height: 22,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

type Teaser = { titulo: string; icono: ReactNode };

const TEASERS: Teaser[] = [
  {
    titulo: "Tu perfil",
    icono: (
      <svg {...ICONO}>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
      </svg>
    ),
  },
  {
    titulo: "Modo alien",
    icono: (
      <svg {...ICONO}>
        <path d="M12 3c-4.5 0-7 3.5-7 7.5 0 4.5 3 8.5 7 10.5 4-2 7-6 7-10.5C19 6.5 16.5 3 12 3z" />
        <path d="M7.5 10.5c1.5 0 3 1 3.5 2.5M16.5 10.5c-1.5 0-3 1-3.5 2.5" />
      </svg>
    ),
  },
  {
    titulo: "Juegos y OVNIS",
    icono: (
      <svg {...ICONO}>
        <ellipse cx="12" cy="14" rx="9" ry="3.5" />
        <path d="M7 12.5C7 9.5 9 7 12 7s5 2.5 5 5.5" />
        <path d="M8 19l-1.5 2M16 19l1.5 2M12 18v3" />
      </svg>
    ),
  },
  {
    titulo: "Ruleta",
    icono: (
      <svg {...ICONO}>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="2" />
        <path d="M12 3v7M12 14v7M3 12h7M14 12h7" />
      </svg>
    ),
  },
];

function Pill() {
  return <span className="torneo-pill torneo-hud">Próximamente</span>;
}

/** Todo lo de acá es INERTE: sin links, botones ni handlers. Es solo un adelanto. */
export default function Proximamente({ compacto = false }: { compacto?: boolean }) {
  if (compacto) {
    const chips: Teaser[] = [
      {
        titulo: "Crear mi cuenta",
        icono: (
          <svg {...ICONO}>
            <rect x="4" y="3" width="16" height="18" rx="2" />
            <path d="M8 8h8M8 12h8M8 16h5" />
          </svg>
        ),
      },
      ...TEASERS,
    ];
    return (
      <section aria-label="Lo que viene en la app A51" className="torneo-soon-compacto">
        <p className="torneo-soon-titulo torneo-hud">
          <span>Sumate a la app A51</span>
          <span className="torneo-soon-sep" aria-hidden="true" />
          <span className="text-[#8cff59]">Próximamente</span>
        </p>
        <ul className="torneo-chips">
          {chips.map((t, i) => (
            <li
              key={t.titulo}
              className="torneo-chip"
              aria-disabled="true"
              style={{ "--i": i } as CSSProperties}
            >
              <span className="torneo-chip-icono">{t.icono}</span>
              <span className="torneo-titulo torneo-chip-texto">{t.titulo}</span>
              <svg className="torneo-chip-candado" viewBox="0 0 24 24" aria-hidden="true">
                <rect x="5" y="11" width="14" height="10" rx="1.5" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" />
              </svg>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <section aria-label="Sumate a la app A51" className="torneo-soon">
      <h2 className="torneo-titulo text-3xl font-extrabold italic text-white">
        Sumate a la app A51
      </h2>
      <div
        aria-disabled="true"
        className="torneo-soon-card mt-4 flex items-center justify-between gap-3 px-4 py-5"
      >
        <span className="torneo-titulo text-2xl font-extrabold text-white">
          Crear mi cuenta A51
        </span>
        <Pill />
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {TEASERS.map((t) => (
          <li key={t.titulo} className="torneo-soon-card flex flex-col gap-3" aria-disabled="true">
            <span className="text-[#8cff59]">{t.icono}</span>
            <span className="torneo-titulo text-xl font-bold text-white">{t.titulo}</span>
            <span>
              <Pill />
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
