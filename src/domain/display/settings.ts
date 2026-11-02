import { LOCALES, isLocale, type Locale } from "@/lib/i18n/config";

/**
 * The TV display board cycles through phases. Each phase is one layout shown
 * in one language — "Top 5 Countries" in Arabic and "Top 5 Countries" in
 * English are two separate, independently schedulable phases, not one
 * layout with a single language setting, since an operator may want both
 * languages to take turns on the same screen rather than picking just one.
 */
export const DISPLAY_LAYOUTS = ["topCountries", "topRiders", "fullCountries", "fullRiders"] as const;

export type DisplayLayout = (typeof DISPLAY_LAYOUTS)[number];

export function isDisplayLayout(value: string): value is DisplayLayout {
  return (DISPLAY_LAYOUTS as readonly string[]).includes(value);
}

export interface DisplayPhase {
  readonly layout: DisplayLayout;
  readonly language: Locale;
}

/** Stable string form of a phase, used as a storage/lookup key and `<select>` value. */
export function phaseId(phase: DisplayPhase): string {
  return `${phase.layout}:${phase.language}`;
}

export function parsePhaseId(id: string): DisplayPhase | null {
  const [layout, language] = id.split(":");
  if (!layout || !language || !isDisplayLayout(layout) || !isLocale(language)) return null;
  return { layout, language };
}

/** Every layout crossed with every language, in a fixed, predictable order. */
export const ALL_PHASES: readonly DisplayPhase[] = DISPLAY_LAYOUTS.flatMap((layout) =>
  LOCALES.map((language) => ({ layout, language })),
);

export const DEFAULT_PHASE_DURATION_SECONDS = 9;
export const MIN_PHASE_DURATION_SECONDS = 3;
export const MAX_PHASE_DURATION_SECONDS = 60;

export interface DisplaySettings {
  /** Enabled phases, in the order they rotate through. Never empty. */
  readonly phases: readonly DisplayPhase[];
  /** Per-phase duration in seconds, keyed by `phaseId`; a phase missing here uses the default. */
  readonly durationsSeconds: Readonly<Partial<Record<string, number>>>;
  /**
   * When set (a `phaseId`), the board shows only this phase and does not
   * rotate at all — regardless of `phases` — as long as it actually has
   * data to show. Falls back to normal rotation otherwise, so the board is
   * never left paused on a blank screen.
   */
  readonly pausedOnPhase: string | null;
}

/** Every layout in both languages, rotating — a new day works fully bilingual without anyone opening this screen. */
export const DEFAULT_DISPLAY_SETTINGS: DisplaySettings = {
  phases: ALL_PHASES,
  durationsSeconds: {},
  pausedOnPhase: null,
};

export function durationMsFor(settings: DisplaySettings, phase: DisplayPhase): number {
  const seconds = settings.durationsSeconds[phaseId(phase)] ?? DEFAULT_PHASE_DURATION_SECONDS;
  return seconds * 1000;
}

/**
 * Fills in a possibly-partial, possibly-stale settings object (read straight
 * from the database, or typed by an operator) with defaults, and drops
 * anything that no longer names a real phase — so a future change to the
 * layout list never leaves a championship with an unrenderable selection.
 */
export function normalizeDisplaySettings(
  raw: Partial<DisplaySettings> | null | undefined,
): DisplaySettings {
  if (!raw) return DEFAULT_DISPLAY_SETTINGS;

  const phases = (raw.phases ?? DEFAULT_DISPLAY_SETTINGS.phases).filter(
    (phase): phase is DisplayPhase =>
      !!phase && isDisplayLayout(phase.layout) && isLocale(phase.language),
  );

  const durationsSeconds: Partial<Record<string, number>> = {};
  for (const phase of ALL_PHASES) {
    const id = phaseId(phase);
    const seconds = raw.durationsSeconds?.[id];
    if (
      typeof seconds === "number" &&
      seconds >= MIN_PHASE_DURATION_SECONDS &&
      seconds <= MAX_PHASE_DURATION_SECONDS
    ) {
      durationsSeconds[id] = seconds;
    }
  }

  const pausedOnPhase =
    raw.pausedOnPhase && ALL_PHASES.some((phase) => phaseId(phase) === raw.pausedOnPhase)
      ? raw.pausedOnPhase
      : null;

  return {
    phases: phases.length > 0 ? phases : DEFAULT_DISPLAY_SETTINGS.phases,
    durationsSeconds,
    pausedOnPhase,
  };
}
