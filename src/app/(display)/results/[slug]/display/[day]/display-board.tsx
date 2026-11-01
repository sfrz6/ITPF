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

const ROW_SIZE = {
  // Up to 12 riders fit a page, so individual rows keep the tighter size.
  normal: {
    li: "gap-4 px-4 py-2.5",
    rank: "w-14 text-3xl",
    flag: "h-11 w-16",
    name: "text-3xl",
    total: "text-3xl",
  },
  // The country list rarely has more than ~10 entries on a page, so it has
  // the room to read larger.
  large: {
    li: "gap-5 px-5 py-3",
    rank: "w-16 text-[2rem]",
    flag: "h-14 w-20",
    name: "text-[2rem]",
    total: "text-[2rem]",
  },
} as const;

/**
 * A ranking column's rows, sized to its own content (`w-fit`) with every row
 * stretched to that resolved width (the flexbox algorithm sizes an
 * auto-width column to its widest child's max-content size, then stretches
 * every child to that same width) — so every row shares the width of the
 * longest one. Positioning the resulting block within its half is the
 * caller's job (see the heading+list wrapper in `DisplayBoard`), so both the
 * heading and the rows move together.
 */
function RankedList({
  rows,
  size = "normal",
}: {
  rows: readonly StandingRow[];
  size?: "normal" | "large";
}) {
  const s = ROW_SIZE[size];
  return (
    <ol className="relative z-10 flex min-h-0 w-fit flex-1 flex-col gap-2 overflow-hidden">
      {rows.map((row) => (
        <li
          key={row.key}
          className={`flex items-center rounded-lg border border-black/10 bg-white/80 shadow-sm ${s.li}`}
        >
          <span className={`shrink-0 text-end font-bold text-neutral-400 ${s.rank}`}>
            {row.rank}
          </span>
          <CountryFlag iso2={row.iso2} className={`shrink-0 rounded-sm ${s.flag}`} />
          <span className={`max-w-xs truncate font-semibold text-neutral-900 ${s.name}`}>
            {row.name}
          </span>
          {/* `ms-auto` pins every row's points to the box's end edge
              regardless of how long that row's name is, so the numbers line
              up in one column instead of trailing right after each name. */}
          <span className={`numeric ms-auto shrink-0 font-bold text-neutral-900 ${s.total}`}>
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
            <RankedList rows={currentRiders} />
          )}
        </section>

        <section className="flex min-h-0 w-full flex-col overflow-hidden px-6 py-4">
          {/* Shifted right of true center, by this fixed margin on the
              heading+rows together, so the heading always sits directly
              above its list instead of staying pinned at the far left. */}
          <div className="ms-[46%] flex min-h-0 flex-1 flex-col items-start overflow-hidden">
            <h2 className="mb-2 shrink-0 text-2xl font-bold uppercase tracking-wide text-amber-600">
              {t("display.countryRanking")}
            </h2>
            {currentCountries.length === 0 ? (
              <p className="text-lg text-neutral-500">{t("display.waitingForResults")}</p>
            ) : (
              <RankedList rows={currentCountries} size="large" />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
