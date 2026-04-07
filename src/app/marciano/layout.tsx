export default function MarcianoRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="public-shell relative min-h-screen overflow-hidden text-white">
      <div className="pointer-events-none absolute inset-0 public-grid opacity-[0.12]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,_rgba(140,255,89,0.18),_transparent_68%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-[radial-gradient(circle_at_bottom,_rgba(0,0,0,0.36),_transparent_70%)]" />
      <div className="relative">{children}</div>
    </div>
  );
}
