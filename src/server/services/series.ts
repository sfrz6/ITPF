import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { getDb, type Executor } from "@/db";
import { championships, qualificationSeries, qualificationSeriesChampionships } from "@/db/schema";
import { aggregateChampionship, type ConfirmedRun } from "@/domain/results";
import { formatPoints, ZERO, type Decimal } from "@/domain/scoring/decimal";
import { getEventTypeDefinition } from "@/domain/scoring/event-types";
import { calculateStandings } from "@/domain/scoring/standings";
import { DomainError } from "@/server/actions/result";
import { shortenPersonName } from "@/components/common/formatting";
import type { Locale } from "@/lib/i18n/config";
import { listChampionshipCountries, listChampionshipRiders } from "./championships";
import { loadConfirmedRuns } from "./results";

export const MAX_SERIES_NAME_LENGTH = 120;

/**
 * Builds a URL safe identity for the public rankings page. Mirrors
 * `slugify` in `championship-setup.ts`, with a series specific fallback.
 */
export function slugifySeries(name: string): string {
  const base = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return base || `series-${Date.now()}`;
}

export async function uniqueSeriesSlug(tx: Executor, candidate: string): Promise<string> {
  for (let suffix = 0; suffix < 100; suffix += 1) {
    const value = suffix === 0 ? candidate : `${candidate}-${suffix + 1}`;
    const [clash] = await tx
      .select({ id: qualificationSeries.id })
      .from(qualificationSeries)
      .where(eq(qualificationSeries.slug, value))
      .limit(1);
    if (!clash) return value;
  }
  throw new DomainError("Could not create a unique public address for this series.");
}

const championshipCountExpression = sql<number>`(
  select count(*)::int
  from qualification_series_championships qsc
  where qsc.series_id = qualification_series.id
)`;

export interface SeriesSummary {
  readonly id: string;
  readonly name: string;
  readonly nameAr: string | null;
  readonly slug: string;
  readonly isPublished: boolean;
  readonly championshipCount: number;
  readonly createdAt: Date;
}

/** Every series, for the admin list. */
export async function listSeries(): Promise<readonly SeriesSummary[]> {
  const db = getDb();
  return db
    .select({
      id: qualificationSeries.id,
      name: qualificationSeries.name,
      nameAr: qualificationSeries.nameAr,
      slug: qualificationSeries.slug,
      isPublished: qualificationSeries.isPublished,
      championshipCount: championshipCountExpression,
      createdAt: qualificationSeries.createdAt,
    })
    .from(qualificationSeries)
    .orderBy(sql`${qualificationSeries.createdAt} desc`);
}

/** Published series only, for the public rankings index. */
export async function listPublishedSeries(): Promise<readonly SeriesSummary[]> {
  const db = getDb();
  return db
    .select({
      id: qualificationSeries.id,
      name: qualificationSeries.name,
      nameAr: qualificationSeries.nameAr,
      slug: qualificationSeries.slug,
      isPublished: qualificationSeries.isPublished,
      championshipCount: championshipCountExpression,
      createdAt: qualificationSeries.createdAt,
    })
    .from(qualificationSeries)
    .where(eq(qualificationSeries.isPublished, true))
    .orderBy(sql`${qualificationSeries.createdAt} desc`);
}

export interface SeriesForEdit {
  readonly id: string;
  readonly name: string;
  readonly nameAr: string | null;
  readonly isPublished: boolean;
  readonly championshipIds: readonly string[];
}

/** A series with the ids of its member championships, for the admin editor. */
export async function getSeriesForEdit(seriesId: string): Promise<SeriesForEdit | null> {
  const db = getDb();
  const [row] = await db
    .select({
      id: qualificationSeries.id,
      name: qualificationSeries.name,
      nameAr: qualificationSeries.nameAr,
      isPublished: qualificationSeries.isPublished,
    })
    .from(qualificationSeries)
    .where(eq(qualificationSeries.id, seriesId))
    .limit(1);
  if (!row) return null;

  const members = await db
    .select({ championshipId: qualificationSeriesChampionships.championshipId })
    .from(qualificationSeriesChampionships)
    .where(eq(qualificationSeriesChampionships.seriesId, seriesId));

  return { ...row, championshipIds: members.map((member) => member.championshipId) };
}

export async function getSeriesBySlug(slug: string): Promise<SeriesSummary | null> {
  const db = getDb();
  const [row] = await db
    .select({
      id: qualificationSeries.id,
      name: qualificationSeries.name,
      nameAr: qualificationSeries.nameAr,
      slug: qualificationSeries.slug,
      isPublished: qualificationSeries.isPublished,
      championshipCount: championshipCountExpression,
      createdAt: qualificationSeries.createdAt,
    })
    .from(qualificationSeries)
    .where(sql`${qualificationSeries.slug} = ${slug} and ${qualificationSeries.isPublished}`)
    .limit(1);
  return row ?? null;
}

/**
 * Only a published championship's results are final enough to feed a public
 * leaderboard, so membership is rejected unless every id given is both real
 * and published, no matter what the client sent.
 */
export async function assertChampionshipsPublished(
  tx: Executor,
  championshipIds: readonly string[],
): Promise<void> {
  if (championshipIds.length === 0) return;
  const rows = await tx
    .select({ id: championships.id })
    .from(championships)
    .where(and(inArray(championships.id, [...championshipIds]), eq(championships.isPublished, true)));
  if (rows.length !== new Set(championshipIds).size) {
    throw new DomainError(
      "Only published championships can be added to a series.",
      "VALIDATION",
      { championshipIds: "Only published championships can be added to a series." },
    );
  }
}

/** Replaces a series' championship membership inside the caller's transaction. */
export async function replaceSeriesChampionships(
  tx: Executor,
  seriesId: string,
  championshipIds: readonly string[],
): Promise<void> {
  await tx
    .delete(qualificationSeriesChampionships)
    .where(eq(qualificationSeriesChampionships.seriesId, seriesId));
  if (championshipIds.length === 0) return;
  await tx.insert(qualificationSeriesChampionships).values(
    championshipIds.map((championshipId) => ({ seriesId, championshipId })),
  );
}

export interface SeriesRankingRow {
  readonly key: string;
  readonly rank: number;
  readonly total: string;
  readonly name: string;
  readonly iso2: string;
  /** Only present on an individual row. */
  readonly countryName?: string;
}

export interface SeriesRankingChampionship {
  readonly id: string;
  readonly name: string;
  readonly nameAr: string | null;
  readonly slug: string;
  readonly startDate: string;
}

/** "ALL" sums every event; "LANCE"/"SWORD" sum only that discipline's events. */
export type SeriesRankingDiscipline = "ALL" | "LANCE" | "SWORD";

const DISCIPLINE_FILTERS: readonly SeriesRankingDiscipline[] = ["ALL", "LANCE", "SWORD"];

export interface SeriesRankings {
  readonly individual: Readonly<Record<SeriesRankingDiscipline, readonly SeriesRankingRow[]>>;
  readonly country: Readonly<Record<SeriesRankingDiscipline, readonly SeriesRankingRow[]>>;
  readonly championships: readonly SeriesRankingChampionship[];
}

interface RiderAccumulator {
  readonly riderId: string;
  readonly name: string;
  readonly iso2: string;
  readonly countryName: string;
  total: Decimal;
}

interface CountryAccumulator {
  readonly countryId: string;
  readonly name: string;
  readonly iso2: string;
  total: Decimal;
}

function matchesDiscipline(run: ConfirmedRun, discipline: SeriesRankingDiscipline): boolean {
  return discipline === "ALL" || getEventTypeDefinition(run.eventType).discipline === discipline;
}

/**
 * Combines every championship in a series into one leaderboard, computed
 * separately for every event / Lance / Sword — each is a straightforward
 * re-aggregation of the same confirmed runs filtered by discipline, not a
 * different formula, so a rider or country's Lance and Sword totals always
 * add up to their "ALL" total.
 *
 * Reuses the same machinery as a single championship's results page
 * (`loadConfirmedRuns`, `aggregateChampionship`, `calculateStandings`) rather
 * than recomputing scoring: each championship's confirmed total is summed
 * per rider and per country, keyed by their *permanent* identity (so the
 * same rider or country across different championships accumulates into one
 * row), then ranked with the same tie handling used everywhere else in the
 * app.
 */
export async function computeSeriesRankings(
  seriesId: string,
  locale: Locale,
): Promise<SeriesRankings | null> {
  const db = getDb();

  const [seriesRow] = await db
    .select({ id: qualificationSeries.id })
    .from(qualificationSeries)
    .where(eq(qualificationSeries.id, seriesId))
    .limit(1);
  if (!seriesRow) return null;

  const championshipRows = await db
    .select({
      id: championships.id,
      name: championships.name,
      nameAr: championships.nameAr,
      slug: championships.slug,
      startDate: championships.startDate,
    })
    .from(qualificationSeriesChampionships)
    .innerJoin(championships, eq(championships.id, qualificationSeriesChampionships.championshipId))
    .where(eq(qualificationSeriesChampionships.seriesId, seriesId))
    .orderBy(asc(championships.startDate));

  const riderAccByDiscipline = new Map<SeriesRankingDiscipline, Map<string, RiderAccumulator>>(
    DISCIPLINE_FILTERS.map((discipline) => [discipline, new Map()]),
  );
  const countryAccByDiscipline = new Map<SeriesRankingDiscipline, Map<string, CountryAccumulator>>(
    DISCIPLINE_FILTERS.map((discipline) => [discipline, new Map()]),
  );

  for (const championship of championshipRows) {
    const [runs, championshipRiders, championshipCountries] = await Promise.all([
      loadConfirmedRuns(championship.id),
      listChampionshipRiders(championship.id, locale),
      listChampionshipCountries(championship.id, locale),
    ]);

    const riderInfo = new Map(championshipRiders.map((rider) => [rider.championshipRiderId, rider]));
    const countryInfo = new Map(
      championshipCountries.map((country) => [country.championshipCountryId, country]),
    );

    for (const discipline of DISCIPLINE_FILTERS) {
      const totals = aggregateChampionship(runs.filter((run) => matchesDiscipline(run, discipline)));
      const riderAcc = riderAccByDiscipline.get(discipline)!;
      const countryAcc = countryAccByDiscipline.get(discipline)!;

      for (const [championshipRiderId, riderTotals] of totals.riders) {
        const info = riderInfo.get(championshipRiderId);
        if (!info) continue;
        const existing = riderAcc.get(info.riderId);
        riderAcc.set(info.riderId, {
          riderId: info.riderId,
          name: info.fullName,
          iso2: info.iso2,
          countryName: info.countryName,
          total: (existing?.total ?? ZERO).plus(riderTotals.overall),
        });
      }

      for (const [championshipCountryId, countryTotals] of totals.countries) {
        const info = countryInfo.get(championshipCountryId);
        if (!info) continue;
        const existing = countryAcc.get(info.countryId);
        countryAcc.set(info.countryId, {
          countryId: info.countryId,
          name: info.name,
          iso2: info.iso2,
          total: (existing?.total ?? ZERO).plus(countryTotals.overall),
        });
      }
    }
  }

  const individual: Record<SeriesRankingDiscipline, readonly SeriesRankingRow[]> = {
    ALL: [],
    LANCE: [],
    SWORD: [],
  };
  const country: Record<SeriesRankingDiscipline, readonly SeriesRankingRow[]> = {
    ALL: [],
    LANCE: [],
    SWORD: [],
  };

  for (const discipline of DISCIPLINE_FILTERS) {
    const riderAcc = riderAccByDiscipline.get(discipline)!;
    const countryAcc = countryAccByDiscipline.get(discipline)!;

    const individualStandings = calculateStandings(
      [...riderAcc.values()].map((rider) => ({ key: rider.riderId, total: rider.total })),
    );
    const countryStandings = calculateStandings(
      [...countryAcc.values()].map((country) => ({ key: country.countryId, total: country.total })),
    );

    individual[discipline] = individualStandings.map((standing) => {
      const info = riderAcc.get(standing.key)!;
      return {
        key: standing.key,
        rank: standing.rank,
        total: formatPoints(standing.total),
        name: shortenPersonName(info.name),
        iso2: info.iso2,
        countryName: info.countryName,
      };
    });
    country[discipline] = countryStandings.map((standing) => {
      const info = countryAcc.get(standing.key)!;
      return {
        key: standing.key,
        rank: standing.rank,
        total: formatPoints(standing.total),
        name: info.name,
        iso2: info.iso2,
      };
    });
  }

  return { individual, country, championships: championshipRows };
}
