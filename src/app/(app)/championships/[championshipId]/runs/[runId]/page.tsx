import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { requirePageUser } from "@/lib/auth/page-guards";
import { hasPermission } from "@/domain/permissions";
import { getTranslator } from "@/lib/i18n/server";
import { listRunsInOrder } from "@/server/services/championships";
import {
  getRunEntryOrderState,
  getRunScoringState,
  listRunRevisions,
} from "@/server/services/runs";
import { formatCompetitionDate } from "@/components/common/formatting";
import { eventLabel } from "@/components/common/labels";
import { RunWorkspace } from "./run-workspace";

export default async function RunPage({
  params,
}: {
  params: Promise<{ championshipId: string; runId: string }>;
}) {
  const principal = await requirePageUser();
  const { championshipId, runId } = await params;
  const { locale, t } = await getTranslator();

  const entryOrderState = await getRunEntryOrderState(runId, locale);
  if (!entryOrderState || entryOrderState.run.championshipId !== championshipId) notFound();

  const [scoringState, revisions, runsInOrder] = await Promise.all([
    getRunScoringState(runId, locale),
    listRunRevisions(runId),
    listRunsInOrder(championshipId),
  ]);

  const index = runsInOrder.findIndex((entry) => entry.id === runId);
  const previousRun = index > 0 ? runsInOrder[index - 1] : undefined;
  const nextRun = index >= 0 && index < runsInOrder.length - 1 ? runsInOrder[index + 1] : undefined;

  const run = entryOrderState.run;

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <Link
          href={`/championships/${championshipId}`}
          className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground"
        >
          <ChevronLeft className="size-3.5 rtl:rotate-180" aria-hidden />
          {t("championships.schedule")}
        </Link>
        <h2 className="text-lg font-semibold tracking-tight">
          {eventLabel(run.eventType, t)} · {t("templates.runNumber", { number: run.runNumber })}
        </h2>
        <p className="text-sm text-muted">
          {t("championships.daysOf", { day: run.dayNumber })} ·{" "}
          {formatCompetitionDate(run.competitionDate, locale)}
        </p>
      </div>

      <RunWorkspace
        championshipId={championshipId}
        run={{
          runId: run.runId,
          eventId: run.eventId,
          runNumber: run.runNumber,
          eventType: run.eventType,
          pegSizeCm: run.pegSizeCm,
          timeLimitSeconds: run.timeLimitSeconds,
          status: run.status,
          version: run.version,
          dayNumber: run.dayNumber,
        }}
        entryOrder={{
          countries: entryOrderState.countries.map((country) => ({
            championshipCountryId: country.championshipCountryId,
            iso2: country.iso2,
            countryName: country.countryName,
            decision: country.decision,
            previousOrder: [...country.previousOrder],
            confirmedOrder: [...country.confirmedOrder],
            roster: country.roster.map((member) => ({
              championshipRiderId: member.championshipRiderId,
              fullName: member.fullName,
              rosterSlot: member.rosterSlot,
              initialOrder: member.initialOrder,
            })),
          })),
          confirmedCount: entryOrderState.confirmedCount,
          totalCount: entryOrderState.totalCount,
          allConfirmed: entryOrderState.allConfirmed,
        }}
        scoring={
          scoringState
            ? scoringState.countries.map((country) => ({
                championshipCountryId: country.championshipCountryId,
                iso2: country.iso2,
                countryName: country.countryName,
                units: country.units.map((unit) => ({
                  runScoringUnitId: unit.runScoringUnitId,
                  unitIndex: unit.unitIndex,
                  timeSeconds: unit.timeSeconds,
                  riders: unit.riders.map((rider) => ({
                    runScoreId: rider.runScoreId,
                    championshipRiderId: rider.championshipRiderId,
                    riderName: rider.riderName,
                    positionInUnit: rider.positionInUnit,
                    targets: [...rider.targets],
                  })),
                })),
              }))
            : []
        }
        revisions={revisions.map((revision) => ({
          id: revision.id,
          revisionNumber: revision.revisionNumber,
          reason: revision.reason,
          changedByName: revision.changedByName,
          createdAt: revision.createdAt.toISOString(),
        }))}
        permissions={{
          manageEntryOrders: hasPermission(principal, "MANAGE_ENTRY_ORDERS"),
          enterScores: hasPermission(principal, "ENTER_SCORES"),
          confirmRuns: hasPermission(principal, "CONFIRM_RUNS"),
          editConfirmed: hasPermission(principal, "EDIT_CONFIRMED_RESULTS"),
          print: hasPermission(principal, "PRINT_ROUND_SHEETS"),
        }}
        navigation={{
          previousRunId: previousRun?.id ?? null,
          nextRunId: nextRun?.id ?? null,
        }}
      />
    </div>
  );
}
