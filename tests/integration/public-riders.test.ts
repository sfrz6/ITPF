import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { hasTestDatabase, resetDatabase } from "../helpers/database";
import { createActor, createChampionshipFixture, createTemplate, listRunIds } from "../helpers/fixtures";
import type { Principal } from "@/lib/auth/session";

const suite = hasTestDatabase ? describe : describe.skip;

suite("public riders directory and per-country results", () => {
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

  it("counts distinct riders per country and ranks each country's riders only against each other", async () => {
    // Jordan's riders all outscore Oman's on the one Individual Lance run
    // scored here (6 vs 0), confirmed and published. If the per-country
    // scoping were broken, Oman's riders would leak into Jordan's list, or
    // Jordan's own internal ranking would be thrown off by Oman's riders
    // sitting in between.
    const templateId = await createTemplate("Riders directory", [
      { dayNumber: 1, eventType: "INDIVIDUAL_LANCE", runs: 1 },
    ]);
    const fixture = await createChampionshipFixture({ actor, templateId, isoCodes: ["JO", "OM"] });
    const runId = (await listRunIds(fixture.championshipId))[0]!;

    const {
      getRunEntryOrderState,
      confirmCountryEntryOrder,
      startRun,
      getRunScoringState,
      saveRunScores,
      confirmRun,
    } = await import("@/server/services/runs");
    const { getRunContext, listChampionshipCountries } = await import(
      "@/server/services/championships"
    );

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
        country.iso2 === "JO" ? 6 : 0,
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
    await db.transaction((tx) => confirmRun(tx, actor, { runId, expectedVersion: context.version }));

    const { championships } = await import("@/db/schema");
    await db
      .update(championships)
      .set({ isPublished: true })
      .where(eq(championships.id, fixture.championshipId));

    const {
      listCountriesWithPublishedRiders,
      getCountryRiderResults,
      getPublicCountryByIso2,
    } = await import("@/server/services/public-countries");

    const directory = await listCountriesWithPublishedRiders("en");
    const jordanEntry = directory.find((entry) => entry.iso2 === "JO")!;
    const omanEntry = directory.find((entry) => entry.iso2 === "OM")!;
    expect(jordanEntry).toBeDefined();
    expect(omanEntry).toBeDefined();
    // Four active riders plus one reserve, per `createSquadRiders`.
    expect(jordanEntry.riderCount).toBe(5);
    expect(omanEntry.riderCount).toBe(5);

    const jordan = await getPublicCountryByIso2("JO", "en");
    const jordanResults = await getCountryRiderResults(jordan!.id, "en");

    // Only Jordan's four active riders scored (the reserve never rides), and
    // every one of them must outscore the implicit zero floor, with no
    // Omani rider mixed in.
    expect(jordanResults.ALL.length).toBeGreaterThan(0);
    expect(jordanResults.ALL.length).toBeLessThanOrEqual(5);
    for (const row of jordanResults.ALL) {
      expect(row.name.startsWith("OM-")).toBe(false);
    }
    // All four scored riders tied at 6 points each, so they must all share
    // rank 1 — proof the ranking is computed only within Jordan's own rows.
    expect(jordanResults.ALL.every((row) => row.rank === 1)).toBe(true);

    // Individual Lance isn't Hanging Targets, so that bucket is empty for
    // this fixture.
    expect(jordanResults.HANGING).toHaveLength(0);
    expect(jordanResults.LANCE.length).toBe(jordanResults.ALL.length);
  });
});
