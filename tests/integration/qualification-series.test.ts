import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { hasTestDatabase, resetDatabase } from "../helpers/database";
import { createActor, createChampionshipFixture, createTemplate, listRunIds } from "../helpers/fixtures";
import type { Principal } from "@/lib/auth/session";

const suite = hasTestDatabase ? describe : describe.skip;

suite("qualification series rankings", () => {
  let actor: Principal;
  let db: Awaited<ReturnType<typeof getDatabase>>;

  async function getDatabase() {
    const { getDb } = await import("@/db");
    return getDb();
  }

  beforeAll(async () => {
    db = await getDatabase();
  });

  beforeEach(async () => {
    await resetDatabase();
    actor = await createActor();
  });

  /**
   * Builds a one event, one run championship with Jordan and Oman, confirms
   * the run with every rider scoring the given points, and publishes it.
   */
  async function publishedChampionship(name: string, jordanPoints: number, omanPoints: number) {
    const templateId = await createTemplate(name, [
      { dayNumber: 1, eventType: "INDIVIDUAL_LANCE", runs: 1 },
    ]);
    const fixture = await createChampionshipFixture({
      actor,
      templateId,
      name,
      isoCodes: ["JO", "OM"],
    });
    const runId = (await listRunIds(fixture.championshipId))[0]!;

    const {
      getRunEntryOrderState,
      confirmCountryEntryOrder,
      startRun,
      getRunScoringState,
      saveRunScores,
      confirmRun,
    } = await import("@/server/services/runs");
    const { getRunContext } = await import("@/server/services/championships");
    const { listChampionshipCountries } = await import("@/server/services/championships");

    const entryState = await getRunEntryOrderState(runId, "en");
    for (const country of entryState!.countries) {
      await db.transaction((tx) =>
        confirmCountryEntryOrder(tx, actor, {
          runId,
          championshipCountryId: country.championshipCountryId,
          decision: "NO_CHANGE",
        }),
      );
    }

    let context = (await getRunContext(runId))!;
    await db.transaction((tx) => startRun(tx, actor, runId, context.version));

    const pointsByCountry = new Map(
      (await listChampionshipCountries(fixture.championshipId, "en")).map((country) => [
        country.iso2,
        country.iso2 === "JO" ? jordanPoints : omanPoints,
      ]),
    );

    const state = await getRunScoringState(runId, "en");
    const units: { runScoringUnitId: string; timeSeconds: string }[] = [];
    const scores: { runScoreId: string; targets: number[] }[] = [];
    for (const country of state!.countries) {
      const points = pointsByCountry.get(country.iso2) ?? 0;
      for (const unit of country.units) {
        units.push({ runScoringUnitId: unit.runScoringUnitId, timeSeconds: "6.00" });
        for (const rider of unit.riders) {
          scores.push({ runScoreId: rider.runScoreId, targets: rider.targets.map(() => points) });
        }
      }
    }

    context = (await getRunContext(runId))!;
    await db.transaction((tx) =>
      saveRunScores(tx, actor, { runId, expectedVersion: context.version, payload: { units, scores } }),
    );

    context = (await getRunContext(runId))!;
    await db.transaction((tx) =>
      confirmRun(tx, actor, { runId, expectedVersion: context.version }),
    );

    const { championships } = await import("@/db/schema");
    await db.update(championships).set({ isPublished: true }).where(eq(championships.id, fixture.championshipId));

    return fixture.championshipId;
  }

  it("combines two championships' overall totals per permanent rider and country, ranked highest first", async () => {
    // Jordan scores higher in both legs, Oman lower, so the series totals
    // must keep Jordan ahead even though each championship only ever sees
    // the championship-scoped country/rider identities.
    const championshipA = await publishedChampionship("Group A", 6, 2);
    const championshipB = await publishedChampionship("Group B", 4, 2);

    const { qualificationSeries } = await import("@/db/schema");
    const { replaceSeriesChampionships, computeSeriesRankings } = await import(
      "@/server/services/series"
    );
    const [series] = await db
      .insert(qualificationSeries)
      .values({ name: "Test series", slug: "test-series", createdByUserId: actor.userId })
      .returning({ id: qualificationSeries.id });

    await db.transaction((tx) =>
      replaceSeriesChampionships(tx, series!.id, [championshipA, championshipB]),
    );

    const rankings = await computeSeriesRankings(series!.id, "en");
    expect(rankings).not.toBeNull();

    expect(rankings!.championships.map((c) => c.id).sort()).toEqual(
      [championshipA, championshipB].sort(),
    );

    // Independently recompute what the combined country totals should be,
    // from each championship's own (already trusted) results, rather than
    // hand predicting the scoring engine's penalty math: this isolates the
    // thing under test — that `computeSeriesRankings` correctly matches the
    // championship-scoped ids back to the permanent country/rider identity
    // and sums without dropping or double counting anything.
    const { loadChampionshipResults } = await import("@/server/services/results");
    const { listChampionshipCountries } = await import("@/server/services/championships");

    let expectedJordanTotal = 0;
    let expectedOmanTotal = 0;
    for (const championshipId of [championshipA, championshipB]) {
      const [results, countryRecords] = await Promise.all([
        loadChampionshipResults(championshipId, "en"),
        listChampionshipCountries(championshipId, "en"),
      ]);
      for (const record of countryRecords) {
        const total = results.totals.countries.get(record.championshipCountryId)?.overall.toNumber() ?? 0;
        if (record.iso2 === "JO") expectedJordanTotal += total;
        else if (record.iso2 === "OM") expectedOmanTotal += total;
      }
    }
    // Sanity check on the fixture itself: Jordan must actually have scored
    // more than Oman in both legs for the ranking assertions below to mean
    // anything.
    expect(expectedJordanTotal).toBeGreaterThan(expectedOmanTotal);

    expect(rankings!.country).toHaveLength(2);
    const jordanCountryRow = rankings!.country.find((row) => row.iso2 === "JO")!;
    const omanCountryRow = rankings!.country.find((row) => row.iso2 === "OM")!;
    expect(Number(jordanCountryRow.total)).toBeCloseTo(expectedJordanTotal, 2);
    expect(Number(omanCountryRow.total)).toBeCloseTo(expectedOmanTotal, 2);
    expect(jordanCountryRow.rank).toBe(1);
    expect(omanCountryRow.rank).toBe(2);

    // Individual totals: this fixture fields a fresh roster for each
    // championship (realistic — a qualifier's entry list is its own), so no
    // single rider accumulates points across both legs. What must still hold
    // is that every Jordanian rider (who always scored more per rider than
    // any Omani rider, in both legs) outranks every Omani rider.
    expect(rankings!.individual.length).toBeGreaterThan(0);
    const jordanRiderRows = rankings!.individual.filter((row) => row.countryName === "Jordan");
    const omanRiderRows = rankings!.individual.filter((row) => row.countryName === "Oman");
    expect(jordanRiderRows.length).toBeGreaterThan(0);
    expect(omanRiderRows.length).toBeGreaterThan(0);
    const lowestJordanTotal = Math.min(...jordanRiderRows.map((row) => Number(row.total)));
    const highestOmanTotal = Math.max(...omanRiderRows.map((row) => Number(row.total)));
    expect(lowestJordanTotal).toBeGreaterThan(highestOmanTotal);
    const highestOmanRank = Math.max(...omanRiderRows.map((row) => row.rank));
    const lowestJordanRank = Math.min(...jordanRiderRows.map((row) => row.rank));
    expect(highestOmanRank).toBeGreaterThan(lowestJordanRank);
    expect(Math.max(...jordanRiderRows.map((row) => row.rank))).toBeLessThan(
      Math.min(...omanRiderRows.map((row) => row.rank)),
    );
  });

  it("refuses to add an unpublished championship to a series", async () => {
    const templateId = await createTemplate("Unpublished", [
      { dayNumber: 1, eventType: "INDIVIDUAL_LANCE", runs: 1 },
    ]);
    const fixture = await createChampionshipFixture({ actor, templateId });

    const { assertChampionshipsPublished } = await import("@/server/services/series");

    await expect(
      db.transaction((tx) => assertChampionshipsPublished(tx, [fixture.championshipId])),
    ).rejects.toThrow(/published/i);
  });
});
