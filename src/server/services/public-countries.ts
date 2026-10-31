import { and, asc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { championshipCountries, championships, countries } from "@/db/schema";
import { buildStandings } from "@/domain/results";
import type { Locale } from "@/lib/i18n/config";
import { listChampionshipCountries } from "./championships";
import { loadChampionshipResults } from "./results";

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
  /** Null only if the country has no recorded country-total yet (no confirmed runs). */
  readonly rank: number | null;
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
      loadChampionshipResults(row.championshipId, locale),
      listChampionshipCountries(row.championshipId, locale),
    ]);

    const thisCountry = championshipCountryRecords.find((entry) => entry.countryId === countryId);
    let rank: number | null = null;
    if (thisCountry) {
      const standings = buildStandings(results.totals, { scope: "OVERALL", subject: "COUNTRY" });
      rank = standings.find((standing) => standing.key === thisCountry.championshipCountryId)?.rank ?? null;
    }

    entries.push({ ...row, rank });
  }

  return entries;
}
