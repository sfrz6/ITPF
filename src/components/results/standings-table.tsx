"use client";

import { cn } from "@/lib/cn";
import { CountryFlag } from "@/components/common/country-flag";
import { Badge, EmptyState } from "@/components/ui/surfaces";
import { Table, TBody, Td, TdNum, THead, Th, ThNum, TableWrapper, Tr } from "@/components/ui/table";
import { useI18n } from "@/lib/i18n/client";
import type { DayNumber, StandingsScope, StandingsSubject } from "@/domain/results";
import type { StandingRow } from "./standings-data";

/**
 * The standings table shared by the internal results tab and the public
 * results page, so an official and a spectator read exactly the same numbers.
 *
 * Rank, name and total stay pinned while the day columns scroll, which keeps
 * the table readable on a 375px wide screen without hiding any value.
 */

const STICKY_START = "sticky start-0 z-20";
const STICKY_NAME = "sticky start-14 z-20";
const STICKY_END = "sticky end-0 z-20";

export function StandingsTable({
  subject,
  days,
  rows,
}: {
  subject: StandingsSubject;
  days: readonly DayNumber[];
  rows: readonly StandingRow[];
}) {
  const { t } = useI18n();

  if (rows.length === 0) {
    return <EmptyState title={t("results.noData")} />;
  }

  const isCountry = subject === "COUNTRY";

  return (
    <TableWrapper>
      <Table>
        <THead>
          <Tr>
            <ThNum className={cn(STICKY_START, "w-14 bg-surface-sunken text-center")}>
              {t("common.rank")}
            </ThNum>
            <Th className={cn(STICKY_NAME, "min-w-40 bg-surface-sunken border-e border-border")}>
              {isCountry ? t("common.country") : t("common.rider")}
            </Th>
            {isCountry ? (
              <>
                <ThNum className="whitespace-nowrap">{t("results.riderPoints")}</ThNum>
                <ThNum className="whitespace-nowrap">{t("results.countryFaults")}</ThNum>
              </>
            ) : null}
            {days.map((day) => (
              <ThNum key={day} className="whitespace-nowrap">
                {t("results.dayResults", { day })}
              </ThNum>
            ))}
            <ThNum className={cn(STICKY_END, "bg-surface-sunken border-s border-border")}>
              {t("common.total")}
            </ThNum>
          </Tr>
        </THead>
        <TBody>
          {rows.map((row) => {
            // Rank 1, 2 and 3 read slightly stronger. This is official
            // software, so a placing carries no other decoration.
            const strong = row.rank <= 3;
            return (
              <Tr key={row.key} className={cn(strong && "font-medium")}>
                <TdNum
                  className={cn(STICKY_START, "w-14 bg-surface-raised text-center text-muted")}
                >
                  {row.rank}
                </TdNum>
                <Td className={cn(STICKY_NAME, "min-w-40 bg-surface-raised border-e border-border")}>
                  <span className="flex items-center gap-2">
                    <CountryFlag iso2={row.iso2} />
                    <span className="min-w-0">
                      <span className="block truncate">{row.name}</span>
                      {isCountry ? null : (
                        <span className="block truncate text-xs text-muted">
                          {row.countryName}
                        </span>
                      )}
                    </span>
                    {row.isTiedAfterTieBreak ? (
                      <Badge tone="warning" className="shrink-0">
                        {t("results.tied")}
                      </Badge>
                    ) : null}
                  </span>
                </Td>
                {isCountry ? (
                  <>
                    <TdNum className="text-muted">{row.riderPoints}</TdNum>
                    <TdNum className="text-muted">{row.countryFaults}</TdNum>
                  </>
                ) : null}
                {row.dayValues.map((value) => (
                  <TdNum key={value.day} className="text-muted">
                    {value.value}
                  </TdNum>
                ))}
                <TdNum
                  className={cn(
                    STICKY_END,
                    "bg-surface-raised border-s border-border font-semibold",
                  )}
                >
                  {row.total}
                </TdNum>
              </Tr>
            );
          })}
        </TBody>
      </Table>
    </TableWrapper>
  );
}

export interface ToggleOption<T extends string> {
  readonly value: T;
  readonly label: string;
}

/**
 * Small segmented control used for the subject and scope choices. It is a
 * radio group rather than a tab library so the whole table stays in one
 * accessible document order.
 */
export function StandingsToggle<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly ToggleOption<T>[];
  onChange: (value: T) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex overflow-hidden rounded-md border border-border-strong"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          onClick={() => onChange(option.value)}
          className={cn(
            "h-8 whitespace-nowrap border-s border-border-strong px-3 text-xs transition-colors first:border-s-0",
            option.value === value
              ? "bg-primary font-semibold text-primary-foreground"
              : "bg-surface-raised text-foreground hover:bg-surface-sunken",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

const SCOPE_LABEL_KEYS = {
  DAY_1: "results.day1",
  DAY_2: "results.day2",
  DAY_3: "results.day3",
  OVERALL: "results.overall",
} as const;

/** Dictionary key for a scope, used by both standings views. */
export function scopeLabelKey(scope: StandingsScope): (typeof SCOPE_LABEL_KEYS)[StandingsScope] {
  return SCOPE_LABEL_KEYS[scope];
}
