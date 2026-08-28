"use client";

export function FileSkeletons({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 px-3 pt-1 sm:grid-cols-3 sm:px-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col items-center rounded-2xl border border-white/6 bg-white/[0.03] p-3">
          <div className="mb-2.5 aspect-square w-full rounded-xl bg-white/[0.06]" />
          <div className="mb-1.5 h-2.5 w-3/4 rounded-full bg-white/[0.06]" />
          <div className="h-2 w-1/2 rounded-full bg-white/[0.04]" />
        </div>
      ))}
    </div>
  );
}
