import Link from "next/link";
import { CircleCheck, Download } from "lucide-react";
import { championshipDisplayName, formatCompetitionDate } from "@/components/common/formatting";
import { CountryFlag } from "@/components/common/country-flag";
import { RankBadge } from "@/components/common/rank-badge";
import { Badge, Card } from "@/components/ui/surfaces";
import { buildStandingsData, pdfAvailability } from "@/components/results/standings-data";
import { cn } from "@/lib/cn";
import { getChampionshipDetail } from "@/server/services/championships";
import { loadChampionshipResults } from "@/server/services/results";
import type { ChampionshipSummary } from "@/server/services/championships";
import type { Locale } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/server";

/**
 * The homepage's own preview of a finished championship: not just a link to
 * it (see the plain card used on `(public)/results`), but its own top-3
 * country standings right here, so a visitor sees who's leading before
 * clicking through. Country rather than individual standings, to read as the
 * federation's own headline result rather than one rider's.
 */
/** The full row, not just the rank badge, carries the podium color here — a stronger highlight for the homepage's own headline card than the restrained badge-only treatment the dedicated standings table uses. */
function podiumRowClassName(rank: number): string | undefined {
  if (rank === 1) return "bg-accent-subtle";
  if (rank === 2) return "bg-silver/15";
  if (rank === 3) return "bg-bronze/15";
  return undefined;
}

export async function LatestResultCard({
  championship,
  locale,
}: {
  championship: ChampionshipSummary;
  locale: Locale;
}) {
  const { t } = await getTranslator();
  const [results, detail] = await Promise.all([
    loadChampionshipResults(championship.id, locale),
    getChampionshipDetail(championship.id),
  ]);

  const { sets } = buildStandingsData(results, t);
  const countryOverall = sets.find((set) => set.scope === "OVERALL" && set.subject === "COUNTRY");
  const topRows = (countryOverall?.rows ?? []).slice(0, 3);
  const availability = pdfAvailability(detail?.days ?? []);

  return (
    <Card className="overflow-hidden p-4">
      {/* Dark mode's own tokens already give the rest of the card this same
          dark-navy-with-light-text look, so only light mode needs the
          override here, reset back to the plain tokens under `dark:`. The
          negative margin bleeds the fill to the card's own edges (and its
          rounded top corners), rather than sitting inset within the card's
          padding like an ordinary block. */}
      <div className="-m-4 mb-0 space-y-1 rounded-t-lg bg-primary p-4 text-primary-foreground dark:m-0 dark:rounded-none dark:bg-transparent dark:p-0 dark:text-inherit">
        <Badge tone="success" className="w-fit">
          <CircleCheck className="size-3" aria-hidden />
          {t("runs.statusConfirmed")}
        </Badge>
        <Link
          href={`/results/${championship.slug}`}
          className="block font-semibold text-primary-foreground hover:underline dark:text-foreground"
        >
          {championshipDisplayName(championship.name, championship.nameAr, locale)}
        </Link>
        <p className="text-xs text-primary-foreground/70 dark:text-muted">
          {formatCompetitionDate(championship.startDate, locale)} ·{" "}
          <bdi>
            {championshipDisplayName(championship.location, championship.locationAr, locale)}
          </bdi>
        </p>
      </div>

      {topRows.length > 0 ? (
        <ul className="mt-3 space-y-2 border-t border-border pt-3">
          {topRows.map((row) => (
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
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-3 text-sm">
        <Link href={`/results/${championship.slug}`} className="font-medium text-primary hover:underline">
          {t("publicResults.viewFullResults")}
        </Link>
        {availability.overall ? (
          <Link
            href={`/results/${championship.slug}/pdf/OVERALL`}
            target="_blank"
            className="inline-flex items-center gap-1 font-medium text-muted hover:text-foreground"
          >
            <Download className="size-3.5" aria-hidden />
            {t("publicResults.downloadPdf")}
          </Link>
        ) : null}
      </div>
    </Card>
  );
}
