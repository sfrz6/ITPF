import * as React from "react";
import { getEventTypeDefinition, type EventTypeKey } from "@/domain/scoring/event-types";
import { scoreRun, type RunScoringInput } from "@/domain/scoring/engine";
import { formatPoints } from "@/domain/scoring/decimal";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/surfaces";
import { Table, TBody, Td, TdNum, THead, Th, Tr } from "@/components/ui/table";
import { CountryFlag } from "@/components/common/country-flag";
import { formatPegSize, formatTime, riderDisplayName } from "@/components/common/formatting";
import { targetLabels } from "@/components/common/target-labels";
import { useI18n } from "@/lib/i18n/client";
import type { ScoringCountry } from "../../../runs/[runId]/scoring-grid";

export interface ReviewTableCountry extends ScoringCountry {
  readonly decision: "NO_CHANGE" | "CHANGED" | null;
}

export interface ReviewTableRun {
  readonly runId: string;
  readonly runNumber: number;
  readonly pegSizeCm: string;
  readonly timeLimitSeconds: string;
  readonly countries: readonly ReviewTableCountry[];
}

/**
 * The event's actual recorded scores, runs side by side — but with the
 * rider's own name and score as a column inside each run's own group,
 * never a single name shared across runs.
 *
 * A country can swap a rider between an event's runs (an injury, say), so
 * the rider who rode Run 1's position 2 and the rider who rode Run 2's
 * position 2 can genuinely be two different people. Anchoring one shared
 * name column to the first run's lineup would either show the wrong name
 * for a later run or drop the substitute's score entirely — this keeps each
 * run's column accountable only to its own confirmed entry order.
 */
export function ReviewTable({
  eventType,
  runs,
}: {
  eventType: EventTypeKey;
  runs: readonly ReviewTableRun[];
}) {
  const { t } = useI18n();
  const definition = getEventTypeDefinition(eventType);
  const headings = targetLabels(eventType, definition.targetsPerRider, t);
  const sharedTime = definition.ridersPerScoringUnit > 1;

  // Every run computes its own scoring result from its own recorded values —
  // the same pure engine the live scoring screen uses — so what this table
  // shows is guaranteed to match what was actually confirmed.
  const computedByRun = React.useMemo(() => {
    return new Map(
      runs.map((run) => {
        const input: RunScoringInput = {
          eventTypeKey: eventType,
          timeLimitSeconds: run.timeLimitSeconds,
          units: run.countries.flatMap((country) =>
            country.units.map((unit) => ({
              unitIndex: unit.unitIndex,
              championshipCountryId: country.championshipCountryId,
              timeSeconds: unit.timeSeconds,
              riders: unit.riders.map((rider) => ({
                championshipRiderId: rider.championshipRiderId,
                positionInUnit: rider.positionInUnit,
                targets: rider.targets.map((value) => (value === null ? null : Number(value))),
              })),
            })),
          ),
        };
        const result = scoreRun(input);
        return [
          run.runId,
          {
            unitsByKey: new Map(
              result.units.map((unit) => [`${unit.championshipCountryId}:${unit.unitIndex}`, unit]),
            ),
            ridersById: new Map(result.riders.map((rider) => [rider.championshipRiderId, rider])),
          },
        ];
      }),
    );
  }, [runs, eventType]);

  // Country order and the number of unit/position slots are fixed by the
  // event type, so they stay stable across runs even when who occupies a
  // slot does not — only the first run that lists a country decides where
  // its section sits, since every run of one event normally shares the same
  // countries.
  const countriesInOrder: { championshipCountryId: string; iso2: string; countryName: string }[] =
    [];
  const seenCountryIds = new Set<string>();
  for (const run of runs) {
    for (const country of run.countries) {
      if (seenCountryIds.has(country.championshipCountryId)) continue;
      seenCountryIds.add(country.championshipCountryId);
      countriesInOrder.push({
        championshipCountryId: country.championshipCountryId,
        iso2: country.iso2,
        countryName: country.countryName,
      });
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="grid gap-3 py-3 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-wide text-subtle">{t("runs.pegSize")}</p>
            <p className="numeric text-sm font-medium">
              {runs
                .map(
                  (run) =>
                    `${t("templates.runNumber", { number: run.runNumber })}: ${formatPegSize(run.pegSizeCm)} ${t("common.centimetres")}`,
                )
                .join(" · ")}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-subtle">{t("runs.timeLimit")}</p>
            <p className="numeric text-sm font-medium">
              {runs
                .map(
                  (run) =>
                    `${t("templates.runNumber", { number: run.runNumber })}: ${formatTime(run.timeLimitSeconds)} ${t("common.seconds")}`,
                )
                .join(" · ")}
            </p>
          </div>
        </CardContent>
      </Card>

      {countriesInOrder.map((countryMeta) => {
        return (
          <Card key={countryMeta.championshipCountryId} className="overflow-hidden py-0">
            <CardHeader className="flex-row items-center gap-2 border-b border-border bg-surface-sunken py-2.5">
              <CardTitle className="flex flex-1 items-center gap-2 text-sm">
                <CountryFlag iso2={countryMeta.iso2} size="md" />
                {countryMeta.countryName}
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <Table className="text-xs">
                <THead>
                  <Tr>
                    <Th className="w-8 text-center">#</Th>
                    {runs.map((run) => (
                      <Th
                        key={run.runId}
                        colSpan={1 + headings.length + 3}
                        className="border-s border-border text-center"
                      >
                        {t("templates.runNumber", { number: run.runNumber })}
                      </Th>
                    ))}
                  </Tr>
                  <Tr>
                    <Th />
                    {runs.map((run) => (
                      <React.Fragment key={run.runId}>
                        <Th className="border-s border-border">{t("common.rider")}</Th>
                        {headings.map((heading, index) => (
                          <Th key={index} className="w-12 text-center">
                            {heading}
                          </Th>
                        ))}
                        <Th className="w-14 text-center">{t("common.time")}</Th>
                        <Th className="w-12 text-center">{t("runs.penalty")}</Th>
                        <Th className="w-12 text-center">{t("runs.netPoints")}</Th>
                      </React.Fragment>
                    ))}
                  </Tr>
                </THead>
                <TBody>
                  {Array.from({ length: definition.unitsPerCountry }, (_, unitIndex) =>
                    Array.from({ length: definition.ridersPerScoringUnit }, (_, riderIndex) => {
                      const position = unitIndex * definition.ridersPerScoringUnit + riderIndex + 1;
                      return (
                        <Tr key={position}>
                          <TdNum className="text-center">{position}</TdNum>
                          {runs.map((run) => {
                            const country = run.countries.find(
                              (candidate) =>
                                candidate.championshipCountryId ===
                                countryMeta.championshipCountryId,
                            );
                            const unit = country?.units.find((u) => u.unitIndex === unitIndex);
                            const rider = unit?.riders[riderIndex];
                            const computed = computedByRun.get(run.runId);
                            const riderResult = rider
                              ? computed?.ridersById.get(rider.championshipRiderId)
                              : undefined;
                            const unitResult = computed?.unitsByKey.get(
                              `${countryMeta.championshipCountryId}:${unitIndex}`,
                            );
                            const showUnitCells = !sharedTime || riderIndex === 0;
                            return (
                              <React.Fragment key={run.runId}>
                                <Td className="border-s border-border">
                                  {rider ? (
                                    <>
                                      <bdi>{riderDisplayName(rider.riderName, rider.shirtNumber)}</bdi>
                                      {definition.ruleType === "PAIR" && riderIndex === 0 ? (
                                        <span className="text-subtle">
                                          {" "}
                                          ({t("runs.pairLabel", { number: unitIndex + 1 })})
                                        </span>
                                      ) : null}
                                    </>
                                  ) : (
                                    <span className="text-subtle">—</span>
                                  )}
                                </Td>
                                {headings.map((_, index) => (
                                  <TdNum key={index} className="text-center">
                                    {rider?.targets[index] != null
                                      ? formatPoints(rider.targets[index]!)
                                      : ""}
                                  </TdNum>
                                ))}
                                {showUnitCells ? (
                                  <>
                                    <TdNum
                                      className="text-center"
                                      rowSpan={
                                        sharedTime ? definition.ridersPerScoringUnit : undefined
                                      }
                                    >
                                      {unit?.timeSeconds ? formatTime(unit.timeSeconds) : ""}
                                    </TdNum>
                                    <TdNum
                                      className="text-center"
                                      rowSpan={
                                        sharedTime ? definition.ridersPerScoringUnit : undefined
                                      }
                                    >
                                      {unitResult ? formatPoints(unitResult.penalty) : ""}
                                    </TdNum>
                                    <TdNum
                                      className="text-center font-semibold"
                                      rowSpan={
                                        sharedTime ? definition.ridersPerScoringUnit : undefined
                                      }
                                    >
                                      {sharedTime
                                        ? unitResult
                                          ? formatPoints(unitResult.netPoints)
                                          : ""
                                        : riderResult
                                          ? formatPoints(riderResult.netPoints)
                                          : ""}
                                    </TdNum>
                                  </>
                                ) : null}
                              </React.Fragment>
                            );
                          })}
                        </Tr>
                      );
                    }),
                  )}
                </TBody>
              </Table>
            </CardContent>
            <div className="flex flex-wrap gap-2 border-t border-border px-3 py-2">
              {runs.map((run) => {
                const country = run.countries.find(
                  (candidate) => candidate.championshipCountryId === countryMeta.championshipCountryId,
                );
                return (
                  <Badge
                    key={run.runId}
                    tone={country?.decision === "CHANGED" ? "warning" : "outline"}
                  >
                    {t("templates.runNumber", { number: run.runNumber })}:{" "}
                    {country?.decision === "CHANGED"
                      ? t("runs.changeOrder")
                      : country?.decision === "NO_CHANGE"
                        ? t("runs.noChange")
                        : t("runs.notReviewed")}
                  </Badge>
                );
              })}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
