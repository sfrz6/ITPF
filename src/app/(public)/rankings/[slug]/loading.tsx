import { DetailHeaderSkeleton, TableSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-5">
      <DetailHeaderSkeleton />
      <TableSkeleton />
    </div>
  );
}
