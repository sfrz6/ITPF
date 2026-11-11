import { DetailHeaderSkeleton, Skeleton, TableSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-5">
      <DetailHeaderSkeleton />
      <Skeleton className="h-16 w-full rounded-lg" />
      <TableSkeleton />
    </div>
  );
}
