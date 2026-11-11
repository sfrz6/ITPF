import Link from "next/link";
import { Download } from "lucide-react";
import { championshipDisplayName } from "@/components/common/formatting";
import { CountryFlag } from "@/components/common/country-flag";
import { RankBadge } from "@/components/common/rank-badge";
import { Card } from "@/components/ui/surfaces";
import { cn } from "@/lib/cn";
import { computeSeriesRankings, type SeriesSummary } from "@/server/services/series";
import type { Locale } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";

/** The full row, not just the rank badge, carries the podium color here — matches `LatestResultCard`'s own treatment. */
function podiumRowClassName(rank: number): string | undefined {
  if (rank === 1) return "bg-accent-subtle";
  if (rank === 2) return "bg-silver/15";
  if (rank === 3) return "bg-bronze/15";
  return undefined;
}

/**
 * The homepage's own preview of a published ranking series: its top-3
 * national teams and top-3 athletes right here (the "ALL" discipline, the
 * series' own combined standings), the same way `LatestResultCard` previews
 * a championship, rather than a bare name-and-count link card.
 */
export async function TopRankingCard({
  series,
  locale,
}: {
  series: SeriesSummary;
  locale: Locale;
}) {
  const { t } = await getTranslator();
  const rankings = await computeSeriesRankings(series.id, locale);
  const countryTop = (rankings?.country.ALL ?? []).slice(0, 3);
  const individualTop = (rankings?.individual.ALL ?? []).slice(0, 3);

  const groups = [
    { labelKey: "results.countries" as const, rows: countryTop },
    { labelKey: "results.individual" as const, rows: individualTop },
  ];

  return (
    <Card className="overflow-hidden p-4">
      {/* See `LatestResultCard` for why this is light-mode only: dark
          mode's own tokens already give the rest of the card this same
          dark-navy-with-light-text look. */}
      <div className="-m-4 mb-0 space-y-1 rounded-t-lg bg-primary p-4 text-primary-foreground dark:m-0 dark:rounded-none dark:bg-transparent dark:p-0 dark:text-inherit">
        <Link
          href={`/rankings/${series.slug}`}
          className="block font-semibold text-primary-foreground hover:underline dark:text-foreground"
        >
          {championshipDisplayName(series.name, series.nameAr, locale)}
        </Link>
        <p className="text-xs text-primary-foreground/70 dark:text-muted">
          {t("series.championshipsCount", { count: series.championshipCount })}
        </p>
      </div>

      {groups.map((group) =>
        group.rows.length > 0 ? (
          <div key={group.labelKey} className="mt-3 border-t border-border pt-3">
            <p className="mb-1.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-muted">
              {t(group.labelKey)}
            </p>
            <ul className="space-y-2">
              {group.rows.map((row) => (
                <li
                  key={row.key}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2 py-1.5",
                    podiumRowClassName(row.rank),
                  )}
                >
                  <RankBadge rank={row.rank} />
                  <CountryFlag iso2={row.iso2} className="shrink-0" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                    {row.name}
                  </span>
                  <span className="numeric shrink-0 text-sm font-semibold text-foreground">
                    {row.total}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null,
      )}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-3 text-sm">
        <Link href={`/rankings/${series.slug}`} className="font-medium text-primary hover:underline">
          {t("publicResults.viewFullResults")}
        </Link>
        <Link
          href={`/rankings/${series.slug}/pdf`}
          target="_blank"
          className="inline-flex items-center gap-1 font-medium text-muted hover:text-foreground"
        >
          <Download className="size-3.5" aria-hidden />
          {t("publicResults.downloadPdf")}
        </Link>
      </div>
    </Card>
  );
}
