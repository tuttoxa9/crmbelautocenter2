"use client";

export function FileSkeletons({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4 pt-1">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col items-center p-3 rounded-2xl border border-white/[0.06] bg-white/[0.04]"
          style={{ animationDelay: `${i * 40}ms` }}
        >
          <div
            className="w-full aspect-square rounded-xl bg-white/[0.08] animate-pulse mb-2.5"
            style={{ animationDelay: `${i * 40}ms` }}
          />
          <div
            className="h-2.5 w-3/4 rounded-full bg-white/[0.07] animate-pulse mb-1.5"
            style={{ animationDelay: `${i * 40 + 100}ms` }}
          />
          <div
            className="h-2 w-1/2 rounded-full bg-white/[0.04] animate-pulse"
            style={{ animationDelay: `${i * 40 + 150}ms` }}
          />
        </div>
      ))}
    </div>
  );
}
