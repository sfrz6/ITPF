"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarDays, ChevronRight, ClipboardCheck, MonitorPlay } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { getEventTypeDefinition, type EventTypeKey } from "@/domain/scoring/event-types";
import { Badge, Card, CardContent, CardHeader, CardTitle, EmptyState } from "@/components/ui/surfaces";
import { Button } from "@/components/ui/button";
import { StandingsToggle, type ToggleOption } from "@/components/results/standings-table";
import { formatCompetitionDate, formatPegSize, formatTime } from "@/components/common/formatting";
import { eventLabel, runStatusLabel, runStatusTone } from "@/components/common/labels";
import type { DisplaySettings } from "@/domain/display/settings";
import type { RunStatus } from "@/server/services/runs";
import { DisplaySettingsDialog } from "./display-settings-dialog";
import { ResetEventButton } from "./reset-event-button";

export interface ScheduleRun {
  readonly id: string;
  readonly runNumber: number;
  readonly pegSizeCm: string;
  readonly timeLimitSeconds: string;
  readonly status: RunStatus;
}

export interface ScheduleEvent {
  readonly id: string;
  readonly eventType: EventTypeKey;
  readonly needsReview: boolean;
  readonly reviewedAt: string | null;
  readonly runs: readonly ScheduleRun[];
}

export interface ScheduleDay {
  readonly id: string;
  readonly dayNumber: number;
  readonly competitionDate: string;
  readonly displaySettings: DisplaySettings;
  readonly events: readonly ScheduleEvent[];
}

const ALL_DAYS = "ALL";

/**
 * The championship's own day-by-day schedule, with a Day 1 / Day 2 / Day 3 /
 * Overall toggle (same segmented control the public results page uses) so an
 * official can jump straight to the day they're working on instead of
 * scrolling past every other day's events.
 */
export function ScheduleDays({
  days,
  championshipId,
  championshipSlug,
  isPublished,
  canEdit,
  canReview,
  isAdmin,
}: {
  days: readonly ScheduleDay[];
  championshipId: string;
  championshipSlug: string;
  isPublished: boolean;
  canEdit: boolean;
  canReview: boolean;
  isAdmin: boolean;
}) {
  const { locale, t } = useI18n();
  const [selected, setSelected] = React.useState<string>(ALL_DAYS);

  if (days.every((day) => day.events.length === 0)) {
    return <EmptyState icon={<CalendarDays />} title={t("results.noData")} />;
  }

  const options: readonly ToggleOption<string>[] = [
    ...days.map((day) => ({
      value: String(day.dayNumber),
      label: t("championships.dayNumber", { day: day.dayNumber }),
    })),
    { value: ALL_DAYS, label: t("championships.allDays") },
  ];
  const visibleDays =
    selected === ALL_DAYS ? days : days.filter((day) => String(day.dayNumber) === selected);

  return (
    <div className="space-y-5">
      <StandingsToggle
        label={t("championships.schedule")}
        value={selected}
        options={options}
        onChange={setSelected}
      />

      {visibleDays.map((day) => (
        <Card key={day.id}>
          <CardHeader>
            <div>
              <CardTitle>{t("championships.daysOf", { day: day.dayNumber })}</CardTitle>
              <p className="mt-0.5 text-xs text-muted">
                {formatCompetitionDate(day.competitionDate, locale)}
              </p>
            </div>
            <span className="flex items-center gap-2">
              <Badge tone="outline">
                {t("championships.eventsCount", { count: day.events.length })}
              </Badge>
              {isPublished ? (
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/results/${championshipSlug}/display/${day.dayNumber}`} target="_blank">
                    <MonitorPlay aria-hidden />
                    {t("championships.openDisplay")}
                  </Link>
                </Button>
              ) : null}
              {isPublished && canEdit ? (
                <DisplaySettingsDialog
                  championshipDayId={day.id}
                  dayNumber={day.dayNumber}
                  settings={day.displaySettings}
                />
              ) : null}
            </span>
          </CardHeader>
          <CardContent className="space-y-3">
            {day.events.length === 0 ? (
              <p className="text-sm text-muted">{t("templates.noEventsOnDay")}</p>
            ) : (
              day.events.map((event) => {
                const definition = getEventTypeDefinition(event.eventType);
                const label = eventLabel(event.eventType, t);
                const hasSomethingToReset = event.runs.some(
                  (runItem) => runItem.status !== "ENTRY_ORDER_PENDING",
                );
                const allRunsConfirmed =
                  event.runs.length > 0 &&
                  event.runs.every((runItem) => runItem.status === "CONFIRMED");
                const showReviewAction = event.needsReview && allRunsConfirmed && !event.reviewedAt;
                return (
                  <div key={event.id} className="rounded-md border border-border bg-surface-sunken">
                    <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                      <h3 className="text-sm font-medium">{label}</h3>
                      <span className="flex items-center gap-2">
                        <span className="text-xs text-muted">
                          {t("championships.runsCount", { count: event.runs.length })} ·{" "}
                          {definition.ridersPerScoringUnit > 1
                            ? `${definition.ridersPerScoringUnit} ${t("common.rider")}`
                            : t("common.rider")}
                        </span>
                        {event.needsReview && event.reviewedAt ? (
                          canReview ? (
                            <Link
                              href={`/championships/${championshipId}/events/${event.id}/review`}
                              className="rounded-full transition-opacity hover:opacity-80"
                            >
                              <Badge tone="success">{t("runs.eventReviewed")}</Badge>
                            </Link>
                          ) : (
                            <Badge tone="success">{t("runs.eventReviewed")}</Badge>
                          )
                        ) : null}
                        {showReviewAction && canReview ? (
                          <Button variant="secondary" size="sm" asChild>
                            <Link href={`/championships/${championshipId}/events/${event.id}/review`}>
                              <ClipboardCheck aria-hidden />
                              {t("runs.reviewEvent")}
                            </Link>
                          </Button>
                        ) : showReviewAction ? (
                          <Badge tone="warning">{t("runs.eventReviewPending")}</Badge>
                        ) : null}
                        {isAdmin && hasSomethingToReset ? (
                          <ResetEventButton eventId={event.id} eventLabel={label} />
                        ) : null}
                      </span>
                    </div>
                    <ul className="divide-hairline border-t border-border">
                      {event.runs.map((runItem) => (
                        <li key={runItem.id}>
                          <Link
                            href={`/championships/${championshipId}/runs/${runItem.id}`}
                            className="flex items-center gap-3 bg-surface-raised px-3 py-2.5 transition-colors hover:bg-surface-sunken"
                          >
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm">
                                {t("templates.runNumber", { number: runItem.runNumber })}
                              </span>
                              <span className="numeric block text-xs text-muted">
                                {formatPegSize(runItem.pegSizeCm)} {t("common.centimetres")} ·{" "}
                                {formatTime(runItem.timeLimitSeconds)} {t("common.seconds")}
                              </span>
                            </span>
                            <Badge tone={runStatusTone(runItem.status)}>
                              {runStatusLabel(runItem.status, t)}
                            </Badge>
                            <ChevronRight className="size-4 shrink-0 text-subtle rtl:rotate-180" aria-hidden />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
