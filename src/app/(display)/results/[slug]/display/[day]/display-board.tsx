"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Maximize } from "lucide-react";
import { ItpfLogo } from "@/components/common/itpf-logo";
import { CountryFlag } from "@/components/common/country-flag";
import { createTranslator, getDictionary, directionOf, DEFAULT_LOCALE, type Locale } from "@/lib/i18n";
import type { DayNumber } from "@/domain/results";
import type { StandingRow } from "@/components/results/standings-data";
import {
  durationMsFor,
  phaseId,
  type DisplayPhase,
  type DisplaySettings,
} from "@/domain/display/settings";

const TOP_FIVE_COUNT = 5;
/** Two columns of five, so a "full list" page always reads as two even rows. */
const FULL_PAGE_SIZE = 10;
/** The Overall layout's athlete column: one name per row (not two side by
 * side), so it shows fewer at a time than the two-column full-screen list. */
const OVERALL_RIDER_PAGE_SIZE = 10;
/** The Overall layout's two country columns never page — ten is already
 * more countries than a single championship typically fields. */
const OVERALL_COUNTRY_COUNT = 10;
/** How long a full-list page stays up before advancing to the next slice of names. */
const SUBPAGE_ROTATE_MS = 8_000;
/** How often fresh results are pulled in, so a just-confirmed run shows up quickly. */
const REFRESH_MS = 10_000;

interface LocaleData {
  readonly championshipName: string;
  readonly organizer: string | null;
  readonly individualRows: readonly StandingRow[];
  readonly countryRows: readonly StandingRow[];
  /** Cumulative across every day so far, not just this one. */
  readonly overallCountryRows: readonly StandingRow[];
}

const ROW_SIZE = {
  // The Top 5 phase has an entire screen to itself for five rows, so it runs
  // as large as the screen allows.
  topFive: {
    li: "gap-x-8 px-9 py-7",
    rank: "w-20 text-6xl",
    rankColor: "text-neutral-400",
    flag: "h-16 w-24",
    name: "text-6xl",
    total: "text-6xl",
    weight: "font-bold",
  },
  full: {
    li: "gap-x-5 px-6 py-5",
    rank: "w-12 text-3xl",
    rankColor: "text-neutral-400",
    flag: "h-11 w-16",
    name: "text-3xl",
    total: "text-3xl",
    weight: "font-bold",
  },
  // The Overall layout's three columns share a third of the screen each, so
  // every row size in it is scaled down from the full-width phases above.
  // Bumped a size up from the other rows here (and the row's own vertical
  // padding trimmed to match) so the name and total read larger without
  // growing the row itself, with a heavier weight than the other sizes —
  // this is the one phase read from across a venue in the smallest column
  // width, where a bolder weight matters most.
  overallRider: {
    li: "gap-x-3 px-4 py-2",
    // Wider than the name/total text so the rank stands out as its own
    // heavier, pure-black mark rather than the muted gray used elsewhere.
    rank: "w-12 text-3xl",
    rankColor: "text-black",
    flag: "h-8 w-12",
    name: "text-2xl",
    total: "text-2xl",
    weight: "font-extrabold",
  },
  overallCountry: {
    li: "gap-x-3 px-4 py-2",
    rank: "w-12 text-3xl",
    rankColor: "text-black",
    flag: "h-8 w-12",
    name: "text-2xl",
    total: "text-2xl",
    weight: "font-extrabold",
  },
} as const;

/**
 * A ranking column's rows, every row sharing the same four column widths via
 * CSS subgrid and stretching to the column's full available width.
 *
 * Grid `auto`/`1fr` columns mean all cells in the rank/flag/name/total
 * columns are measured together in one pass, every time, so nothing goes
 * stale after a live update changes which row is widest. The name column
 * never truncates: a name too wide for its column wraps onto a second line
 * (growing that row) instead of being cut with an ellipsis, since reading a
 * competitor's full name matters more on a venue TV than every row staying
 * exactly one line tall.
 */
function RankedList({
  rows,
  size,
}: {
  rows: readonly StandingRow[];
  size: keyof typeof ROW_SIZE;
}) {
  const s = ROW_SIZE[size];
  return (
    <ol className="grid min-h-0 w-full min-w-0 auto-rows-max grid-cols-[auto_auto_1fr_auto] gap-y-3 overflow-hidden">
      {rows.map((row) => (
        <li
          key={row.key}
          className={`col-span-full grid grid-cols-subgrid items-center rounded-xl border border-black/10 bg-white/70 shadow-sm ${s.li}`}
        >
          <span className={`text-end ${s.rankColor} ${s.weight} ${s.rank}`}>{row.rank}</span>
          <CountryFlag iso2={row.iso2} className={`rounded-sm ${s.flag}`} />
          <span className={`min-w-0 truncate text-neutral-900 ${s.weight} ${s.name}`}>{row.name}</span>
          <span className={`numeric justify-self-end text-neutral-900 ${s.weight} ${s.total}`}>
            {row.total}
          </span>
        </li>
      ))}
    </ol>
  );
}

/**
 * The leading five, large and anchored near the top of the screen rather
 * than centered in the middle — at this size five rows plus the heading
 * don't fill the whole height, and centering them left as much empty space
 * above the heading as below the last row, which reads as broken on a TV
 * rather than deliberate.
 */
function TopFivePhase({ title, rows }: { title: string; rows: readonly StandingRow[] }) {
  return (
    <div className="flex h-full w-full justify-center px-8 pt-12">
      <div className="w-full max-w-[90rem]">
        <h2 className="mb-9 text-center text-5xl font-bold uppercase tracking-[0.2em] text-blue-950">
          {title}
        </h2>
        <RankedList rows={rows.slice(0, TOP_FIVE_COUNT)} size="topFive" />
      </div>
    </div>
  );
}

/** Every competitor, two columns of five, paging through more names a slice at a time. */
function FullListPhase({
  title,
  page,
  totalPages,
  currentPage,
}: {
  title: string;
  page: readonly StandingRow[];
  totalPages: number;
  currentPage: number;
}) {
  const half = Math.ceil(page.length / 2);
  const col1 = page.slice(0, half);
  const col2 = page.slice(half);
  return (
    <div className="flex h-full w-full items-center justify-center px-14 py-6">
      <div className="w-full max-w-7xl">
        <h2 className="mb-7 text-center text-4xl font-bold uppercase tracking-[0.2em] text-blue-950">
          {title}
        </h2>
        <div className="grid grid-cols-2 gap-10">
          <RankedList rows={col1} size="full" />
          <RankedList rows={col2} size="full" />
        </div>
        {totalPages > 1 ? (
          <div className="mt-6 flex items-center justify-center gap-2.5" aria-hidden>
            {Array.from({ length: totalPages }).map((_, index) => (
              <span
                key={index}
                className={`h-2.5 w-2.5 rounded-full ${
                  index === currentPage ? "bg-amber-600" : "bg-neutral-300"
                }`}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Three columns sharing the screen at once rather than taking turns: that
 * day's athlete standings, that day's country standings, and — set apart
 * with its own lighter background so it's never mistaken for the day's own
 * number — the country standings cumulative across every day so far.
 */
function OverallColumn({
  title,
  tone,
  watermarkSrc,
  children,
}: {
  title: string;
  tone: "dark" | "light";
  /** Shown faintly behind this column's own rows — the overall/cumulative
   * column only, so it reads as the "big picture" column at a glance. */
  watermarkSrc?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`relative flex h-full min-w-0 flex-col overflow-hidden px-4 py-5 ${
        tone === "dark" ? "bg-blue-950" : "bg-sky-100"
      }`}
    >
      {watermarkSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={watermarkSrc}
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0 m-auto h-[70%] w-[70%] select-none object-contain opacity-35"
        />
      ) : null}
      {/* Bigger and bolder than before, but `leading-none` plus a larger
          margin below it claws back exactly the line-height it gained, so
          the title reads like a real header without pushing the rows
          beneath it down any further than they already sat. */}
      <h2
        className={`relative z-10 mb-5 shrink-0 whitespace-nowrap text-center text-2xl font-extrabold uppercase leading-none tracking-[0.02em] ${
          tone === "dark" ? "text-white" : "text-blue-950"
        }`}
      >
        {title}
      </h2>
      <div className="relative z-10 min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}

function OverallPhase({
  athleteTitle,
  countryTitle,
  overallTitle,
  athletePage,
  athleteTotalPages,
  athleteCurrentPage,
  countryRows,
  overallCountryRows,
  overallWatermarkSrc,
}: {
  athleteTitle: string;
  countryTitle: string;
  overallTitle: string;
  athletePage: readonly StandingRow[];
  athleteTotalPages: number;
  athleteCurrentPage: number;
  countryRows: readonly StandingRow[];
  overallCountryRows: readonly StandingRow[];
  overallWatermarkSrc: string;
}) {
  return (
    <div className="grid h-full w-full min-w-0 grid-cols-3 gap-px bg-black/10">
      <OverallColumn title={athleteTitle} tone="dark">
        <RankedList rows={athletePage} size="overallRider" />
        {athleteTotalPages > 1 ? (
          <div className="mt-3 flex items-center justify-center gap-2" aria-hidden>
            {Array.from({ length: athleteTotalPages }).map((_, index) => (
              <span
                key={index}
                className={`h-2 w-2 rounded-full ${
                  index === athleteCurrentPage ? "bg-white" : "bg-white/30"
                }`}
              />
            ))}
          </div>
        ) : null}
      </OverallColumn>

      <OverallColumn title={countryTitle} tone="dark">
        <RankedList rows={countryRows.slice(0, OVERALL_COUNTRY_COUNT)} size="overallCountry" />
      </OverallColumn>

      <OverallColumn title={overallTitle} tone="light" watermarkSrc={overallWatermarkSrc}>
        <RankedList rows={overallCountryRows.slice(0, OVERALL_COUNTRY_COUNT)} size="overallCountry" />
      </OverallColumn>
    </div>
  );
}

/**
 * The live results board, built to sit full screen on a venue TV for one
 * championship day. It cycles through configured phases — each one a
 * layout (Top 5 Countries, Top 5 Riders, full Country standings, full
 * Rider standings) in one specific language — rather than splitting the
 * screen permanently between riders and countries or being pinned to one
 * language, so an operator can schedule, say, Arabic and English instances
 * of the same layout back to back.
 *
 * Refreshes itself on a timer rather than waiting for a visitor to reload,
 * so a run a referee just confirmed appears here within `REFRESH_MS`. The
 * phase, and each full list's own sub-page, live in this component's own
 * state rather than being derived from props, so a `router.refresh()`
 * never resets the rotation back to the first phase mid-cycle.
 */
export function DisplayBoard({
  championshipId,
  dayNumber,
  hasOrganizerLogo,
  hasChampionshipLogo,
  byLocale,
  displaySettings,
}: {
  championshipId: string;
  dayNumber: DayNumber;
  hasOrganizerLogo: boolean;
  hasChampionshipLogo: boolean;
  byLocale: Record<Locale, LocaleData>;
  displaySettings: DisplaySettings;
}) {
  const router = useRouter();
  const [started, setStarted] = React.useState(false);

  React.useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [router]);

  // Row counts are the same regardless of language — only the text differs —
  // so pagination math is computed once and the matching slice is read from
  // whichever language the current phase names.
  const riderCount = byLocale[DEFAULT_LOCALE].individualRows.length;
  const countryCount = byLocale[DEFAULT_LOCALE].countryRows.length;
  const riderPageCount = Math.max(1, Math.ceil(riderCount / FULL_PAGE_SIZE));
  const countryPageCount = Math.max(1, Math.ceil(countryCount / FULL_PAGE_SIZE));
  // The Overall layout's own athlete column pages through a different
  // slice size than the full-screen rider list, so it gets its own
  // independent page count and rotation rather than sharing `riderPage`.
  const overallRiderPageCount = Math.max(1, Math.ceil(riderCount / OVERALL_RIDER_PAGE_SIZE));

  const [riderPage, setRiderPage] = React.useState(0);
  const [countryPage, setCountryPage] = React.useState(0);
  const [overallRiderPage, setOverallRiderPage] = React.useState(0);

  React.useEffect(() => {
    if (riderPageCount <= 1) return;
    const id = setInterval(
      () => setRiderPage((page) => (page + 1) % riderPageCount),
      SUBPAGE_ROTATE_MS,
    );
    return () => clearInterval(id);
  }, [riderPageCount]);

  React.useEffect(() => {
    if (countryPageCount <= 1) return;
    const id = setInterval(
      () => setCountryPage((page) => (page + 1) % countryPageCount),
      SUBPAGE_ROTATE_MS,
    );
    return () => clearInterval(id);
  }, [countryPageCount]);

  React.useEffect(() => {
    if (overallRiderPageCount <= 1) return;
    const id = setInterval(
      () => setOverallRiderPage((page) => (page + 1) % overallRiderPageCount),
      SUBPAGE_ROTATE_MS,
    );
    return () => clearInterval(id);
  }, [overallRiderPageCount]);

  // A refresh can shrink the row count (a correction removes a competitor),
  // which could otherwise strand the current page index past the new last
  // page; clamped here at read time rather than re-synced with an effect, so
  // there is no frame where an out of range page is looked up.
  const safeRiderPage = riderPage < riderPageCount ? riderPage : 0;
  const safeCountryPage = countryPage < countryPageCount ? countryPage : 0;
  const safeOverallRiderPage = overallRiderPage < overallRiderPageCount ? overallRiderPage : 0;

  const hasDataForPhase = React.useCallback(
    (phase: DisplayPhase) =>
      phase.layout === "topCountries" || phase.layout === "fullCountries"
        ? countryCount > 0
        : phase.layout === "overall"
          ? riderCount > 0 && countryCount > 0
          : riderCount > 0,
    [countryCount, riderCount],
  );

  // Built fresh on every render from whatever data and settings exist right
  // now, but the phase *index* below is this component's own state — so if a
  // phase drops out (every country's result is reset, say) the rotation
  // still advances sensibly through whatever remains instead of resetting.
  // A pause pins the board to one phase — as long as it actually has data,
  // so pausing never leaves the board stuck on a blank screen.
  const phases = React.useMemo(() => {
    if (displaySettings.pausedOnPhase) {
      const paused = displaySettings.phases.find(
        (phase) => phaseId(phase) === displaySettings.pausedOnPhase,
      );
      if (paused && hasDataForPhase(paused)) return [paused];
    }
    return displaySettings.phases.filter(hasDataForPhase);
  }, [displaySettings, hasDataForPhase]);

  const [phaseIndex, setPhaseIndex] = React.useState(0);

  // Re-armed with the *current* phase's own duration every time the phase
  // changes, rather than one fixed interval, since each phase can have its
  // own configured length.
  React.useEffect(() => {
    if (phases.length <= 1) return;
    const phase = phases[phaseIndex % phases.length]!;
    const id = setTimeout(
      () => setPhaseIndex((index) => (index + 1) % phases.length),
      durationMsFor(displaySettings, phase),
    );
    return () => clearTimeout(id);
  }, [phases, phaseIndex, displaySettings]);

  const safePhaseIndex = phaseIndex < phases.length ? phaseIndex : 0;
  const currentPhase: DisplayPhase | null = phases[safePhaseIndex] ?? null;

  // The board's language follows the *current phase*, not a single
  // page-wide setting — so an Arabic "Top 5 Countries" phase and an English
  // "Top 5 Riders" phase can take turns on the same screen.
  const language: Locale = currentPhase?.language ?? DEFAULT_LOCALE;
  const t = React.useMemo(() => createTranslator(getDictionary(language)), [language]);
  const dir = directionOf(language);
  const current = byLocale[language];

  function start() {
    setStarted(true);
    // Full screen only ever succeeds from a direct user gesture, which this
    // click provides; if the browser still refuses (an iframe preview, say)
    // the board still works, just windowed.
    document.documentElement.requestFullscreen?.().catch(() => {});
  }

  // The championship's own logo reads better as the big centered watermark
  // than the federation mark, when one was uploaded; otherwise the ITPF mark
  // fills that role so the board is never blank in the middle.
  const watermarkSrc = hasChampionshipLogo
    ? `/api/championships/${championshipId}/logo/championship`
    : "/brand/itpf-logo-light.webp";

  const riderPageStart = safeRiderPage * FULL_PAGE_SIZE;
  const countryPageStart = safeCountryPage * FULL_PAGE_SIZE;
  const overallRiderPageStart = safeOverallRiderPage * OVERALL_RIDER_PAGE_SIZE;

  return (
    <div dir={dir} className="relative flex h-dvh flex-col overflow-hidden bg-white text-neutral-900">
      {!started ? (
        <button
          type="button"
          onClick={start}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-white text-neutral-900"
        >
          <Maximize className="size-10" aria-hidden />
          <span className="text-xl font-semibold">{t("display.start")}</span>
        </button>
      ) : null}

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={watermarkSrc}
        alt=""
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 m-auto h-[80vh] w-[80vh] select-none object-contain opacity-[0.22]"
      />

      <header className="relative z-10 flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-black/10 bg-white/95 px-8 py-3">
        <div className="flex items-center gap-5">
          <ItpfLogo width={64} />
          <div>
            <div className="flex flex-wrap items-baseline gap-3">
              <p className="text-4xl font-bold leading-tight">{current.championshipName}</p>
              <span className="text-xl font-semibold text-neutral-500">
                {t("championships.daysOf", { day: dayNumber })}
              </span>
            </div>
            {current.organizer ? <p className="text-base text-neutral-600">{current.organizer}</p> : null}
          </div>
        </div>
        {/* The championship's own logo sits beside the organizer's, each shown
            only when uploaded — mirrors the printed documents' header, which
            already shows both side by side. */}
        <div className="flex shrink-0 items-center gap-4">
          {hasChampionshipLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/championships/${championshipId}/logo/championship`}
              alt=""
              className="h-auto w-20 object-contain"
            />
          ) : null}
          {hasOrganizerLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/championships/${championshipId}/logo/organizer`}
              alt=""
              className="h-auto w-20 object-contain"
            />
          ) : null}
        </div>
      </header>

      <div className="relative z-10 min-h-0 flex-1">
        {currentPhase?.layout === "topCountries" ? (
          <TopFivePhase title={t("display.topCountries")} rows={current.countryRows} />
        ) : currentPhase?.layout === "topRiders" ? (
          <TopFivePhase title={t("display.topRiders")} rows={current.individualRows} />
        ) : currentPhase?.layout === "fullCountries" ? (
          <FullListPhase
            title={t("display.countryRanking")}
            page={current.countryRows.slice(countryPageStart, countryPageStart + FULL_PAGE_SIZE)}
            totalPages={countryPageCount}
            currentPage={safeCountryPage}
          />
        ) : currentPhase?.layout === "fullRiders" ? (
          <FullListPhase
            title={t("display.individualRanking")}
            page={current.individualRows.slice(riderPageStart, riderPageStart + FULL_PAGE_SIZE)}
            totalPages={riderPageCount}
            currentPage={safeRiderPage}
          />
        ) : currentPhase?.layout === "overall" ? (
          <OverallPhase
            athleteTitle={t("display.dayIndividualRanking", { day: dayNumber })}
            countryTitle={t("display.dayCountryRanking", { day: dayNumber })}
            overallTitle={t("display.overallStandings")}
            athletePage={current.individualRows.slice(
              overallRiderPageStart,
              overallRiderPageStart + OVERALL_RIDER_PAGE_SIZE,
            )}
            athleteTotalPages={overallRiderPageCount}
            athleteCurrentPage={safeOverallRiderPage}
            countryRows={current.countryRows}
            overallCountryRows={current.overallCountryRows}
            overallWatermarkSrc={watermarkSrc}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-2xl text-neutral-500">{t("display.waitingForResults")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
