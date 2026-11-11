import { notFound } from "next/navigation";
import { createTranslator, getDictionary, LOCALES } from "@/lib/i18n";
import { championshipDisplayName, localizedOptionalText } from "@/components/common/formatting";
import { buildStandingsData, type StandingRow } from "@/components/results/standings-data";
import { getChampionshipBySlug, getChampionshipDetail } from "@/server/services/championships";
import { loadChampionshipResults } from "@/server/services/results";
import { scopeForDay, type DayNumber } from "@/domain/results";
import { generateQrSvg } from "@/lib/qr";
import { DisplayBoard } from "./display-board";

/** Every championship's board points at the same results homepage — there is
 * no per-championship destination to encode. */
const QR_TARGET_URL = "https://itpf.app";

export const metadata = { title: "Live results" };

/**
 * Refreshed often: this page is meant to sit open on a venue TV and show a
 * run's result shortly after a referee confirms it, unlike the slower
 * cadence the read-at-your-own-pace results pages use.
 */
export const revalidate = 10;

function parseDayNumber(value: string): DayNumber | null {
  return value === "1" || value === "2" || value === "3" ? (Number(value) as DayNumber) : null;
}

export default async function ChampionshipDisplayPage({
  params,
}: {
  params: Promise<{ slug: string; day: string }>;
}) {
  const { slug, day: dayParam } = await params;
  const day = parseDayNumber(dayParam);
  if (!day) notFound();

  // Only a published championship resolves, same as every other public page.
  const championship = await getChampionshipBySlug(slug);
  if (!championship) notFound();

  const detail = await getChampionshipDetail(championship.id);
  const dayDetail = detail?.days.find((candidate) => candidate.dayNumber === day);
  if (!dayDetail) notFound();

  const scope = scopeForDay(day);
  const qrSvg = await generateQrSvg(QR_TARGET_URL);

  // A schedulable phase names its own language (Top 5 Countries can rotate
  // through an Arabic instance and an English instance back to back), so
  // every bit of text the board can show is pre-built in both languages
  // rather than resolved once from a single page-wide locale.
  const byLocale = Object.fromEntries(
    await Promise.all(
      LOCALES.map(async (locale) => {
        const results = await loadChampionshipResults(championship.id, locale);
        const t = createTranslator(getDictionary(locale));
        const { sets } = buildStandingsData(results, t);
        return [
          locale,
          {
            championshipName: championshipDisplayName(championship.name, championship.nameAr, locale),
            organizer: localizedOptionalText(championship.organizer, championship.organizerAr, locale),
            individualRows:
              sets.find((set) => set.scope === scope && set.subject === "INDIVIDUAL")?.rows ?? [],
            countryRows:
              sets.find((set) => set.scope === scope && set.subject === "COUNTRY")?.rows ?? [],
            // Cumulative across every day so far, regardless of which day's
            // board this is — the "Overall" layout shows this beside that
            // day's own country scores so the two numbers are never confused
            // with each other.
            overallCountryRows:
              sets.find((set) => set.scope === "OVERALL" && set.subject === "COUNTRY")?.rows ?? [],
          },
        ] as const;
      }),
    ),
  ) as Record<
    (typeof LOCALES)[number],
    {
      championshipName: string;
      organizer: string | null;
      individualRows: readonly StandingRow[];
      countryRows: readonly StandingRow[];
      overallCountryRows: readonly StandingRow[];
    }
  >;

  return (
    <DisplayBoard
      championshipId={championship.id}
      dayNumber={day}
      hasOrganizerLogo={championship.hasOrganizerLogo}
      hasChampionshipLogo={championship.hasChampionshipLogo}
      byLocale={byLocale}
      displaySettings={dayDetail.displaySettings}
      qrSvg={qrSvg}
    />
  );
}
