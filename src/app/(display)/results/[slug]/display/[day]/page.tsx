import { notFound } from "next/navigation";
import { getTranslator } from "@/lib/i18n/server";
import { championshipDisplayName } from "@/components/common/formatting";
import { buildStandingsData } from "@/components/results/standings-data";
import { getChampionshipBySlug, getChampionshipDetail } from "@/server/services/championships";
import { loadChampionshipResults } from "@/server/services/results";
import { scopeForDay, type DayNumber } from "@/domain/results";
import { DisplayBoard } from "./display-board";

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

  const { locale, t } = await getTranslator();

  // Only a published championship resolves, same as every other public page.
  const championship = await getChampionshipBySlug(slug);
  if (!championship) notFound();

  const detail = await getChampionshipDetail(championship.id);
  const dayDetail = detail?.days.find((candidate) => candidate.dayNumber === day);
  if (!dayDetail) notFound();

  const results = await loadChampionshipResults(championship.id, locale);
  const { sets } = buildStandingsData(results, t);
  const scope = scopeForDay(day);
  const individualRows =
    sets.find((set) => set.scope === scope && set.subject === "INDIVIDUAL")?.rows ?? [];
  const countryRows =
    sets.find((set) => set.scope === scope && set.subject === "COUNTRY")?.rows ?? [];

  return (
    <DisplayBoard
      championshipId={championship.id}
      championshipName={championshipDisplayName(championship.name, championship.nameAr, locale)}
      organizer={championship.organizer}
      dayNumber={day}
      hasOrganizerLogo={championship.hasOrganizerLogo}
      hasChampionshipLogo={championship.hasChampionshipLogo}
      individualRows={individualRows}
      countryRows={countryRows}
    />
  );
}
