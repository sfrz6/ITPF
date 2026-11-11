import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Trophy, Users } from "lucide-react";
import { championshipDisplayName, formatCompetitionDate } from "@/components/common/formatting";
import { Button } from "@/components/ui/button";
import { Badge, Card, CardContent, CardHeader, CardTitle, EmptyState, PageHeader } from "@/components/ui/surfaces";
import { getTranslator } from "@/lib/i18n/server";
import { listChampionships } from "@/server/services/championships";
import { addDays, CHAMPIONSHIP_DAYS } from "@/server/services/championship-setup";
import { AutoRefresh } from "./auto-refresh";

/**
 * The root layout keeps the application out of search indexes, because every
 * other route is an operational screen. This page is the opposite: it is the
 * federation's published record, so it opts back in.
 */
export const metadata: Metadata = {
  title: "Official results",
  description:
    "Published championship results of the International Tent Pegging Federation.",
  robots: { index: true, follow: true },
};

/**
 * Standings change only when an official confirms a run, and the published
 * record is read far more often than it changes. Revalidating every 30 seconds
 * means a newly confirmed run reaches the public within half a minute without
 * a rebuild, while a burst of readers is served from the cache.
 */
export const revalidate = 30;

export default async function PublicResultsIndexPage() {
  const { locale, t } = await getTranslator();
  const championships = await listChampionships({ publishedOnly: true });
  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <>
      {/* Lets a visitor who opens this page before anything is published
          still see a championship appear the moment it goes live, without
          needing to reload: see the component for how it avoids resetting
          any client-side state. */}
      <AutoRefresh intervalMs={15_000} />

      <PageHeader title={t("publicResults.title")} description={t("publicResults.subtitle")} />

      {championships.length === 0 ? (
        <EmptyState icon={<Trophy />} title={t("publicResults.noChampionships")} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {championships.map((championship) => {
            const endDate = addDays(championship.startDate, CHAMPIONSHIP_DAYS - 1);
            const isLive = championship.startDate <= todayIso && todayIso <= endDate;
            return (
            <li key={championship.id}>
              <Card className="flex h-full flex-col">
                <CardHeader className="items-start gap-3">
                  {championship.hasChampionshipLogo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/championships/${championship.id}/logo/championship`}
                      alt=""
                      className="size-10 shrink-0 rounded-md border border-border bg-surface-raised object-contain p-1"
                    />
                  ) : null}
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-base">
                        {championshipDisplayName(championship.name, championship.nameAr, locale)}
                      </CardTitle>
                      {isLive ? (
                        <Badge tone="success" className="shrink-0">
                          <span
                            className="size-1.5 rounded-full bg-success motion-safe:animate-pulse"
                            aria-hidden
                          />
                          {t("publicResults.statusLive")}
                        </Badge>
                      ) : championship.status === "COMPLETED" ? (
                        <Badge tone="neutral" className="shrink-0">
                          {t("championships.statusCompleted")}
                        </Badge>
                      ) : null}
                    </span>
                    {/*
                      `bdi` isolates the location as one atomic run so Arabic's
                      bidi reordering doesn't tear it apart mid-phrase when the
                      line wraps, without disturbing the date's own (already
                      correct) right-to-left flow.
                    */}
                    <p className="text-sm text-muted">
                      {formatCompetitionDate(championship.startDate, locale)} ·{" "}
                      <bdi>
                        {championshipDisplayName(
                          championship.location,
                          championship.locationAr,
                          locale,
                        )}
                      </bdi>
                    </p>
                  </span>
                </CardHeader>
                <CardContent className="mt-auto space-y-3">
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                    <span className="numeric">
                      {championship.confirmedRuns > 0
                        ? t("publicResults.roundsProgress", {
                            confirmed: championship.confirmedRuns,
                            total: championship.totalRuns,
                          })
                        : t("publicResults.confirmedRuns", { count: 0 })}
                    </span>
                    <span aria-hidden>·</span>
                    <span className="numeric">
                      {t("publicResults.countriesCount", { count: championship.countryCount })}
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="border-transparent bg-primary text-primary-foreground hover:bg-primary-hover dark:border-border-strong dark:bg-surface-raised dark:text-foreground dark:hover:bg-surface-sunken"
                      asChild
                    >
                      <Link href={`/results/${championship.slug}`}>
                        {t("publicResults.viewResults")}
                        <ChevronRight className="rtl:rotate-180" aria-hidden />
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/results/${championship.slug}/participants`}>
                        <Users aria-hidden />
                        {t("publicResults.participatingCountries")}
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
