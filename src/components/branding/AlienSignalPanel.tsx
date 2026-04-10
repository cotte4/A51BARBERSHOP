// ─── Tipos ──────────────────────────────────────────────────────────────────

type AlienTone = "brand" | "pinky" | "gabote";
type AlienSize = "sm" | "md" | "lg";

// ─── Paleta de tonos ─────────────────────────────────────────────────────────

const toneClasses: Record<
  AlienTone,
  { border: string; glow: string; badge: string }
> = {
  brand: {
    border: "border-[#8cff59]/18",
    glow: "from-[#8cff59]/12 via-transparent to-transparent",
    badge: "border-[#8cff59]/25 bg-[#8cff59]/10 text-[#d9ffc8]",
  },
  pinky: {
    border: "border-[#ff6eb4]/25",
    glow: "from-[#ff6eb4]/14 via-transparent to-transparent",
    badge: "border-[#ff6eb4]/30 bg-[#ff6eb4]/10 text-[#ffd6ec]",
  },
  gabote: {
    border: "border-[#60a5fa]/25",
    glow: "from-[#60a5fa]/14 via-transparent to-transparent",
    badge: "border-[#60a5fa]/30 bg-[#60a5fa]/10 text-[#dbeafe]",
  },
} as const;

// ─── Colores base de cada alien ───────────────────────────────────────────────

const alienColors: Record<
  AlienTone,
  { head: string; antenna: string; eyeGlow: string; cheek: string }
> = {
  brand: {
    head: "#65ff2f",
    antenna: "#65ff2f",
    eyeGlow: "#b6ff84",
    cheek: "#3ad600",
  },
  pinky: {
    head: "#ff6eb4",
    antenna: "#ff6eb4",
    eyeGlow: "#ffd6ec",
    cheek: "#e0438d",
  },
  gabote: {
    head: "#60a5fa",
    antenna: "#60a5fa",
    eyeGlow: "#dbeafe",
    cheek: "#2577e6",
  },
} as const;

// ─── MiniAlien ────────────────────────────────────────────────────────────────

function MiniAlien({ tone, size = "md" }: { tone: AlienTone; size?: AlienSize }) {
  const px = size === "sm" ? 32 : size === "lg" ? 64 : 48;
  const c = alienColors[tone];

  // Proporciones relativas al tamaño total
  const s = (n: number) => Math.round((n / 48) * px);

  return (
    <div style={{ position: "relative", width: px, height: px, flexShrink: 0 }}>
      {/* Antena izquierda */}
      <div
        style={{
          position: "absolute",
          left: s(10),
          top: s(1),
          width: s(5),
          height: s(11),
          borderRadius: s(4),
          background: c.antenna,
          border: "1.5px solid rgba(0,0,0,0.7)",
        }}
      />
      {/* Bolita antena izquierda */}
      <div
        style={{
          position: "absolute",
          left: s(9),
          top: 0,
          width: s(7),
          height: s(7),
          borderRadius: "50%",
          background: c.eyeGlow,
          border: "1.5px solid rgba(0,0,0,0.5)",
          boxShadow: `0 0 ${s(4)}px ${c.eyeGlow}`,
        }}
      />

      {/* Antena derecha */}
      <div
        style={{
          position: "absolute",
          right: s(10),
          top: s(1),
          width: s(5),
          height: s(11),
          borderRadius: s(4),
          background: c.antenna,
          border: "1.5px solid rgba(0,0,0,0.7)",
        }}
      />
      {/* Bolita antena derecha */}
      <div
        style={{
          position: "absolute",
          right: s(9),
          top: 0,
          width: s(7),
          height: s(7),
          borderRadius: "50%",
          background: c.eyeGlow,
          border: "1.5px solid rgba(0,0,0,0.5)",
          boxShadow: `0 0 ${s(4)}px ${c.eyeGlow}`,
        }}
      />

      {/* Cabeza */}
      <div
        style={{
          position: "absolute",
          left: s(3),
          right: s(3),
          top: s(7),
          height: s(28),
          borderRadius: s(12),
          background: c.head,
          border: "2px solid rgba(0,0,0,0.75)",
        }}
      />

      {/* Mejilla izquierda (blush) */}
      <div
        style={{
          position: "absolute",
          left: s(5),
          top: s(23),
          width: s(8),
          height: s(5),
          borderRadius: "50%",
          background: c.cheek,
          opacity: 0.55,
        }}
      />
      {/* Mejilla derecha */}
      <div
        style={{
          position: "absolute",
          right: s(5),
          top: s(23),
          width: s(8),
          height: s(5),
          borderRadius: "50%",
          background: c.cheek,
          opacity: 0.55,
        }}
      />

      {/* Ojo izquierdo — blanco */}
      <div
        style={{
          position: "absolute",
          left: s(7),
          top: s(12),
          width: s(11),
          height: s(13),
          borderRadius: "50%",
          background: "white",
          border: "1.5px solid rgba(0,0,0,0.6)",
        }}
      />
      {/* Pupila izquierda */}
      <div
        style={{
          position: "absolute",
          left: s(10),
          top: s(15),
          width: s(6),
          height: s(7),
          borderRadius: "50%",
          background: "#111",
        }}
      />
      {/* Brillo ojo izquierdo */}
      <div
        style={{
          position: "absolute",
          left: s(12),
          top: s(15),
          width: s(2),
          height: s(3),
          borderRadius: "50%",
          background: "white",
          opacity: 0.9,
        }}
      />

      {/* Ojo derecho — blanco */}
      <div
        style={{
          position: "absolute",
          right: s(7),
          top: s(12),
          width: s(11),
          height: s(13),
          borderRadius: "50%",
          background: "white",
          border: "1.5px solid rgba(0,0,0,0.6)",
        }}
      />
      {/* Pupila derecha */}
      <div
        style={{
          position: "absolute",
          right: s(10),
          top: s(15),
          width: s(6),
          height: s(7),
          borderRadius: "50%",
          background: "#111",
        }}
      />
      {/* Brillo ojo derecho */}
      <div
        style={{
          position: "absolute",
          right: s(12),
          top: s(15),
          width: s(2),
          height: s(3),
          borderRadius: "50%",
          background: "white",
          opacity: 0.9,
        }}
      />

      {/* Sonrisa */}
      <div
        style={{
          position: "absolute",
          left: s(12),
          right: s(12),
          bottom: s(8),
          height: s(5),
          borderBottom: "2px solid rgba(0,0,0,0.65)",
          borderLeft: "2px solid transparent",
          borderRight: "2px solid transparent",
          borderRadius: "0 0 50% 50%",
        }}
      />
    </div>
  );
}

// ─── Standalone exports ───────────────────────────────────────────────────────

// ─── Panel principal ──────────────────────────────────────────────────────────

type AlienSignalPanelProps = {
  eyebrow?: string;
  title: string;
  detail: string;
  badges?: string[];
  tone?: AlienTone;
};

export default function AlienSignalPanel({
  eyebrow = "A51 Barber",
  title,
  detail,
  badges = [],
  tone = "brand",
}: AlienSignalPanelProps) {
  const palette = toneClasses[tone];

  return (
    <div
      className={`relative overflow-hidden rounded-[28px] border bg-[linear-gradient(180deg,rgba(24,24,27,0.94),rgba(14,14,17,0.96))] p-4 shadow-[0_20px_55px_rgba(0,0,0,0.24)] ${palette.border}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.05),transparent_24%)]" />
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-br ${palette.glow}`}
      />

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow text-[10px]">{eyebrow}</p>
            <h3 className="mt-2 font-display text-xl font-semibold text-white">{title}</h3>
          </div>

          <div className="flex-shrink-0">
            <MiniAlien tone={tone} size="md" />
          </div>
        </div>

        <p className="mt-3 text-sm leading-6 text-zinc-300">{detail}</p>

        {badges.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {badges.map((badge) => (
              <span
                key={badge}
                className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${palette.badge}`}
              >
                {badge}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
