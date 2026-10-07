import {
  buildStandings,
  scopeForDay,
  type ChampionshipTotals,
  type DayNumber,
  type StandingsScope,
  type StandingsSubject,
} from "@/domain/results";
import { formatPoints } from "@/domain/scoring/decimal";
import type { Translator } from "@/lib/i18n";
import type {
  ChampionshipParticipantDirectory,
  ChampionshipResults,
  StoredTieBreakRound,
  TieBreakKey,
} from "@/server/services/results";

/**
 * Shapes the results engine output into plain, serialisable rows for the
 * internal and the public standings views.
 *
 * Every ranking number comes from `buildStandings` and every score is formatted
 * with `formatPoints` here, on the server, so no `Decimal` instance ever
 * crosses into a client component and no view ever computes a placing.
 */

const ALL_SCOPES: readonly StandingsScope[] = ["DAY_1", "DAY_2", "DAY_3", "OVERALL"];
const ALL_SUBJECTS: readonly StandingsSubject[] = ["INDIVIDUAL", "COUNTRY"];

export function dayOfScope(scope: StandingsScope): DayNumber | null {
  switch (scope) {
    case "DAY_1":
      return 1;
    case "DAY_2":
      return 2;
    case "DAY_3":
      return 3;
    default:
      return null;
  }
}

export function tieBreakKeyOf(scope: StandingsScope, subject: StandingsSubject): TieBreakKey {
  return `${scope}:${subject}`;
}

/** One day column of a standings row, already formatted. */
export interface StandingDayValue {
  readonly day: DayNumber;
  readonly value: string;
}

export interface StandingRow {
  /** Championship rider id for an individual row, championship country id for a country row. */
  readonly key: string;
  readonly rank: number;
  /** Rank from the totals alone, which also groups the members of a tie. */
  readonly baseRank: number;
  readonly isTiedAfterTieBreak: boolean;
  /** Rider name for an individual row, country name for a country row. */
  readonly name: string;
  readonly countryName: string;
  readonly iso2: string;
  readonly dayValues: readonly StandingDayValue[];
  /** Country rows only: the country's riders' points for this scope. */
  readonly riderPoints: string | null;
  /** Country rows only: pair, team and relay faults charged to the country. */
  readonly countryFaults: string | null;
  readonly total: string;
}

export interface StandingsSet {
  readonly scope: StandingsScope;
  readonly subject: StandingsSubject;
  readonly rows: readonly StandingRow[];
  /** True when at least one row still shares its final rank with another. */
  readonly hasUnresolvedTie: boolean;
}

export interface StandingsData {
  /** Days that have at least one confirmed run, in order. */
  readonly days: readonly DayNumber[];
  readonly sets: readonly StandingsSet[];
}

function dayValuesOf(
  days: readonly DayNumber[],
  valueOf: (day: DayNumber) => string,
): readonly StandingDayValue[] {
  return days.map((day) => ({ day, value: valueOf(day) }));
}

function buildSet(
  totals: ChampionshipTotals,
  directory: ChampionshipParticipantDirectory,
  tieBreaks: ReadonlyMap<TieBreakKey, StoredTieBreakRound>,
  days: readonly DayNumber[],
  scope: StandingsScope,
  subject: StandingsSubject,
  t: Translator,
): StandingsSet {
  const includeKeys =
    subject === "INDIVIDUAL" ? [...directory.riders.keys()] : [...directory.countries.keys()];

  const standings = buildStandings(totals, {
    scope,
    subject,
    tieBreak: tieBreaks.get(tieBreakKeyOf(scope, subject)),
    includeKeys,
  });

  const day = dayOfScope(scope);
  const unknown = t("common.unknown");

  const rows = standings.map<StandingRow>((standing) => {
    if (subject === "INDIVIDUAL") {
      const rider = directory.riders.get(standing.key);
      const riderTotals = totals.riders.get(standing.key);
      return {
        key: standing.key,
        rank: standing.rank,
        baseRank: standing.baseRank,
        isTiedAfterTieBreak: standing.isTiedAfterTieBreak,
        name: rider?.riderName ?? unknown,
        countryName: rider?.countryName ?? unknown,
        iso2: rider?.iso2 ?? "",
        dayValues: dayValuesOf(days, (value) =>
          formatPoints(riderTotals?.byDay.get(value) ?? 0),
        ),
        riderPoints: null,
        countryFaults: null,
        total: formatPoints(standing.total),
      };
    }

    const country = directory.countries.get(standing.key);
    const countryTotals = totals.countries.get(standing.key);
    const riderPoints =
      day === null
        ? countryTotals?.riderPointsOverall
        : countryTotals?.riderPointsByDay.get(day);
    const faults =
      day === null ? countryTotals?.penaltiesOverall : countryTotals?.penaltiesByDay.get(day);

    return {
      key: standing.key,
      rank: standing.rank,
      baseRank: standing.baseRank,
      isTiedAfterTieBreak: standing.isTiedAfterTieBreak,
      name: country?.countryName ?? unknown,
      countryName: country?.countryName ?? unknown,
      iso2: country?.iso2 ?? "",
      dayValues: dayValuesOf(days, (value) =>
        formatPoints(countryTotals?.byDay.get(value) ?? 0),
      ),
      riderPoints: formatPoints(riderPoints ?? 0),
      countryFaults: formatPoints(faults ?? 0),
      total: formatPoints(standing.total),
    };
  });

  return {
    scope,
    subject,
    rows,
    hasUnresolvedTie: rows.some((row) => row.isTiedAfterTieBreak),
  };
}

/** Builds every scope and subject combination from one load of the results. */
export function buildStandingsData(results: ChampionshipResults, t: Translator): StandingsData {
  const { totals, directory, tieBreaks } = results;
  const days = totals.daysWithResults;

  const sets: StandingsSet[] = [];
  for (const subject of ALL_SUBJECTS) {
    for (const scope of ALL_SCOPES) {
      sets.push(buildSet(totals, directory, tieBreaks, days, scope, subject, t));
    }
  }

  return { days, sets };
}

/** Scopes a view can offer: the days that have results, then the overall table. */
export function availableScopes(days: readonly DayNumber[]): readonly StandingsScope[] {
  return [...days.map(scopeForDay), "OVERALL"];
}

export interface TieBreakRiderOption {
  readonly championshipRiderId: string;
  readonly riderName: string;
}

/**
 * The four active riders of each country, which are the riders that take part
 * in a country tie-break round. The reserve never rides the draw.
 */
export function activeRidersByCountry(
  directory: ChampionshipParticipantDirectory,
): Readonly<Record<string, readonly TieBreakRiderOption[]>> {
  const result: Record<string, TieBreakRiderOption[]> = {};
  for (const country of directory.countries.keys()) result[country] = [];
  for (const rider of directory.riders.values()) {
    if (rider.rosterSlot !== "ACTIVE") continue;
    const bucket = result[rider.championshipCountryId];
    if (!bucket) continue;
    bucket.push({
      championshipRiderId: rider.championshipRiderId,
      riderName: rider.riderName,
    });
  }
  return result;
}

/** One stored tie-break result, flattened for prefilling the dialog. */
export interface StoredTieBreakEntry {
  readonly key: string;
  readonly points: number;
  readonly timeSeconds: string;
}

/**
 * Stored tie-break rounds keyed by `scope:subject`.
 *
 * A country round is stored as one total per country, because that is how the
 * reference workbook records the team round, so only its time can be prefilled
 * rider by rider.
 */
export function storedTieBreakEntries(
  tieBreaks: ReadonlyMap<TieBreakKey, StoredTieBreakRound>,
): Readonly<Record<string, readonly StoredTieBreakEntry[]>> {
  const result: Record<string, readonly StoredTieBreakEntry[]> = {};
  for (const [key, round] of tieBreaks) {
    result[key] = round.entries.map((entry) => ({
      key: entry.key,
      points: Number(entry.points),
      timeSeconds: String(entry.timeSeconds),
    }));
  }
  return result;
}
