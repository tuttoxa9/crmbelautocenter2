"use client";

export function FileSkeletons({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col items-center p-3 rounded-2xl border border-zinc-100 bg-zinc-50/70"
          style={{ animationDelay: `${i * 40}ms` }}
        >
          <div
            className="w-full aspect-square rounded-xl bg-zinc-200 animate-pulse mb-2.5"
            style={{ animationDelay: `${i * 40}ms` }}
          />
          <div
            className="h-3 w-3/4 rounded-full bg-zinc-200 animate-pulse mb-1.5"
            style={{ animationDelay: `${i * 40 + 100}ms` }}
          />
          <div
            className="h-2.5 w-1/2 rounded-full bg-zinc-100 animate-pulse"
            style={{ animationDelay: `${i * 40 + 150}ms` }}
          />
        </div>
      ))}
    </div>
  );
}
