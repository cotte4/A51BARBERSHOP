import MarcianoBottomNav from "@/components/navigation/MarcianoBottomNav";
import MarcianoLogoutButton from "@/components/marciano/MarcianoLogoutButton";
import { requireMarcianoClient } from "@/lib/marciano-portal";

export default async function MarcianoPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { client } = await requireMarcianoClient();

  return (
    <div className="app-shell min-h-screen">
      <header className="sticky top-0 z-20 border-b border-zinc-800/60 bg-zinc-950/90 px-4 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div>
            <p className="eyebrow text-xs text-[#8cff59]">Portal Marciano</p>
            <p className="font-display mt-0.5 text-lg font-semibold text-white">{client.name}</p>
          </div>
          <MarcianoLogoutButton />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 pb-24">{children}</main>

      <MarcianoBottomNav />
    </div>
  );
}
