import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-24" />
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-14 shrink-0 rounded-sm" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-1/2 max-w-xs" />
          <Skeleton className="h-4 w-1/3 max-w-48" />
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-5 w-40" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
