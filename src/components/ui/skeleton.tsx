import { cn } from "@/lib/cn";

/**
 * A single pulsing placeholder block. `motion-safe:` keeps the pulse off for
 * a visitor who has asked their OS for reduced motion; the block still shows,
 * just without the animation drawing attention to itself.
 */
export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden
      className={cn("motion-safe:animate-pulse rounded-md bg-surface-sunken", className)}
      {...props}
    />
  );
}

/** Matches `PageHeader`'s title + description shape and spacing. */
export function PageHeaderSkeleton() {
  return (
    <div className="mb-6 space-y-2">
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-4 w-72 max-w-full" />
    </div>
  );
}

/**
 * Matches the `Card` grid every public index page (results, rankings,
 * countries, riders) lists its entries in, so the loading state never jumps
 * once the real cards arrive.
 */
export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="space-y-3 rounded-lg border border-border bg-surface-raised p-4">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-8 w-28" />
        </li>
      ))}
    </ul>
  );
}

/** A detail page's header: back link, title and a line of metadata beneath it. */
export function DetailHeaderSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-32" />
      <div className="flex items-center gap-4">
        <Skeleton className="size-14 shrink-0 rounded-md" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-2/3 max-w-sm" />
          <Skeleton className="h-4 w-1/3 max-w-52" />
        </div>
      </div>
    </div>
  );
}

/** Shaped like `StandingsTable`'s rows, so a leaderboard's loading state already hints at the real layout. */
export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-2 rounded-lg border border-border p-4">
      <div className="flex gap-3">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 flex-1" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="size-6 shrink-0 rounded-full" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-10 shrink-0" />
        </div>
      ))}
    </div>
  );
}
