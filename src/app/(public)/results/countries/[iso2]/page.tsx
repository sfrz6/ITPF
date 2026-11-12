import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Users } from "lucide-react";
import { CountryFlag } from "@/components/common/country-flag";
import { championshipDisplayName, formatCompetitionDate, formatOrdinal } from "@/components/common/formatting";
import { cn } from "@/lib/cn";
import { Badge, Card } from "@/components/ui/surfaces";
import { getTranslator } from "@/lib/i18n/server";
import {
  getCountryChampionshipHistory,
  getPublicCountryByIso2,
} from "@/server/services/public-countries";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ iso2: string }>;
}): Promise<Metadata> {
  const { iso2 } = await params;
  const { locale } = await getTranslator();
  const country = await getPublicCountryByIso2(iso2, locale);
  if (!country) return { title: "Countries" };
  return {
    title: country.name,
    description: `ITPF championship history for ${country.name}.`,
    robots: { index: true, follow: true },
  };
}

/**
 * Matches the gold/silver/bronze podium treatment every other leaderboard
 * uses (see `RankBadge`): restrained color, not a generic status tone. Badge's
 * own `tone` variant always contributes its own background/text classes
 * (even when unset, it falls back to "neutral"), which would fight these
 * colors for the same CSS properties, so the podium ranks render as a plain
 * span with their own classes instead of going through `tone`.
 */
function rankBadgeClassName(rank: number): string {
  if (rank === 1) return "border-accent/40 bg-accent-subtle text-accent";
  if (rank === 2) return "border-silver/50 bg-silver/15 text-foreground";
  return "border-bronze/50 bg-bronze/15 text-foreground";
}

export default async function PublicCountryProfilePage({
  params,
}: {
  params: Promise<{ iso2: string }>;
}) {
  const { iso2 } = await params;
  const { locale, t } = await getTranslator();

  const country = await getPublicCountryByIso2(iso2, locale);
  if (!country) notFound();

  const history = await getCountryChampionshipHistory(country.id, locale);
  if (history.length === 0) notFound();

  const mostRecent = history[0]!;

  return (
    <div className="space-y-6">
      <Link
        href="/results/countries"
        className="inline-flex items-center gap-1 text-sm font-medium text-foreground hover:text-primary"
      >
        <ChevronLeft className="size-4 rtl:rotate-180" aria-hidden />
        {t("publicCountries.allCountries")}
      </Link>

      <header className="flex items-center gap-4">
        <CountryFlag iso2={country.iso2} name={country.name} size="lg" className="h-10 w-14" />
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{country.name}</h1>
          <p className="text-sm text-muted">
            {t("publicCountries.championshipsCount", { count: history.length })} ·{" "}
            {t("publicCountries.mostRecently", {
              date: formatCompetitionDate(mostRecent.startDate, locale),
            })}
          </p>
        </div>
      </header>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">{t("publicCountries.championshipHistory")}</h2>
        <ul className="space-y-3">
          {history.map((entry) => (
            <li key={entry.championshipId}>
              <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">
                    {championshipDisplayName(entry.name, entry.nameAr, locale)}
                  </p>
                  <p className="text-sm text-muted">
                    {formatCompetitionDate(entry.startDate, locale)} ·{" "}
                    <bdi>{championshipDisplayName(entry.location, entry.locationAr, locale)}</bdi>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {entry.pending ? (
                    <span
                      className="size-1.5 shrink-0 rounded-full bg-success motion-safe:animate-pulse"
                      aria-hidden
                      title={t("results.liveScore")}
                    />
                  ) : null}
                  {entry.rank !== null ? (
                    entry.rank <= 3 ? (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-sm border px-1.5 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide",
                          rankBadgeClassName(entry.rank),
                        )}
                      >
                        {t("publicCountries.overallRank", { rank: formatOrdinal(entry.rank, locale) })}
                      </span>
                    ) : (
                      <Badge tone="neutral">
                        {t("publicCountries.overallRank", { rank: formatOrdinal(entry.rank, locale) })}
                      </Badge>
                    )
                  ) : null}
                  <Link
                    href={`/results/${entry.slug}`}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {t("publicResults.viewResults")}
                  </Link>
                  <Link
                    href={`/results/${entry.slug}/participants`}
                    className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
                  >
                    <Users className="size-3.5" aria-hidden />
                    {t("publicResults.participatingCountries")}
                  </Link>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
