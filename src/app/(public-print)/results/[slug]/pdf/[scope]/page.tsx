import { notFound } from "next/navigation";
import { getTranslator } from "@/lib/i18n/server";
import { championshipDisplayName, formatCompetitionDate } from "@/components/common/formatting";
import { PrintHeader } from "@/components/common/print-header";
import { PrintTrigger } from "@/components/common/print-trigger";
import { PrintWatermark } from "@/components/common/print-watermark";
import { getChampionshipBySlug, getChampionshipDetail } from "@/server/services/championships";
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

export default async function PublicStandingsPdfPage({
  params,
}: {
  params: Promise<{ slug: string; scope: string }>;
}) {
  const { slug, scope: scopeParam } = await params;
  const scope = parseStandingsScope(scopeParam);
  if (!scope) notFound();

  const { locale, t } = await getTranslator();

  // Only a published championship resolves, matching every other public page.
  const championship = await getChampionshipBySlug(slug);
  if (!championship) notFound();

  const detail = await getChampionshipDetail(championship.id);
  if (!detail) notFound();

  const availability = pdfAvailability(detail.days);
  const day = dayOfScope(scope);
  const isAvailable = day === null ? availability.overall : (availability.byDay.get(day) ?? false);
  if (!isAvailable) notFound();

  const results = await loadChampionshipResults(championship.id, locale);
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
        championshipId={championship.id}
        hasChampionshipLogo={championship.hasChampionshipLogo}
      />

      <PrintHeader
        federationLabel={t("common.federation")}
        championshipName={championshipDisplayName(championship.name, championship.nameAr, locale)}
        locationLine={
          <>
            {championship.location}
            {championship.organizer ? ` · ${championship.organizer}` : ""}
          </>
        }
        championshipId={championship.id}
        hasOrganizerLogo={championship.hasOrganizerLogo}
        hasChampionshipLogo={championship.hasChampionshipLogo}
        right={
          <>
            <p className="text-[11pt] font-bold">
              {t("publicResults.standingsPdfTitle")} — {t(scopeLabelKey(scope))}
            </p>
            <p className="numeric">{formatCompetitionDate(championship.startDate, locale)}</p>
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

      <footer className="mt-6 flex items-end justify-between gap-8 border-t border-black pt-2 text-[9pt]">
        <p>{t("publicResults.subtitle")}</p>
        <p className="shrink-0 text-[8pt]">
          {t("print.printedOn")} {printedOn}
        </p>
      </footer>
    </main>
  );
}
