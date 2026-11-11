import { CardGridSkeleton, DetailHeaderSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-5">
      <DetailHeaderSkeleton />
      <CardGridSkeleton count={4} />
    </div>
  );
}
