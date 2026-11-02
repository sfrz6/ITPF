/**
 * The TV display board cycles through up to four phases. An operator can
 * narrow which ones appear for a given day, reorder them, change how long
 * each stays up, or pause the whole rotation on one of them — e.g. to leave
 * the board sitting on "Top 5 Countries" during a ceremony instead of it
 * rotating away mid-announcement.
 */
export const DISPLAY_PHASES = [
  "topCountries",
  "topRiders",
  "fullCountries",
  "fullRiders",
] as const;

export type DisplayPhase = (typeof DISPLAY_PHASES)[number];

export const DEFAULT_PHASE_DURATION_SECONDS = 9;
export const MIN_PHASE_DURATION_SECONDS = 3;
export const MAX_PHASE_DURATION_SECONDS = 60;

export interface DisplaySettings {
  /** Enabled phases, in the order they rotate through. Never empty. */
  readonly phases: readonly DisplayPhase[];
  /** Per-phase duration in seconds; a phase missing here uses the default. */
  readonly durationsSeconds: Partial<Record<DisplayPhase, number>>;
  /**
   * When set, the board shows only this phase and does not rotate at all —
   * regardless of `phases` — as long as that phase actually has data to
   * show. Falls back to normal rotation otherwise, so the board is never
   * left paused on a blank screen.
   */
  readonly pausedOnPhase: DisplayPhase | null;
}

export const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  phases: DISPLAY_PHASES,
  durationsSeconds: {},
  pausedOnPhase: null,
};

export function isDisplayPhase(value: string): value is DisplayPhase {
  return (DISPLAY_PHASES as readonly string[]).includes(value);
}

export function durationMsFor(settings: DisplaySettings, phase: DisplayPhase): number {
  const seconds = settings.durationsSeconds[phase] ?? DEFAULT_PHASE_DURATION_SECONDS;
  return seconds * 1000;
}

/**
 * Fills in a possibly-partial, possibly-stale settings object (read straight
 * from the database, or typed by an operator) with defaults, and drops
 * anything that no longer names a real phase — so a future change to the
 * phase list never leaves a championship with an unrenderable selection.
 */
export function normalizeDisplaySettings(
  raw: Partial<DisplaySettings> | null | undefined,
): DisplaySettings {
  if (!raw) return DEFAULT_DISPLAY_SETTINGS;

  const phases = (raw.phases ?? DEFAULT_DISPLAY_SETTINGS.phases).filter(isDisplayPhase);
  const durationsSeconds: Partial<Record<DisplayPhase, number>> = {};
  for (const phase of DISPLAY_PHASES) {
    const seconds = raw.durationsSeconds?.[phase];
    if (
      typeof seconds === "number" &&
      seconds >= MIN_PHASE_DURATION_SECONDS &&
      seconds <= MAX_PHASE_DURATION_SECONDS
    ) {
      durationsSeconds[phase] = seconds;
    }
  }
  const pausedOnPhase =
    raw.pausedOnPhase && isDisplayPhase(raw.pausedOnPhase) ? raw.pausedOnPhase : null;

  return {
    phases: phases.length > 0 ? phases : DEFAULT_DISPLAY_SETTINGS.phases,
    durationsSeconds,
    pausedOnPhase,
  };
}
