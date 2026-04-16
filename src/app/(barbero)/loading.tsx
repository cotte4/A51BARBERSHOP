export default function BarberoLoading() {
  return (
    <div className="flex h-[calc(100svh-9rem)] min-h-[480px] flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-zinc-800/60 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-4 w-8 animate-pulse rounded-full bg-zinc-800" />
          <div className="h-3 w-1 animate-pulse rounded-full bg-zinc-800" />
          <div className="h-3 w-20 animate-pulse rounded-full bg-zinc-800" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-6 w-20 animate-pulse rounded-full bg-zinc-800" />
          <div className="h-6 w-24 animate-pulse rounded-full bg-zinc-800" />
        </div>
      </div>

      {/* Central zone */}
      <div className="flex flex-1 flex-col gap-3 overflow-hidden p-4">
        {/* Main button skeleton — COBRAR */}
        <div className="flex-[2] animate-pulse rounded-[28px] bg-zinc-800/50" />

        {/* Secondary grid skeleton */}
        <div className="grid flex-1 grid-cols-2 gap-3">
          <div className="animate-pulse rounded-[28px] bg-zinc-800/50" />
          <div className="animate-pulse rounded-[28px] bg-zinc-800/50" />
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-zinc-800/60 px-4 py-3">
        <div className="h-4 w-48 animate-pulse rounded-full bg-zinc-800" />
      </div>
    </div>
  );
}
