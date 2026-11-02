import { notFound } from "next/navigation";
import { requirePagePermission } from "@/lib/auth/page-guards";
import { getTranslator } from "@/lib/i18n/server";
import { championshipDisplayName, formatCompetitionDate } from "@/components/common/formatting";
import { PrintHeader } from "@/components/common/print-header";
import { PrintTrigger } from "@/components/common/print-trigger";
import { PrintWatermark } from "@/components/common/print-watermark";
import { getChampionshipDetail } from "@/server/services/championships";
import { loadChampionshipResults } from "@/server/services/results";
import { getEventResultsForPrint } from "@/server/services/runs";
import {
  buildStandingsData,
  dayOfScope,
  parseStandingsScope,
  pdfAvailability,
  scopeLabelKey,
} from "@/components/results/standings-data";
import { StandingsPdfTable } from "@/components/results/standings-pdf";
import { EventResultsPdfTable } from "@/components/results/event-results-pdf";

export const metadata = { title: "Standings" };

/**
 * The same standings PDF as the public one, but reachable without the
 * championship having to be published yet — an official reviewing a draft
 * only needs to be signed in with permission to see internal results, same
 * as the Results tab itself.
 */
export default async function InternalStandingsPdfPage({
  params,
}: {
  params: Promise<{ championshipId: string; scope: string }>;
}) {
  await requirePagePermission("VIEW_INTERNAL_RESULTS");
  const { championshipId, scope: scopeParam } = await params;
  const scope = parseStandingsScope(scopeParam);
  if (!scope) notFound();

  const { locale, t } = await getTranslator();

  const detail = await getChampionshipDetail(championshipId);
  if (!detail) notFound();

  const availability = pdfAvailability(detail.days);
  const day = dayOfScope(scope);
  const isAvailable = day === null ? availability.overall : (availability.byDay.get(day) ?? false);
  if (!isAvailable) notFound();

  const results = await loadChampionshipResults(championshipId, locale);
  const { days, sets } = buildStandingsData(results, t);
  const individualSet = sets.find((set) => set.scope === scope && set.subject === "INDIVIDUAL")!;
  const countrySet = sets.find((set) => set.scope === scope && set.subject === "COUNTRY")!;

  // The event score sheets only make sense for a single day's PDF: the
  // Overall PDF stays standings-only, since a run sheet is inherently a
  // single day's record, not something that aggregates across days.
  const eventsForDay = day === null ? [] : (detail.days.find((d) => d.dayNumber === day)?.events ?? []);
  const eventResults = (
    await Promise.all(eventsForDay.map((event) => getEventResultsForPrint(event.id, locale)))
  ).filter((state): state is NonNullable<typeof state> => state !== null);

  const printedOn = new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());

  return (
    <main className="relative mx-auto max-w-[210mm] px-6 py-6 print:px-0 print:py-0">
      <PrintTrigger />
      <PrintWatermark
        championshipId={detail.id}
        hasChampionshipLogo={detail.hasChampionshipLogo}
      />

      <PrintHeader
        federationLabel={t("common.federation")}
        championshipName={championshipDisplayName(detail.name, detail.nameAr, locale)}
        locationLine={
          <>
            {detail.location}
            {detail.organizer ? ` · ${detail.organizer}` : ""}
          </>
        }
        championshipId={detail.id}
        hasOrganizerLogo={detail.hasOrganizerLogo}
        hasChampionshipLogo={detail.hasChampionshipLogo}
        right={
          <>
            <p className="text-[11pt] font-bold">
              {t("publicResults.standingsPdfTitle")} — {t(scopeLabelKey(scope))}
            </p>
            <p className="numeric">{formatCompetitionDate(detail.startDate, locale)}</p>
          </>
        }
      />

      <section className="mb-4 space-y-2">
        <h2 className="text-[10pt] font-bold uppercase tracking-wide">
          {t("publicResults.countryStandings")}
        </h2>
        <StandingsPdfTable set={countrySet} days={days} t={t} />
      </section>

      <section className="mb-4 space-y-2 print-avoid-break">
        <h2 className="text-[10pt] font-bold uppercase tracking-wide">
          {t("publicResults.individualStandings")}
        </h2>
        <StandingsPdfTable set={individualSet} days={days} t={t} />
      </section>

      {eventResults.map((state) => (
        <EventResultsPdfTable key={state.eventId} state={state} t={t} />
      ))}

      <footer className="mt-6 border-t border-black pt-2 text-end text-[8pt]">
        {t("print.printedOn")} {printedOn}
      </footer>
    </main>
  );
}
