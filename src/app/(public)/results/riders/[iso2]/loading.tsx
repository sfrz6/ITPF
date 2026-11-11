import { Skeleton, TableSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-24" />
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-14 shrink-0 rounded-sm" />
        <Skeleton className="h-6 w-1/2 max-w-xs" />
      </div>
      <TableSkeleton />
    </div>
  );
}
