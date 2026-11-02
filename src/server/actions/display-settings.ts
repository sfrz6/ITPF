"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { championshipDays } from "@/db/schema";
import { requirePermission } from "@/lib/auth/authorize";
import {
  DISPLAY_PHASES,
  MAX_PHASE_DURATION_SECONDS,
  MIN_PHASE_DURATION_SECONDS,
  normalizeDisplaySettings,
  type DisplayPhase,
  type DisplaySettings,
} from "@/domain/display/settings";
import { DomainError, ok, run, type ActionResult } from "./result";

const phaseSchema = z.enum(DISPLAY_PHASES);

const updateSchema = z.object({
  championshipDayId: z.uuid(),
  phases: z.array(phaseSchema).min(1, "Select at least one layout.").max(DISPLAY_PHASES.length),
  // Keyed loosely by string rather than the phase enum: `normalizeDisplaySettings`
  // below already drops any key that isn't a real phase, so there is no need
  // to duplicate that exhaustiveness check here.
  durationsSeconds: z.record(
    z.string(),
    z.number().int().min(MIN_PHASE_DURATION_SECONDS).max(MAX_PHASE_DURATION_SECONDS),
  ),
  pausedOnPhase: phaseSchema.nullable(),
});

export async function updateDisplaySettingsAction(
  input: unknown,
): Promise<ActionResult<undefined>> {
  return run(async () => {
    await requirePermission("EDIT_CHAMPIONSHIP");
    const parsed = updateSchema.safeParse(input);
    if (!parsed.success) {
      throw new DomainError(
        parsed.error.issues[0]?.message ?? "The display settings are not valid.",
        "VALIDATION",
      );
    }

    const db = getDb();
    const [existing] = await db
      .select({ id: championshipDays.id, championshipId: championshipDays.championshipId })
      .from(championshipDays)
      .where(eq(championshipDays.id, parsed.data.championshipDayId))
      .limit(1);
    if (!existing) throw new DomainError("Day not found.", "NOT_FOUND");

    const settings: DisplaySettings = normalizeDisplaySettings({
      phases: parsed.data.phases,
      durationsSeconds: parsed.data.durationsSeconds as Partial<Record<DisplayPhase, number>>,
      pausedOnPhase: parsed.data.pausedOnPhase,
    });

    await db
      .update(championshipDays)
      .set({ displaySettings: settings })
      .where(eq(championshipDays.id, existing.id));

    revalidatePath(`/championships/${existing.championshipId}`);
    return ok();
  });
}
