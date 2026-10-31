import type { Metadata } from "next";
import Link from "next/link";
import { Award, ChevronRight } from "lucide-react";
import { championshipDisplayName } from "@/components/common/formatting";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, EmptyState, PageHeader } from "@/components/ui/surfaces";
import { getTranslator } from "@/lib/i18n/server";
import { listPublishedSeries } from "@/server/services/series";

export const metadata: Metadata = {
  title: "Qualification rankings",
  description:
    "Combined qualification rankings of the International Tent Pegging Federation.",
  robots: { index: true, follow: true },
};

/** Same cadence as the results index: see `(public)/results/page.tsx`. */
export const revalidate = 30;

export default async function PublicRankingsIndexPage() {
  const { locale, t } = await getTranslator();
  const series = await listPublishedSeries();

  return (
    <>
      <PageHeader title={t("rankings.title")} description={t("rankings.subtitle")} />

      {series.length === 0 ? (
        <EmptyState icon={<Award />} title={t("rankings.noSeries")} />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {series.map((item) => (
            <li key={item.id}>
              <Card className="flex h-full flex-col">
                <CardHeader className="flex-col items-start gap-1">
                  <CardTitle className="text-base">
                    {championshipDisplayName(item.name, item.nameAr, locale)}
                  </CardTitle>
                  <p className="text-sm text-muted">
                    {t("series.championshipsCount", { count: item.championshipCount })}
                  </p>
                </CardHeader>
                <CardContent className="mt-auto">
                  <Button variant="secondary" size="sm" asChild>
                    <Link href={`/rankings/${item.slug}`}>
                      {t("publicResults.viewResults")}
                      <ChevronRight className="rtl:rotate-180" aria-hidden />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
