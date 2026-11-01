import { notFound } from "next/navigation";
import { getTranslator } from "@/lib/i18n/server";
import { championshipDisplayName, formatCompetitionDate } from "@/components/common/formatting";
import { ItpfLogoPrint } from "@/components/common/itpf-logo";
import { PrintTrigger } from "@/components/common/print-trigger";
import { PrintWatermark } from "@/components/common/print-watermark";
import { SeriesRankingsPdfTable } from "@/components/results/series-rankings-pdf";
import { computeSeriesRankings, getSeriesBySlug } from "@/server/services/series";

export const metadata = { title: "Rankings" };

export default async function SeriesRankingsPdfPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { locale, t } = await getTranslator();

  const series = await getSeriesBySlug(slug);
  if (!series) notFound();

  const rankings = await computeSeriesRankings(series.id, locale);
  if (!rankings) notFound();

  const printedOn = new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date());

  return (
    <main className="relative mx-auto max-w-[210mm] px-6 py-6 print:px-0 print:py-0">
      <PrintTrigger />
      <PrintWatermark />

      <header className="mb-4 flex items-start justify-between gap-6 border-b-2 border-black pb-3">
        <div className="flex items-start gap-4">
          <ItpfLogoPrint width={96} />
          <div>
            <p className="text-[10pt] font-semibold uppercase tracking-wide">
              {t("common.federation")}
            </p>
            <h1 className="mt-0.5 text-[14pt] font-bold leading-tight">
              {championshipDisplayName(series.name, series.nameAr, locale)}
            </h1>
            <p className="text-[9pt]">{t("rankings.subtitle")}</p>
          </div>
        </div>
        <div className="text-end text-[9pt]">
          <p className="text-[11pt] font-bold">{t("rankings.title")}</p>
        </div>
      </header>

      {rankings.championships.length > 0 ? (
        <section className="mb-4 space-y-1">
          <h2 className="text-[9pt] font-bold uppercase tracking-wide">
            {t("rankings.championshipsInSeries")}
          </h2>
          <p className="text-[8pt] text-neutral-700">
            {rankings.championships
              .map(
                (championship) =>
                  `${championshipDisplayName(championship.name, championship.nameAr, locale)} (${formatCompetitionDate(championship.startDate, locale)})`,
              )
              .join(" · ")}
          </p>
        </section>
      ) : null}

      <section className="mb-4 space-y-2">
        <h2 className="text-[10pt] font-bold uppercase tracking-wide">
          {t("publicResults.countryStandings")}
        </h2>
        <SeriesRankingsPdfTable rows={rankings.country} isCountry t={t} />
      </section>

      <section className="mb-4 space-y-2 print-avoid-break">
        <h2 className="text-[10pt] font-bold uppercase tracking-wide">
          {t("publicResults.individualStandings")}
        </h2>
        <SeriesRankingsPdfTable rows={rankings.individual} isCountry={false} t={t} />
      </section>

      <footer className="mt-6 flex items-end justify-between gap-8 border-t border-black pt-2 text-[9pt]">
        <p>{t("rankings.footnote")}</p>
        <p className="shrink-0 text-[8pt]">
          {t("print.printedOn")} {printedOn}
        </p>
      </footer>
    </main>
  );
}
