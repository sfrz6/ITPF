"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Maximize } from "lucide-react";
import { ItpfLogo } from "@/components/common/itpf-logo";
import { CountryFlag } from "@/components/common/country-flag";
import { useI18n } from "@/lib/i18n/client";
import type { DayNumber } from "@/domain/results";
import type { StandingRow } from "@/components/results/standings-data";

const RIDER_PAGE_SIZE = 12;
const COUNTRY_PAGE_SIZE = 12;
/** How long each page of names stays on screen before rotating to the next. */
const ROTATE_MS = 8_000;
/** How often fresh results are pulled in, so a just-confirmed run shows up quickly. */
const REFRESH_MS = 10_000;

function paginate<T>(rows: readonly T[], pageSize: number): readonly (readonly T[])[] {
  if (rows.length === 0) return [[]];
  const pages: T[][] = [];
  for (let index = 0; index < rows.length; index += pageSize) {
    pages.push(rows.slice(index, index + pageSize));
  }
  return pages;
}

const ALIGN_CLASS = {
  start: "",
  center: "mx-auto",
  end: "ms-auto",
} as const;

/**
 * `align` controls where the (shared-width) block of rows sits within its
 * half: the individual list stays flush against the divider, while the
 * country list sits centered in its half rather than pinned to the far
 * edge, leaving open margin on both sides so the watermark behind both
 * columns stays visible.
 *
 * The list itself is a plain flex column sized to its own content
 * (`w-fit`), with every row stretched to that resolved width (the flexbox
 * algorithm sizes an auto-width column to its widest child's max-content
 * size, then stretches every child to that same width) — so every row
 * shares the width of the longest one, and `align`'s auto margin then
 * positions that whole block within the section.
 */
function RankedList({
  rows,
  align,
}: {
  rows: readonly StandingRow[];
  align: "start" | "center" | "end";
}) {
  return (
    <ol
      className={`relative z-10 flex min-h-0 w-fit flex-1 flex-col gap-2 overflow-hidden ${ALIGN_CLASS[align]}`}
    >
      {rows.map((row) => (
        <li
          key={row.key}
          className="flex items-center gap-4 rounded-lg border border-black/10 bg-white/80 px-4 py-2.5 shadow-sm"
        >
          <span className="w-14 shrink-0 text-end text-3xl font-bold text-neutral-400">
            {row.rank}
          </span>
          <CountryFlag iso2={row.iso2} className="h-11 w-16 shrink-0 rounded-sm" />
          <span className="max-w-xs truncate text-3xl font-semibold text-neutral-900">
            {row.name}
          </span>
          {/* `ms-auto` pins every row's points to the box's end edge
              regardless of how long that row's name is, so the numbers line
              up in one column instead of trailing right after each name. */}
          <span className="numeric ms-auto shrink-0 text-3xl font-bold text-neutral-900">
            {row.total}
          </span>
        </li>
      ))}
    </ol>
  );
}

/**
 * The live results board, built to sit full screen on a venue TV for one
 * championship day: a rider column and a country column, each paging
 * through its ranking a slice at a time so every competitor eventually
 * shows even when far more riders take part than fit on screen at once.
 *
 * Refreshes itself on a timer rather than waiting for a visitor to reload,
 * so a run a referee just confirmed appears here within `REFRESH_MS`.
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
}: {
  championshipId: string;
  championshipName: string;
  organizer: string | null;
  dayNumber: DayNumber;
  hasOrganizerLogo: boolean;
  hasChampionshipLogo: boolean;
  individualRows: readonly StandingRow[];
  countryRows: readonly StandingRow[];
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
    () => paginate(individualRows, RIDER_PAGE_SIZE),
    [individualRows],
  );
  const countryPages = React.useMemo(() => paginate(countryRows, COUNTRY_PAGE_SIZE), [countryRows]);

  const [riderPage, setRiderPage] = React.useState(0);
  const [countryPage, setCountryPage] = React.useState(0);

  React.useEffect(() => {
    if (riderPages.length <= 1) return;
    const id = setInterval(() => setRiderPage((page) => (page + 1) % riderPages.length), ROTATE_MS);
    return () => clearInterval(id);
  }, [riderPages.length]);

  React.useEffect(() => {
    if (countryPages.length <= 1) return;
    const id = setInterval(
      () => setCountryPage((page) => (page + 1) % countryPages.length),
      ROTATE_MS,
    );
    return () => clearInterval(id);
  }, [countryPages.length]);

  // A refresh can shrink the row count (a correction removes a competitor),
  // which could otherwise strand the current page index past the new last
  // page; clamped here at read time rather than re-synced with an effect, so
  // there is no frame where an out of range page is looked up.
  const safeRiderPage = riderPage < riderPages.length ? riderPage : 0;
  const safeCountryPage = countryPage < countryPages.length ? countryPage : 0;

  function start() {
    setStarted(true);
    // Full screen only ever succeeds from a direct user gesture, which this
    // click provides; if the browser still refuses (an iframe preview, say)
    // the board still works, just windowed.
    document.documentElement.requestFullscreen?.().catch(() => {});
  }

  const currentRiders = riderPages[safeRiderPage] ?? [];
  const currentCountries = countryPages[safeCountryPage] ?? [];

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
        className="pointer-events-none fixed inset-0 z-0 m-auto h-[70vh] w-[70vh] select-none object-contain opacity-[0.35]"
      />

      <header className="relative z-10 flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-black/10 bg-white/90 px-8 py-3">
        <div className="flex items-center gap-5">
          <ItpfLogo width={76} />
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
        {hasOrganizerLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/championships/${championshipId}/logo/organizer`}
            alt=""
            className="h-auto w-28 object-contain"
          />
        ) : null}
      </header>

      <div className="relative z-10 grid min-h-0 flex-1 grid-cols-2 divide-x divide-black/10">
        <section className="flex min-h-0 flex-col items-start overflow-hidden px-6 py-4">
          <h2 className="mb-2 shrink-0 text-2xl font-bold uppercase tracking-wide text-amber-600">
            {t("display.individualRanking")}
          </h2>
          {currentRiders.length === 0 ? (
            <p className="text-lg text-neutral-500">{t("display.waitingForResults")}</p>
          ) : (
            <RankedList rows={currentRiders} align="start" />
          )}
        </section>

        <section className="flex min-h-0 w-full flex-col items-start overflow-hidden px-6 py-4">
          <h2 className="mb-2 shrink-0 text-2xl font-bold uppercase tracking-wide text-amber-600">
            {t("display.countryRanking")}
          </h2>
          {currentCountries.length === 0 ? (
            <p className="text-lg text-neutral-500">{t("display.waitingForResults")}</p>
          ) : (
            <RankedList rows={currentCountries} align="center" />
          )}
        </section>
      </div>
    </div>
  );
}
