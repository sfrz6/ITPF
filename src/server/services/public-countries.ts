import { and, asc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { championshipCountries, championships, countries } from "@/db/schema";
import { aggregateChampionship, buildStandings } from "@/domain/results";
import { calculateStandings } from "@/domain/scoring/standings";
import { formatPoints, ZERO, type Decimal } from "@/domain/scoring/decimal";
import { shortenPersonName } from "@/components/common/formatting";
import type { Locale } from "@/lib/i18n/config";
import { listChampionshipCountries, listChampionshipRiders } from "./championships";
import { loadChampionshipResults, loadConfirmedRuns } from "./results";
import { DISCIPLINE_FILTERS, matchesDiscipline, type SeriesRankingDiscipline } from "./series";

function nameColumn(locale: Locale) {
  return locale === "ar" ? countries.nameAr : countries.nameEn;
}

export interface PublicCountrySummary {
  readonly id: string;
  readonly iso2: string;
  readonly iso3: string;
  readonly name: string;
  readonly championshipCount: number;
}

/**
 * Countries with at least one published championship, for the public
 * directory. Unlike the admin registry (`listCountriesWithRiderCounts`),
 * this counts published championships, not registered riders, and drops a
 * country that has none.
 */
export async function listCountriesWithPublishedChampionships(
  locale: Locale,
): Promise<readonly PublicCountrySummary[]> {
  const db = getDb();
  const name = nameColumn(locale);

  const rows = await db
    .select({
      id: countries.id,
      iso2: countries.iso2,
      iso3: countries.iso3,
      name,
      // Written with literal aliases: see the comment on the equivalent
      // subquery in `championships.ts`.
      championshipCount: sql<number>`(
        select count(distinct cc.championship_id)::int
        from championship_countries cc
        inner join championships c on c.id = cc.championship_id
        where cc.country_id = countries.id and c.is_published
      )`,
    })
    .from(countries)
    .orderBy(asc(name));

  return rows.filter((row) => row.championshipCount > 0);
}

export interface PublicCountryRiderSummary {
  readonly id: string;
  readonly iso2: string;
  readonly iso3: string;
  readonly name: string;
  readonly riderCount: number;
}

/**
 * Countries with at least one rider who has actually taken part in a
 * published championship, for the public Riders directory. Counts distinct
 * permanent riders (`riders.id`), not championship-scoped registrations, so
 * the same rider fielded across several championships is still one rider —
 * the same identity `computeSeriesRankings` accumulates a rider's points
 * under.
 */
export async function listCountriesWithPublishedRiders(
  locale: Locale,
): Promise<readonly PublicCountryRiderSummary[]> {
  const db = getDb();
  const name = nameColumn(locale);

  const rows = await db
    .select({
      id: countries.id,
      iso2: countries.iso2,
      iso3: countries.iso3,
      name,
      riderCount: sql<number>`(
        select count(distinct r.id)::int
        from riders r
        inner join championship_riders cr on cr.rider_id = r.id
        inner join championship_countries cc on cc.id = cr.championship_country_id
        inner join championships c on c.id = cc.championship_id
        where r.country_id = countries.id and c.is_published
      )`,
    })
    .from(countries)
    .orderBy(asc(name));

  return rows.filter((row) => row.riderCount > 0);
}

export interface CountryRiderRankingRow {
  readonly riderId: string;
  readonly rank: number;
  readonly name: string;
  readonly total: string;
  /** True when this total still includes a run a referee has saved but not yet confirmed. */
  readonly pending: boolean;
}

/**
 * One country's own riders, ranked by their combined points across every
 * published championship this country has taken part in — the same
 * discipline grouping (`matchesDiscipline`) and accumulation approach as
 * `computeSeriesRankings`, just scoped to one country's own roster instead
 * of a hand-picked series, and ranked only against each other rather than
 * every rider in the system. Computed for every discipline bucket in one
 * pass (each championship's confirmed runs are only loaded once) rather
 * than making the caller ask again per bucket.
 */
export async function getCountryRiderResults(
  countryId: string,
  locale: Locale,
): Promise<Readonly<Record<SeriesRankingDiscipline, readonly CountryRiderRankingRow[]>>> {
  const db = getDb();
  const championshipRows = await db
    .select({ id: championships.id })
    .from(championshipCountries)
    .innerJoin(championships, eq(championships.id, championshipCountries.championshipId))
    .where(and(eq(championshipCountries.countryId, countryId), eq(championships.isPublished, true)));

  const riderTotalsByDiscipline = new Map<
    SeriesRankingDiscipline,
    Map<string, { name: string; total: Decimal; pending: boolean }>
  >(DISCIPLINE_FILTERS.map((discipline) => [discipline, new Map()]));

  for (const championship of championshipRows) {
    const [runs, championshipRiders] = await Promise.all([
      loadConfirmedRuns(championship.id, undefined, { includePending: true }),
      listChampionshipRiders(championship.id, locale),
    ]);

    const riderInfo = new Map(
      championshipRiders
        .filter((rider) => rider.countryId === countryId)
        .map((rider) => [rider.championshipRiderId, rider]),
    );
    if (riderInfo.size === 0) continue;

    for (const discipline of DISCIPLINE_FILTERS) {
      const filteredRuns = runs.filter((run) => matchesDiscipline(run, discipline));
      const totals = aggregateChampionship(filteredRuns);
      const riderTotals = riderTotalsByDiscipline.get(discipline)!;

      for (const [championshipRiderId, totalsForRider] of totals.riders) {
        const info = riderInfo.get(championshipRiderId);
        if (!info) continue;
        const existing = riderTotals.get(info.riderId);
        riderTotals.set(info.riderId, {
          name: info.fullName,
          total: (existing?.total ?? ZERO).plus(totalsForRider.overall),
          pending: (existing?.pending ?? false) || totals.pendingRiderIds.has(championshipRiderId),
        });
      }
    }
  }

  const result = {} as Record<SeriesRankingDiscipline, readonly CountryRiderRankingRow[]>;
  for (const discipline of DISCIPLINE_FILTERS) {
    const riderTotals = riderTotalsByDiscipline.get(discipline)!;
    const standings = calculateStandings(
      [...riderTotals.entries()].map(([riderId, info]) => ({ key: riderId, total: info.total })),
    );
    result[discipline] = standings.map((standing) => {
      const info = riderTotals.get(standing.key)!;
      return {
        riderId: standing.key,
        rank: standing.rank,
        name: shortenPersonName(info.name),
        total: formatPoints(standing.total),
        pending: info.pending,
      };
    });
  }
  return result;
}

export async function getPublicCountryByIso2(
  iso2: string,
  locale: Locale,
): Promise<{ id: string; iso2: string; iso3: string; name: string } | null> {
  const db = getDb();
  const [row] = await db
    .select({
      id: countries.id,
      iso2: countries.iso2,
      iso3: countries.iso3,
      name: nameColumn(locale),
    })
    .from(countries)
    .where(sql`lower(${countries.iso2}) = lower(${iso2})`)
    .limit(1);
  return row ?? null;
}

export interface CountryChampionshipHistoryEntry {
  readonly championshipId: string;
  readonly name: string;
  readonly nameAr: string | null;
  readonly slug: string;
  readonly startDate: string;
  readonly location: string;
  readonly locationAr: string | null;
  /** Null only if the country has no recorded country-total yet (no confirmed runs). */
  readonly rank: number | null;
  /** True when `rank` still includes a run a referee has saved but not yet confirmed. */
  readonly pending: boolean;
}

/**
 * Every published championship a country took part in, most recent first,
 * each with that country's final OVERALL country rank, reusing the same
 * standings engine as the championship's own results page.
 */
export async function getCountryChampionshipHistory(
  countryId: string,
  locale: Locale,
): Promise<readonly CountryChampionshipHistoryEntry[]> {
  const db = getDb();
  const championshipRows = await db
    .select({
      championshipId: championships.id,
      name: championships.name,
      nameAr: championships.nameAr,
      slug: championships.slug,
      startDate: championships.startDate,
      location: championships.location,
      locationAr: championships.locationAr,
    })
    .from(championshipCountries)
    .innerJoin(championships, eq(championships.id, championshipCountries.championshipId))
    .where(
      and(eq(championshipCountries.countryId, countryId), eq(championships.isPublished, true)),
    )
    .orderBy(sql`${championships.startDate} desc`);

  const entries: CountryChampionshipHistoryEntry[] = [];
  for (const row of championshipRows) {
    const [results, championshipCountryRecords] = await Promise.all([
      loadChampionshipResults(row.championshipId, locale, { includePending: true }),
      listChampionshipCountries(row.championshipId, locale),
    ]);

    const thisCountry = championshipCountryRecords.find((entry) => entry.countryId === countryId);
    let rank: number | null = null;
    let pending = false;
    if (thisCountry) {
      const standings = buildStandings(results.totals, { scope: "OVERALL", subject: "COUNTRY" });
      rank = standings.find((standing) => standing.key === thisCountry.championshipCountryId)?.rank ?? null;
      pending = results.totals.pendingCountryIds.has(thisCountry.championshipCountryId);
    }

    entries.push({ ...row, rank, pending });
  }

  return entries;
}
