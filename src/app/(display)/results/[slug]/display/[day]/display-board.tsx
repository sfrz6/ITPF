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
    <ol className="flex-1 space-y-2">
      {rows.map((row) => (
        <li key={row.key} className="flex items-center gap-4 rounded-lg bg-white/5 px-4 py-2.5">
          <span className="w-12 shrink-0 text-end text-2xl font-bold text-white/60">
            {row.rank}
          </span>
          <CountryFlag iso2={row.iso2} className="h-8 w-12 shrink-0 rounded-sm" />
          <span className="min-w-0 flex-1 truncate text-2xl font-semibold">{row.name}</span>
          <span className="shrink-0 numeric text-2xl font-bold">{row.total}</span>
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

  return (
    <div className="flex min-h-dvh flex-col bg-black text-white">
      {!started ? (
        <button
          type="button"
          onClick={start}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black text-white"
        >
          <Maximize className="size-10" aria-hidden />
          <span className="text-xl font-semibold">{t("display.start")}</span>
        </button>
      ) : null}

      <header className="flex flex-wrap items-center justify-between gap-6 border-b border-white/15 px-10 py-6">
        <div className="flex items-center gap-4">
          <ItpfLogo width={64} />
          <div>
            <p className="text-2xl font-bold leading-tight">{championshipName}</p>
            <p className="text-base text-white/70">
              {t("championships.daysOf", { day: dayNumber })}
              {organizer ? ` · ${organizer}` : ""}
            </p>
          </div>
        </div>
        {hasChampionshipLogo || hasOrganizerLogo ? (
          <div className="flex items-center gap-4">
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
        ) : null}
      </header>

      <div className="grid flex-1 grid-cols-2 divide-x divide-white/15">
        <section className="flex min-h-0 flex-col px-8 py-6">
          <h2 className="mb-4 text-2xl font-bold uppercase tracking-wide text-amber-400">
            {t("display.individualRanking")}
          </h2>
          {currentRiders.length === 0 ? (
            <p className="text-lg text-white/60">{t("display.waitingForResults")}</p>
          ) : (
            <RankedList rows={currentRiders} />
          )}
        </section>

        <section className="flex min-h-0 flex-col px-8 py-6">
          <h2 className="mb-4 text-2xl font-bold uppercase tracking-wide text-amber-400">
            {t("display.countryRanking")}
          </h2>
          {currentCountries.length === 0 ? (
            <p className="text-lg text-white/60">{t("display.waitingForResults")}</p>
          ) : (
            <RankedList rows={currentCountries} />
          )}
        </section>
      </div>
    </div>
  );
}
