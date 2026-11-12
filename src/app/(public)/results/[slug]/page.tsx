import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Trophy } from "lucide-react";
import { scopeForDay, type StandingsScope } from "@/domain/results";
import { ItpfLogo } from "@/components/common/itpf-logo";
import {
  championshipDisplayName,
  formatCompetitionDate,
  formatPegSize,
  localizedOptionalText,
} from "@/components/common/formatting";
import { eventLabel } from "@/components/common/labels";
import { Badge, Callout, EmptyState } from "@/components/ui/surfaces";
import { buildStandingsData, pdfAvailability } from "@/components/results/standings-data";
import { getTranslator } from "@/lib/i18n/server";
import { getChampionshipBySlug, getChampionshipDetail } from "@/server/services/championships";
import {
  getLastConfirmedRun,
  getNextRun,
  loadChampionshipResults,
} from "@/server/services/results";
import { AutoRefresh } from "../auto-refresh";
import { PublicStandings } from "./public-standings";

/**
 * Standings change only when an official confirms a run, and the published
 * record is read far more often than it changes. Revalidating every 30 seconds
 * means a newly confirmed run reaches the public within half a minute without
 * a rebuild, while a burst of readers is served from the cache.
 */
export const revalidate = 30;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { locale } = await getTranslator();
  const championship = await getChampionshipBySlug(slug);
  if (!championship) return { title: "Official results" };
  const name = championshipDisplayName(championship.name, championship.nameAr, locale);
  const location = championshipDisplayName(championship.location, championship.locationAr, locale);
  return {
    title: `${name} results`,
    description: `Official results of ${name}, ${location}.`,
    robots: { index: true, follow: true },
  };
}

export default async function PublicChampionshipResultsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { locale, t } = await getTranslator();

  // Only a published championship resolves, so an unpublished competition is
  // indistinguishable from one that does not exist.
  const championship = await getChampionshipBySlug(slug);
  if (!championship) notFound();

  // `loadChampionshipResults` also folds in a run a referee has saved but not
  // yet confirmed (marked `pending` on the resulting rows), so a visitor sees
  // a score as soon as it's entered rather than only once it's confirmed.
  // `getLastConfirmedRun` still reads confirmed runs only — it reports which
  // run was last *confirmed*, a different fact from the live totals above.
  // `getNextRun` only exposes the schedule (event, run number, peg size) of
  // the run that has not started yet, never any score, so it is safe to show
  // publicly either way.
  const [results, lastRun, nextRun, detail] = await Promise.all([
    loadChampionshipResults(championship.id, locale, { includePending: true }),
    getLastConfirmedRun(championship.id),
    getNextRun(championship.id),
    getChampionshipDetail(championship.id),
  ]);

  const { days, sets } = buildStandingsData(results, t);

  // Plain, serialisable shape for the client component: a Map doesn't cross
  // the server/client boundary as cleanly as a record keyed by scope.
  const availability = pdfAvailability(detail?.days ?? []);
  const pdfAvailable: Partial<Record<StandingsScope, boolean>> = { OVERALL: availability.overall };
  for (const [day, ok] of availability.byDay) pdfAvailable[scopeForDay(day)] = ok;

  const currentDay = lastRun?.dayNumber ?? nextRun?.dayNumber ?? null;

  return (
    <div className="space-y-5">
      {/* Keeps the page current for a visitor who leaves it open, without a
          manual reload: see the component for how it avoids resetting their
          selected standings view. */}
      <AutoRefresh intervalMs={15_000} />

      <Link
        href="/results"
        className="inline-flex items-center gap-1 text-sm font-medium text-foreground hover:text-primary"
      >
        <ChevronLeft className="size-4 rtl:rotate-180" aria-hidden />
        {t("publicResults.backToChampionships")}
      </Link>

      <header className="flex items-start gap-4">
        <ItpfLogo width={56} priority />
        <div className="min-w-0 flex-1 space-y-1">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            {championshipDisplayName(championship.name, championship.nameAr, locale)}
          </h1>
          {/*
            `bdi` isolates each of location/organizer as one atomic run so
            Arabic's bidi reordering doesn't tear either apart mid-phrase when
            the line wraps, without disturbing the date's own (already
            correct) right-to-left flow.
          */}
          <p className="text-sm text-muted">
            {formatCompetitionDate(championship.startDate, locale)} ·{" "}
            <bdi>
              {championshipDisplayName(championship.location, championship.locationAr, locale)}
            </bdi>
            {championship.organizer ? (
              <>
                {" "}
                · <bdi>{localizedOptionalText(championship.organizer, championship.organizerAr, locale)}</bdi>
              </>
            ) : null}
          </p>
          <p className="text-xs text-muted">{t("publicResults.subtitle")}</p>
        </div>
        {championship.hasChampionshipLogo || championship.hasOrganizerLogo ? (
          <div className="flex shrink-0 items-center gap-3">
            {/* Sized to match `ItpfLogo` above: same width, no border or
                background box, so these read as logos sitting beside the
                federation mark rather than thumbnails in a frame. */}
            {championship.hasChampionshipLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/championships/${championship.id}/logo/championship`}
                alt=""
                className="h-auto w-14 object-contain"
              />
            ) : null}
            {championship.hasOrganizerLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/championships/${championship.id}/logo/organizer`}
                alt=""
                className="h-auto w-14 object-contain"
              />
            ) : null}
          </div>
        ) : null}
      </header>

      {currentDay !== null ? (
        <dl className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-border bg-surface-raised px-4 py-3 text-sm">
          <div className="flex items-center gap-2">
            <dt className="text-muted">{t("common.day")}</dt>
            <dd className="font-medium">
              {t("publicResults.currentDay", { day: currentDay })}
            </dd>
          </div>
          {lastRun ? (
            <div className="flex items-center gap-2">
              <dt className="text-muted">{t("publicResults.lastConfirmed")}</dt>
              <dd className="flex flex-wrap items-center gap-2 font-medium">
                <span>{eventLabel(lastRun.eventType, t)}</span>
                <Badge tone="outline">
                  {t("templates.runNumber", { number: lastRun.runNumber })}
                </Badge>
              </dd>
            </div>
          ) : null}
          {nextRun ? (
            <div className="flex items-center gap-2">
              <dt className="text-muted">{t("publicResults.nextRun")}</dt>
              <dd className="flex flex-wrap items-center gap-2 font-medium">
                <span>{eventLabel(nextRun.eventType, t)}</span>
                <Badge tone="outline">
                  {t("templates.runNumber", { number: nextRun.runNumber })}
                </Badge>
                <Badge tone="outline">
                  {formatPegSize(nextRun.pegSizeCm)} {t("common.centimetres")}
                </Badge>
              </dd>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Badge tone="success">{t("publicResults.championshipComplete")}</Badge>
            </div>
          )}
        </dl>
      ) : null}

      <Callout tone="info">{t("publicResults.confirmedRunsOnly")}</Callout>

      {results.confirmedRunCount === 0 ? (
        <EmptyState icon={<Trophy />} title={t("results.noConfirmedRuns")} />
      ) : (
        <PublicStandings
          days={days}
          sets={sets}
          slug={championship.slug}
          pdfAvailable={pdfAvailable}
          championshipId={championship.id}
          hasChampionshipLogo={championship.hasChampionshipLogo}
        />
      )}
    </div>
  );
}
