"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Maximize } from "lucide-react";
import { ItpfLogo } from "@/components/common/itpf-logo";
import { CountryFlag } from "@/components/common/country-flag";
import { useI18n } from "@/lib/i18n/client";
import type { DayNumber } from "@/domain/results";
import type { StandingRow } from "@/components/results/standings-data";
import { durationMsFor, type DisplayPhase, type DisplaySettings } from "@/domain/display/settings";

const TOP_FIVE_COUNT = 5;
/** Two columns of five, so a "full list" page always reads as two even rows. */
const FULL_PAGE_SIZE = 10;
/** How long a full-list page stays up before advancing to the next slice of names. */
const SUBPAGE_ROTATE_MS = 8_000;
/** How often fresh results are pulled in, so a just-confirmed run shows up quickly. */
const REFRESH_MS = 10_000;

type Phase = DisplayPhase;

function paginate<T>(rows: readonly T[], pageSize: number): readonly (readonly T[])[] {
  if (rows.length === 0) return [[]];
  const pages: T[][] = [];
  for (let index = 0; index < rows.length; index += pageSize) {
    pages.push(rows.slice(index, index + pageSize));
  }
  return pages;
}

/** Splits one page's rows into two columns, the second never longer than the first. */
function splitColumns<T>(rows: readonly T[]): readonly [readonly T[], readonly T[]] {
  const half = Math.ceil(rows.length / 2);
  return [rows.slice(0, half), rows.slice(half)];
}

const ROW_SIZE = {
  // The Top 5 phase has an entire screen to itself for five rows, so it can
  // afford to run much larger than a full-list page sharing the screen with
  // nine or ten others.
  topFive: {
    li: "gap-x-6 px-7 py-5",
    rank: "w-16 text-4xl",
    flag: "h-12 w-20",
    name: "text-4xl",
    total: "text-4xl",
  },
  full: {
    li: "gap-x-4 px-5 py-3.5",
    rank: "w-10 text-2xl",
    flag: "h-9 w-[3.25rem]",
    name: "text-2xl",
    total: "text-2xl",
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
    <ol className="grid min-h-0 w-full auto-rows-max grid-cols-[auto_auto_1fr_auto] gap-y-3 overflow-hidden">
      {rows.map((row) => (
        <li
          key={row.key}
          className={`col-span-full grid grid-cols-subgrid items-center rounded-xl border border-black/10 bg-white/90 shadow-sm ${s.li}`}
        >
          <span className={`text-end font-bold text-neutral-400 ${s.rank}`}>{row.rank}</span>
          <CountryFlag iso2={row.iso2} className={`rounded-sm ${s.flag}`} />
          <span className={`min-w-0 font-semibold text-neutral-900 ${s.name}`}>{row.name}</span>
          <span className={`numeric justify-self-end font-bold text-neutral-900 ${s.total}`}>
            {row.total}
          </span>
        </li>
      ))}
    </ol>
  );
}

/** The leading five, centered and large, filling the whole screen on its own. */
function TopFivePhase({ title, rows }: { title: string; rows: readonly StandingRow[] }) {
  return (
    <div className="flex h-full w-full items-center justify-center px-10">
      <div className="w-full max-w-4xl">
        <h2 className="mb-7 text-center text-3xl font-bold uppercase tracking-[0.2em] text-amber-600">
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
  const [col1, col2] = splitColumns(page);
  return (
    <div className="flex h-full w-full items-center justify-center px-14 py-6">
      <div className="w-full max-w-6xl">
        <h2 className="mb-6 text-center text-2xl font-bold uppercase tracking-[0.2em] text-amber-600">
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
 * The live results board, built to sit full screen on a venue TV for one
 * championship day. It cycles through four phases — the leading five
 * countries, the leading five riders, then the full country standings and
 * full rider standings (each paging through a slice of names at a time
 * when there are more than fit on one screen) — rather than splitting the
 * screen permanently between riders and countries, so every phase can use
 * the whole screen and run large.
 *
 * Refreshes itself on a timer rather than waiting for a visitor to reload,
 * so a run a referee just confirmed appears here within `REFRESH_MS`. The
 * phase, and each full list's own sub-page, live in this component's own
 * state rather than being derived from props, so a `router.refresh()`
 * never resets the rotation back to the first phase mid-cycle.
 */
export function DisplayBoard({
  championshipId,
  championshipName,
  organizer,
  dayNumber,
  hasOrganizerLogo,
  hasChampionshipLogo,
  individualRows,
  countryRows,
  displaySettings,
}: {
  championshipId: string;
  championshipName: string;
  organizer: string | null;
  dayNumber: DayNumber;
  hasOrganizerLogo: boolean;
  hasChampionshipLogo: boolean;
  individualRows: readonly StandingRow[];
  countryRows: readonly StandingRow[];
  displaySettings: DisplaySettings;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [started, setStarted] = React.useState(false);

  React.useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, REFRESH_MS);
    return () => clearInterval(id);
  }, [router]);

  const riderPages = React.useMemo(
    () => paginate(individualRows, FULL_PAGE_SIZE),
    [individualRows],
  );
  const countryPages = React.useMemo(() => paginate(countryRows, FULL_PAGE_SIZE), [countryRows]);

  const [riderPage, setRiderPage] = React.useState(0);
  const [countryPage, setCountryPage] = React.useState(0);

  React.useEffect(() => {
    if (riderPages.length <= 1) return;
    const id = setInterval(
      () => setRiderPage((page) => (page + 1) % riderPages.length),
      SUBPAGE_ROTATE_MS,
    );
    return () => clearInterval(id);
  }, [riderPages.length]);

  React.useEffect(() => {
    if (countryPages.length <= 1) return;
    const id = setInterval(
      () => setCountryPage((page) => (page + 1) % countryPages.length),
      SUBPAGE_ROTATE_MS,
    );
    return () => clearInterval(id);
  }, [countryPages.length]);

  // A refresh can shrink the row count (a correction removes a competitor),
  // which could otherwise strand the current page index past the new last
  // page; clamped here at read time rather than re-synced with an effect, so
  // there is no frame where an out of range page is looked up.
  const safeRiderPage = riderPage < riderPages.length ? riderPage : 0;
  const safeCountryPage = countryPage < countryPages.length ? countryPage : 0;

  const hasCountries = countryRows.length > 0;
  const hasRiders = individualRows.length > 0;

  const hasDataForPhase = React.useCallback(
    (phase: Phase) =>
      phase === "topCountries" || phase === "fullCountries" ? hasCountries : hasRiders,
    [hasCountries, hasRiders],
  );

  // Built fresh on every render from whatever data and settings exist right
  // now, but the phase *index* below is this component's own state — so if a
  // phase drops out (every country's result is reset, say) the rotation
  // still advances sensibly through whatever remains instead of resetting.
  // A pause pins the board to one phase — as long as it actually has data,
  // so pausing never leaves the board stuck on a blank screen.
  const phases = React.useMemo(() => {
    if (displaySettings.pausedOnPhase && hasDataForPhase(displaySettings.pausedOnPhase)) {
      return [displaySettings.pausedOnPhase];
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
  const currentPhase: Phase | null = phases[safePhaseIndex] ?? null;

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

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden bg-white text-neutral-900">
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
        className="pointer-events-none fixed inset-0 z-0 m-auto h-[60vh] w-[60vh] select-none object-contain opacity-[0.12]"
      />

      <header className="relative z-10 flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-black/10 bg-white/95 px-8 py-3">
        <div className="flex items-center gap-5">
          <ItpfLogo width={64} />
          <div>
            <div className="flex flex-wrap items-baseline gap-3">
              <p className="text-4xl font-bold leading-tight">{championshipName}</p>
              <span className="text-xl font-semibold text-neutral-500">
                {t("championships.daysOf", { day: dayNumber })}
              </span>
            </div>
            {organizer ? <p className="text-base text-neutral-600">{organizer}</p> : null}
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
        {currentPhase === "topCountries" ? (
          <TopFivePhase title={t("display.topCountries")} rows={countryRows} />
        ) : currentPhase === "topRiders" ? (
          <TopFivePhase title={t("display.topRiders")} rows={individualRows} />
        ) : currentPhase === "fullCountries" ? (
          <FullListPhase
            title={t("display.countryRanking")}
            page={countryPages[safeCountryPage] ?? []}
            totalPages={countryPages.length}
            currentPage={safeCountryPage}
          />
        ) : currentPhase === "fullRiders" ? (
          <FullListPhase
            title={t("display.individualRanking")}
            page={riderPages[safeRiderPage] ?? []}
            totalPages={riderPages.length}
            currentPage={safeRiderPage}
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
