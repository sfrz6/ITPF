import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requirePageUser } from "@/lib/auth/page-guards";
import { hasPermission } from "@/domain/permissions";
import { getTranslator } from "@/lib/i18n/server";
import { getEventReviewState } from "@/server/services/runs";
import { formatCompetitionDate } from "@/components/common/formatting";
import { eventLabel } from "@/components/common/labels";
import { eventNeedsReview } from "@/domain/scoring/event-types";
import { EventReview } from "./event-review";

export default async function EventReviewPage({
  params,
}: {
  params: Promise<{ championshipId: string; eventId: string }>;
}) {
  const principal = await requirePageUser();
  const { championshipId, eventId } = await params;
  const { locale, t } = await getTranslator();

  const state = await getEventReviewState(eventId, locale);
  if (!state || state.championshipId !== championshipId) notFound();
  if (!eventNeedsReview(state.eventType)) notFound();

  // Server components can pass client components plain, serializable data
  // only — the service layer keeps its `Map`s for cheap key lookups, so
  // everything crossing that boundary is flattened to plain objects here.
  const countryPointsSoFar: Record<string, string> = {};
  for (const [championshipCountryId, points] of state.countryPointsSoFar) {
    countryPointsSoFar[championshipCountryId] = points;
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <Link
          href={`/championships/${championshipId}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-foreground hover:text-primary"
        >
          <ChevronLeft className="size-4 rtl:rotate-180" aria-hidden />
          {t("championships.schedule")}
        </Link>
        <h2 className="text-lg font-semibold tracking-tight">
          {eventLabel(state.eventType, t)} · {t("runs.reviewEvent")}
        </h2>
        <p className="text-sm text-muted">
          {t("championships.daysOf", { day: state.dayNumber })} ·{" "}
          {formatCompetitionDate(state.competitionDate, locale)}
        </p>
      </div>

      <EventReview
        championshipId={championshipId}
        eventId={eventId}
        eventType={state.eventType}
        reviewedAt={state.reviewedAt ? state.reviewedAt.toISOString() : null}
        reviewedByName={state.reviewedByName}
        allRunsConfirmed={state.allRunsConfirmed}
        confirmedDayTotalByCountry={countryPointsSoFar}
        runs={state.runs.map((run) => ({
          runId: run.runId,
          runNumber: run.runNumber,
          pegSizeCm: run.pegSizeCm,
          timeLimitSeconds: run.timeLimitSeconds,
          status: run.status,
          version: run.version,
          countries: run.countries.map((country) => ({
            championshipCountryId: country.championshipCountryId,
            iso2: country.iso2,
            countryName: country.countryName,
            decision: country.decision,
            units: country.units.map((unit) => ({
              runScoringUnitId: unit.runScoringUnitId,
              unitIndex: unit.unitIndex,
              timeSeconds: unit.timeSeconds,
              riders: unit.riders.map((rider) => ({
                runScoreId: rider.runScoreId,
                championshipRiderId: rider.championshipRiderId,
                riderName: rider.riderName,
                shirtNumber: rider.shirtNumber,
                positionInUnit: rider.positionInUnit,
                targets: [...rider.targets],
              })),
            })),
          })),
        }))}
        permissions={{
          editConfirmed: hasPermission(principal, "EDIT_CONFIRMED_RESULTS"),
          confirmRuns: hasPermission(principal, "CONFIRM_RUNS"),
        }}
      />
    </div>
  );
}
