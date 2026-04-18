function SkeletonBlock({
  className,
}: {
  className: string;
}) {
  return <div className={`animate-pulse rounded-[24px] bg-white/6 ${className}`} />;
}

export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <section className="panel-card rounded-[28px] p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-3">
            <SkeletonBlock className="h-3 w-24 rounded-full" />
            <SkeletonBlock className="h-10 w-40" />
            <SkeletonBlock className="h-3 w-36 rounded-full" />
          </div>
          <SkeletonBlock className="h-10 w-10 rounded-full" />
        </div>
        <SkeletonBlock className="mt-4 h-10 w-full rounded-xl" />
      </section>

      <section className="panel-card rounded-[28px] p-5">
        <SkeletonBlock className="h-3 w-28 rounded-full" />
        <SkeletonBlock className="mt-4 h-16 w-full rounded-[20px]" />
        <SkeletonBlock className="mt-3 h-11 w-full rounded-[20px]" />
      </section>

      <section className="panel-card rounded-[28px] p-5">
        <div className="flex items-center justify-between gap-4">
          <SkeletonBlock className="h-3 w-32 rounded-full" />
          <SkeletonBlock className="h-8 w-8 rounded-full" />
        </div>
        <SkeletonBlock className="mt-4 h-24 w-full rounded-[24px]" />
        <SkeletonBlock className="mt-4 h-11 w-full rounded-[20px]" />
      </section>

      <div className="grid grid-cols-2 gap-4">
        <SkeletonBlock className="h-32 w-full rounded-[28px]" />
        <SkeletonBlock className="h-32 w-full rounded-[28px]" />
      </div>
    </div>
  );
}
