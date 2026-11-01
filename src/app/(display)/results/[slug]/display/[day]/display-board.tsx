"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Maximize } from "lucide-react";
import { ItpfLogo } from "@/components/common/itpf-logo";
import { CountryFlag } from "@/components/common/country-flag";
import { useI18n } from "@/lib/i18n/client";
import type { DayNumber } from "@/domain/results";
import type { StandingRow } from "@/components/results/standings-data";

const RIDER_PAGE_SIZE = 15;
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

function RankedList({ rows }: { rows: readonly StandingRow[] }) {
  return (
    <ol className="relative z-10 flex-1 space-y-3">
      {rows.map((row) => (
        <li
          key={row.key}
          className="flex items-center gap-5 rounded-lg border border-black/10 bg-white/80 px-5 py-3.5 shadow-sm"
        >
          <span className="w-16 shrink-0 text-end text-4xl font-bold text-neutral-400">
            {row.rank}
          </span>
          <CountryFlag iso2={row.iso2} className="h-12 w-16 shrink-0 rounded-sm" />
          <span className="min-w-0 flex-1 truncate text-4xl font-semibold text-neutral-900">
            {row.name}
          </span>
          <span className="numeric shrink-0 text-4xl font-bold text-neutral-900">{row.total}</span>
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
    <div className="relative flex min-h-dvh flex-col bg-white text-neutral-900">
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
        className="pointer-events-none fixed inset-0 z-0 m-auto h-[75vh] w-[75vh] select-none object-contain opacity-20"
      />

      <header className="relative z-10 flex flex-wrap items-center justify-between gap-6 border-b border-black/10 bg-white/90 px-10 py-6">
        <div className="flex items-center gap-5">
          <ItpfLogo width={80} />
          <div>
            <p className="text-4xl font-bold leading-tight">{championshipName}</p>
            <p className="text-xl text-neutral-600">
              {t("championships.daysOf", { day: dayNumber })}
              {organizer ? ` · ${organizer}` : ""}
            </p>
          </div>
        </div>
        {hasOrganizerLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/championships/${championshipId}/logo/organizer`}
            alt=""
            className="h-auto w-24 object-contain"
          />
        ) : null}
      </header>

      <div className="relative z-10 grid flex-1 grid-cols-2 divide-x divide-black/10">
        <section className="flex min-h-0 flex-col px-8 py-6">
          <h2 className="mb-4 text-3xl font-bold uppercase tracking-wide text-amber-600">
            {t("display.individualRanking")}
          </h2>
          {currentRiders.length === 0 ? (
            <p className="text-xl text-neutral-500">{t("display.waitingForResults")}</p>
          ) : (
            <RankedList rows={currentRiders} />
          )}
        </section>

        <section className="flex min-h-0 flex-col px-8 py-6">
          <h2 className="mb-4 text-3xl font-bold uppercase tracking-wide text-amber-600">
            {t("display.countryRanking")}
          </h2>
          {currentCountries.length === 0 ? (
            <p className="text-xl text-neutral-500">{t("display.waitingForResults")}</p>
          ) : (
            <RankedList rows={currentCountries} />
          )}
        </section>
      </div>
    </div>
  );
}
