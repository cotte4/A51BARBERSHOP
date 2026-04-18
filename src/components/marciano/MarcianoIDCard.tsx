type Props = {
  avatarUrl: string | null;
  clientName: string;
  alienTitle: string;
  memberSince: Date;
  totalVisits: number;
  serialNumber: string;
  variant?: "dashboard" | "og";
};

function formatMemberSince(date: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(date);
}

function BarcodeSVG({ seed }: { seed: string }) {
  const widths: number[] = [];
  for (let i = 0; i < 16; i++) {
    const charCode = seed.charCodeAt(i % seed.length);
    widths.push(((charCode % 4) + 1) * 1.5);
  }
  let x = 0;
  const bars = widths.map((w, i) => {
    const el = (
      <rect key={i} x={x} y={0} width={w} height={24} fill="#8cff59" opacity={0.35 + (i % 3) * 0.15} />
    );
    x += w + 1.5;
    return el;
  });
  return (
    <svg viewBox={`0 0 ${x} 24`} className="h-5 w-16" fill="none">
      {bars}
    </svg>
  );
}

export default function MarcianoIDCard({ avatarUrl, clientName, alienTitle, memberSince, totalVisits, serialNumber, variant = "dashboard" }: Props) {
  void variant;
  return (
    <div className="relative overflow-hidden rounded-[28px] border-2 border-[#8cff59]/60 bg-zinc-950 p-6 shadow-[0_0_24px_rgba(140,255,89,0.2)]">
      {/* Grid SVG background */}
      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.08]" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <pattern id="id-card-grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#8cff59" strokeWidth="0.3" />
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#id-card-grid)" />
      </svg>

      {/* Header */}
      <div className="relative flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-zinc-500">
        <span>A51 BARBER</span>
        <span className="text-[#8cff59]">CREDENCIAL MARCIANO</span>
      </div>

      {/* Body */}
      <div className="relative mt-5 flex items-center gap-5">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={clientName}
            className="h-24 w-24 shrink-0 rounded-full border-2 border-[#8cff59]/40 object-cover shadow-[0_0_16px_rgba(140,255,89,0.3)]"
          />
        ) : (
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-zinc-700 bg-zinc-900 text-[10px] text-zinc-600">
            sin avatar
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-display truncate text-2xl font-bold text-white">{clientName}</p>
          <p className="font-display mt-0.5 text-lg font-semibold text-[#8cff59]">{alienTitle}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="relative mt-6 grid grid-cols-2 gap-4 rounded-2xl border border-white/10 bg-black/40 p-4">
        <div>
          <p className="eyebrow text-[10px]">Miembro desde</p>
          <p className="font-display mt-1 text-sm font-semibold capitalize text-white">
            {formatMemberSince(memberSince)}
          </p>
        </div>
        <div>
          <p className="eyebrow text-[10px]">Visitas totales</p>
          <p className="font-display mt-1 text-sm font-semibold text-white">{totalVisits}</p>
        </div>
      </div>

      {/* Serial + barcode */}
      <div className="relative mt-4 flex items-center justify-between">
        <span className="font-mono text-[9px] uppercase tracking-widest text-zinc-600">{serialNumber}</span>
        <BarcodeSVG seed={serialNumber} />
      </div>
    </div>
  );
}
