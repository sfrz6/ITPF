import { cn } from "@/lib/cn";

/**
 * A leaderboard position. Ranks 1 to 3 get a restrained podium accent (gold,
 * silver, bronze); every other rank is a plain tabular number, exactly like
 * today. Used everywhere a result is ranked: championship standings,
 * qualification rankings and a country's own athlete list.
 */
export function RankBadge({ rank, className }: { rank: number; className?: string }) {
  if (rank > 3) {
    return <span className={cn("numeric font-semibold text-muted", className)}>{rank}</span>;
  }

  const tone =
    rank === 1
      ? "border-accent/40 bg-accent-subtle text-accent"
      : rank === 2
        ? "border-silver/50 bg-silver/15 text-foreground"
        : "border-bronze/50 bg-bronze/15 text-foreground";

  return (
    <span
      className={cn(
        "numeric inline-flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
        tone,
        className,
      )}
    >
      {rank}
    </span>
  );
}
