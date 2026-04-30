export default function TurnosLoading() {
  return (
    <main className="app-shell min-h-screen">
      {/* Hero section skeleton */}
      <section className="mx-4 mt-4 animate-pulse rounded-[32px] border border-zinc-800/80 bg-zinc-950/80 p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="h-3 w-20 rounded bg-zinc-800/60" />
            <div className="h-7 w-48 rounded bg-zinc-800/70" />
            <div className="h-4 w-72 rounded bg-zinc-800/50" />
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="h-6 w-24 rounded-full bg-zinc-800/60" />
            <div className="h-6 w-24 rounded-full bg-zinc-800/60" />
            <div className="h-6 w-16 rounded-full bg-zinc-800/60" />
          </div>
        </div>
      </section>

      {/* Sticky date nav skeleton */}
      <div className="mx-4 mt-4 animate-pulse rounded-[28px] border border-zinc-800/70 bg-zinc-950/95 px-4 pb-3 pt-3">
        <div className="flex items-center justify-between gap-3">
          <div className="h-4 w-12 rounded bg-zinc-800/50" />
          <div className="flex items-center gap-1.5">
            <div className="h-11 w-11 rounded-xl bg-zinc-800/60" />
            <div className="h-4 w-36 rounded bg-zinc-800/60" />
            <div className="h-11 w-11 rounded-xl bg-zinc-800/60" />
          </div>
          <div className="h-8 w-24 rounded-xl bg-zinc-800/60" />
        </div>
        <div className="mt-2.5 flex items-center justify-between gap-3">
          <div className="flex gap-1.5">
            <div className="h-6 w-16 rounded-full bg-zinc-800/50" />
            <div className="h-6 w-16 rounded-full bg-zinc-800/50" />
          </div>
          <div className="flex gap-1">
            <div className="h-10 w-14 rounded-full bg-zinc-800/50" />
            <div className="h-10 w-14 rounded-full bg-zinc-800/50" />
            <div className="h-10 w-14 rounded-full bg-zinc-800/50" />
            <div className="h-10 w-14 rounded-full bg-zinc-800/50" />
            <div className="h-10 w-14 rounded-full bg-zinc-800/50" />
          </div>
        </div>
      </div>

      {/* Turno card skeletons */}
      <div className="mt-3 px-3 pb-4">
        <div className="space-y-1">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex gap-2">
              <div className="w-12 shrink-0 pt-3">
                <div className="ml-auto h-3 w-8 rounded bg-zinc-800/50" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="animate-pulse rounded-[22px] border border-zinc-800 bg-zinc-950/95 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="h-5 w-36 rounded bg-zinc-800/70" />
                      <div className="h-3 w-24 rounded bg-zinc-800/50" />
                    </div>
                    <div className="h-6 w-20 rounded-full bg-zinc-800/60" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
