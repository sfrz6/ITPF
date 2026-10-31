"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { qualificationSeries } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/authorize";
import { recordAudit } from "@/server/services/audit";
import {
  assertChampionshipsPublished,
  MAX_SERIES_NAME_LENGTH,
  replaceSeriesChampionships,
  slugifySeries,
  uniqueSeriesSlug,
} from "@/server/services/series";
import { DomainError, ok, run, type ActionResult } from "./result";

const nameSchema = z
  .string()
  .trim()
  .min(3, "A series name must be at least 3 characters.")
  .max(MAX_SERIES_NAME_LENGTH, "A series name must be at most 120 characters.");

const nameArSchema = z.string().trim().max(MAX_SERIES_NAME_LENGTH).optional();

const championshipIdsSchema = z
  .array(z.uuid())
  .min(1, "Select at least one championship.");

const createSchema = z.object({
  name: nameSchema,
  nameAr: nameArSchema,
  championshipIds: championshipIdsSchema,
});

const updateSchema = createSchema.extend({ seriesId: z.uuid() });

function revalidateSeries(): void {
  revalidatePath("/series");
  revalidatePath("/rankings");
}

function validationError(error: z.ZodError): DomainError {
  const issue = error.issues[0];
  const message = issue?.message ?? "The series is not valid.";
  const field = issue?.path[0];
  return new DomainError(
    message,
    "VALIDATION",
    typeof field === "string" ? { [field]: message } : undefined,
  );
}

export interface SeriesInput {
  readonly name: string;
  readonly nameAr?: string;
  readonly championshipIds: readonly string[];
}

export async function createSeriesAction(
  input: SeriesInput,
): Promise<ActionResult<{ id: string }>> {
  return run(async () => {
    const actor = await requireAdmin();
    const parsed = createSchema.safeParse(input);
    if (!parsed.success) throw validationError(parsed.error);
    const { name, nameAr, championshipIds } = parsed.data;

    const created = await getDb().transaction(async (tx) => {
      await assertChampionshipsPublished(tx, championshipIds);
      const slug = await uniqueSeriesSlug(tx, slugifySeries(name));

      const [series] = await tx
        .insert(qualificationSeries)
        .values({
          name,
          nameAr: nameAr || null,
          slug,
          createdByUserId: actor.userId,
        })
        .returning({ id: qualificationSeries.id });
      if (!series) throw new DomainError("The series could not be created.", "UNEXPECTED");

      await replaceSeriesChampionships(tx, series.id, championshipIds);

      await recordAudit(tx, actor, {
        action: "SERIES_CREATED",
        entityType: "qualification_series",
        entityId: series.id,
        after: { name, nameAr: nameAr || null, championshipIds },
      });

      return series.id;
    });

    revalidateSeries();
    return ok({ id: created });
  });
}

export async function updateSeriesAction(
  input: SeriesInput & { seriesId: string },
): Promise<ActionResult<undefined>> {
  return run(async () => {
    const actor = await requireAdmin();
    const parsed = updateSchema.safeParse(input);
    if (!parsed.success) throw validationError(parsed.error);
    const { seriesId, name, nameAr, championshipIds } = parsed.data;

    await getDb().transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: qualificationSeries.id })
        .from(qualificationSeries)
        .where(eq(qualificationSeries.id, seriesId))
        .limit(1);
      if (!existing) throw new DomainError("This series no longer exists.", "NOT_FOUND");
      await assertChampionshipsPublished(tx, championshipIds);

      await tx
        .update(qualificationSeries)
        .set({ name, nameAr: nameAr || null, updatedAt: new Date() })
        .where(eq(qualificationSeries.id, seriesId));

      await replaceSeriesChampionships(tx, seriesId, championshipIds);

      await recordAudit(tx, actor, {
        action: "SERIES_UPDATED",
        entityType: "qualification_series",
        entityId: seriesId,
        after: { name, nameAr: nameAr || null, championshipIds },
      });
    });

    revalidateSeries();
    return ok();
  });
}

export async function setSeriesPublishedAction(input: {
  seriesId: string;
  published: boolean;
}): Promise<ActionResult<undefined>> {
  return run(async () => {
    const actor = await requireAdmin();
    const { seriesId, published } = z
      .object({ seriesId: z.uuid(), published: z.boolean() })
      .parse(input);

    await getDb().transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: qualificationSeries.id })
        .from(qualificationSeries)
        .where(eq(qualificationSeries.id, seriesId))
        .limit(1);
      if (!existing) throw new DomainError("This series no longer exists.", "NOT_FOUND");

      await tx
        .update(qualificationSeries)
        .set({ isPublished: published, updatedAt: new Date() })
        .where(eq(qualificationSeries.id, seriesId));

      await recordAudit(tx, actor, {
        action: published ? "SERIES_PUBLISHED" : "SERIES_UNPUBLISHED",
        entityType: "qualification_series",
        entityId: seriesId,
      });
    });

    revalidateSeries();
    return ok();
  });
}

export async function deleteSeriesAction(seriesId: string): Promise<ActionResult<undefined>> {
  return run(async () => {
    const actor = await requireAdmin();
    const { seriesId: id } = z.object({ seriesId: z.uuid() }).parse({ seriesId });

    await getDb().transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: qualificationSeries.id, name: qualificationSeries.name })
        .from(qualificationSeries)
        .where(eq(qualificationSeries.id, id))
        .limit(1);
      if (!existing) throw new DomainError("This series no longer exists.", "NOT_FOUND");

      await tx.delete(qualificationSeries).where(eq(qualificationSeries.id, id));

      await recordAudit(tx, actor, {
        action: "SERIES_DELETED",
        entityType: "qualification_series",
        entityId: id,
        before: { name: existing.name },
      });
    });

    revalidateSeries();
    return ok();
  });
}

