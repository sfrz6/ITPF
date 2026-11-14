import { and, asc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { championshipCountries, championships, countries } from "@/db/schema";
import { aggregateChampionship, buildStandings } from "@/domain/results";
import { calculateStandings } from "@/domain/scoring/standings";
import { formatPoints, ZERO, type Decimal } from "@/domain/scoring/decimal";
import { shortenPersonName } from "@/components/common/formatting";
import { addDays, CHAMPIONSHIP_DAYS } from "./championship-setup";
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

export interface CountryProfileAthlete {
  readonly riderId: string;
  readonly rank: number;
  readonly name: string;
  readonly total: string;
  /** Distinct published championships this rider has represented the country in. */
  readonly championshipCount: number;
  readonly hasLance: boolean;
  readonly hasSword: boolean;
  readonly hasHanging: boolean;
  readonly pending: boolean;
}

export interface CountryProfileChampionshipAthleteRow {
  readonly riderId: string;
  readonly rank: number;
  readonly name: string;
  readonly lance: string;
  readonly sword: string;
  readonly hanging: string;
  readonly total: string;
  readonly pending: boolean;
}

export interface CountryProfileChampionship {
  readonly championshipId: string;
  readonly name: string;
  readonly nameAr: string | null;
  readonly slug: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly location: string;
  readonly locationAr: string | null;
  /** Null only if the country has no recorded total yet (no confirmed or saved runs). */
  readonly rank: number | null;
  readonly teamTotal: string | null;
  readonly countryCount: number;
  readonly pending: boolean;
  /** This country's own riders in this championship, ranked against each other. */
  readonly athletes: readonly CountryProfileChampionshipAthleteRow[];
}

export interface CountryProfile {
  readonly championshipCount: number;
  readonly athleteCount: number;
  readonly bestRank: number | null;
  readonly podiumCount: number;
  readonly bestTeamScore: string | null;
  readonly latestChampionshipDate: string | null;
  readonly championships: readonly CountryProfileChampionship[];
  readonly athletes: readonly CountryProfileAthlete[];
}

/**
 * Everything the merged public country profile page needs — championship
 * history, this country's own athlete rankings, and a per-championship
 * Lance/Sword/Hanging Targets breakdown — computed in one pass per
 * championship so each one's confirmed (and saved-but-unconfirmed) runs are
 * only loaded once, the same way `getCountryRiderResults` and
 * `getCountryChampionshipHistory` each do it separately today.
 */
export async function getCountryProfile(countryId: string, locale: Locale): Promise<CountryProfile> {
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
    .where(and(eq(championshipCountries.countryId, countryId), eq(championships.isPublished, true)))
    .orderBy(sql`${championships.startDate} desc`);

  const championshipsOut: CountryProfileChampionship[] = [];

  // Combined across every championship: a rider's total, which disciplines
  // they've actually scored in, and how many of this country's
  // championships they've appeared in.
  const riderAcc = new Map<
    string,
    { name: string; total: Decimal; championshipIds: Set<string>; hasLance: boolean; hasSword: boolean; hasHanging: boolean; pending: boolean }
  >();

  for (const row of championshipRows) {
    const [runs, championshipRiders, championshipCountriesRows] = await Promise.all([
      loadConfirmedRuns(row.championshipId, undefined, { includePending: true }),
      listChampionshipRiders(row.championshipId, locale),
      listChampionshipCountries(row.championshipId, locale),
    ]);

    const riderInfo = new Map(
      championshipRiders
        .filter((rider) => rider.countryId === countryId)
        .map((rider) => [rider.championshipRiderId, rider]),
    );
    const thisCountry = championshipCountriesRows.find((entry) => entry.countryId === countryId);

    // This country's OVERALL rank and raw team total for this championship,
    // from every country's combined totals — same engine the championship's
    // own results page uses.
    const allTotals = aggregateChampionship(runs);
    let rank: number | null = null;
    let teamTotal: string | null = null;
    let pending = false;
    if (thisCountry) {
      const standings = buildStandings(allTotals, { scope: "OVERALL", subject: "COUNTRY" });
      const standing = standings.find((s) => s.key === thisCountry.championshipCountryId);
      rank = standing?.rank ?? null;
      const countryTotals = allTotals.countries.get(thisCountry.championshipCountryId);
      teamTotal = countryTotals ? formatPoints(countryTotals.overall) : null;
      pending = allTotals.pendingCountryIds.has(thisCountry.championshipCountryId);
    }

    // This championship's own athlete breakdown, rank by this championship's
    // combined total alone (not the cross-championship combined total),
    // with each discipline's own contribution as its own column.
    const disciplineTotals = new Map<SeriesRankingDiscipline, ReturnType<typeof aggregateChampionship>>();
    for (const discipline of DISCIPLINE_FILTERS) {
      disciplineTotals.set(discipline, aggregateChampionship(runs.filter((run) => matchesDiscipline(run, discipline))));
    }
    const allForCountry = disciplineTotals.get("ALL")!;
    const standingsForCountry = calculateStandings(
      [...riderInfo.keys()].map((championshipRiderId) => ({
        key: championshipRiderId,
        total: allForCountry.riders.get(championshipRiderId)?.overall ?? ZERO,
      })),
    );
    const athleteRows: CountryProfileChampionshipAthleteRow[] = standingsForCountry.map((standing) => {
      const info = riderInfo.get(standing.key)!;
      const lance = disciplineTotals.get("LANCE")!.riders.get(standing.key)?.overall ?? ZERO;
      const sword = disciplineTotals.get("SWORD")!.riders.get(standing.key)?.overall ?? ZERO;
      const hanging = disciplineTotals.get("HANGING")!.riders.get(standing.key)?.overall ?? ZERO;
      return {
        riderId: info.riderId,
        rank: standing.rank,
        name: shortenPersonName(info.fullName),
        lance: formatPoints(lance),
        sword: formatPoints(sword),
        hanging: formatPoints(hanging),
        total: formatPoints(standing.total),
        pending: allTotals.pendingRiderIds.has(standing.key),
      };
    });

    championshipsOut.push({
      championshipId: row.championshipId,
      name: row.name,
      nameAr: row.nameAr,
      slug: row.slug,
      startDate: row.startDate,
      endDate: addDays(row.startDate, CHAMPIONSHIP_DAYS - 1),
      location: row.location,
      locationAr: row.locationAr,
      rank,
      teamTotal,
      countryCount: championshipCountriesRows.length,
      pending,
      athletes: athleteRows,
    });

    // Fold this championship's riders into the cross-championship accumulator.
    for (const [championshipRiderId, info] of riderInfo) {
      const riderTotal = allForCountry.riders.get(championshipRiderId);
      if (!riderTotal) continue;
      const existing = riderAcc.get(info.riderId);
      const lance = disciplineTotals.get("LANCE")!.riders.get(championshipRiderId)?.overall ?? ZERO;
      const sword = disciplineTotals.get("SWORD")!.riders.get(championshipRiderId)?.overall ?? ZERO;
      const hanging = disciplineTotals.get("HANGING")!.riders.get(championshipRiderId)?.overall ?? ZERO;
      const championshipIds = existing?.championshipIds ?? new Set<string>();
      championshipIds.add(row.championshipId);
      riderAcc.set(info.riderId, {
        name: info.fullName,
        total: (existing?.total ?? ZERO).plus(riderTotal.overall),
        championshipIds,
        hasLance: (existing?.hasLance ?? false) || lance.greaterThan(0),
        hasSword: (existing?.hasSword ?? false) || sword.greaterThan(0),
        hasHanging: (existing?.hasHanging ?? false) || hanging.greaterThan(0),
        pending: (existing?.pending ?? false) || allTotals.pendingRiderIds.has(championshipRiderId),
      });
    }
  }

  const athleteStandings = calculateStandings(
    [...riderAcc.entries()].map(([riderId, info]) => ({ key: riderId, total: info.total })),
  );
  const athletes: CountryProfileAthlete[] = athleteStandings.map((standing) => {
    const info = riderAcc.get(standing.key)!;
    return {
      riderId: standing.key,
      rank: standing.rank,
      name: shortenPersonName(info.name),
      total: formatPoints(standing.total),
      championshipCount: info.championshipIds.size,
      hasLance: info.hasLance,
      hasSword: info.hasSword,
      hasHanging: info.hasHanging,
      pending: info.pending,
    };
  });

  const ranked = championshipsOut.filter((c): c is CountryProfileChampionship & { rank: number } => c.rank !== null);
  const bestRank = ranked.length > 0 ? Math.min(...ranked.map((c) => c.rank)) : null;
  const podiumCount = ranked.filter((c) => c.rank <= 3).length;
  const teamScores = championshipsOut
    .map((c) => (c.teamTotal ? Number(c.teamTotal) : null))
    .filter((value): value is number => value !== null);
  const bestTeamScore = teamScores.length > 0 ? formatPoints(Math.max(...teamScores)) : null;
  const latestChampionshipDate =
    championshipsOut.length > 0
      ? championshipsOut.reduce((latest, c) => (c.startDate > latest ? c.startDate : latest), championshipsOut[0]!.startDate)
      : null;

  return {
    championshipCount: championshipsOut.length,
    athleteCount: athletes.length,
    bestRank,
    podiumCount,
    bestTeamScore,
    latestChampionshipDate,
    championships: championshipsOut,
    athletes,
  };
}
