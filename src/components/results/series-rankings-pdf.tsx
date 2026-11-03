import { CountryFlag } from "@/components/common/country-flag";
import type { Translator } from "@/lib/i18n";
import type { SeriesRankingRow } from "@/server/services/series";

/**
 * A series' combined leaderboard laid out for paper, mirroring
 * `StandingsPdfTable`'s shape but for the simpler rank/name/total rows a
 * series produces — there is no per-championship breakdown to show.
 */
export function SeriesRankingsPdfTable({
  rows,
  isCountry,
  t,
}: {
  rows: readonly SeriesRankingRow[];
  isCountry: boolean;
  t: Translator;
}) {
  if (rows.length === 0) {
    return <p className="px-1 py-2 text-[9pt] text-neutral-600">{t("results.noData")}</p>;
  }

  return (
    <table className="w-full border-collapse text-[9pt]">
      <thead>
        <tr className="border-b border-black bg-neutral-100">
          <th className="w-10 border-e border-black px-1 py-1 text-center">{t("common.rank")}</th>
          <th className="px-2 py-1 text-start">
            {isCountry ? t("common.team") : t("common.athlete")}
          </th>
          <th className="w-16 px-1 py-1 text-center">{t("common.total")}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const isPodium = row.rank <= 3;
          return (
            <tr
              key={row.key}
              className={`border-b border-neutral-400 last:border-b-0 ${isPodium ? "font-semibold" : ""}`}
            >
              <td className="numeric border-e border-black px-1 py-1.5 text-center">{row.rank}</td>
              <td className="border-e border-black px-2 py-1.5">
                <span className="inline-flex items-center gap-1.5">
                  <CountryFlag iso2={row.iso2} size="sm" />
                  <span>
                    {row.name}
                    {!isCountry && row.countryName ? (
                      <span className="ms-1 text-[8pt] font-normal text-neutral-600">
                        ({row.countryName})
                      </span>
                    ) : null}
                  </span>
                </span>
              </td>
              <td className="numeric px-1 py-1.5 text-center">{row.total}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
