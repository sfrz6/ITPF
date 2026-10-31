import Link from "next/link";
import { Award, Plus } from "lucide-react";
import { requirePageAdmin } from "@/lib/auth/page-guards";
import { getTranslator } from "@/lib/i18n/server";
import { listSeries } from "@/server/services/series";
import { Button } from "@/components/ui/button";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/surfaces";
import { SeriesActions } from "./series-actions";

export const metadata = { title: "Qualification series" };

export default async function SeriesPage() {
  await requirePageAdmin();
  const { t } = await getTranslator();
  const series = await listSeries();

  const newSeriesButton = (
    <Button asChild>
      <Link href="/series/new">
        <Plus aria-hidden />
        {t("series.newSeries")}
      </Link>
    </Button>
  );

  return (
    <>
      <PageHeader title={t("series.title")} description={t("series.subtitle")} actions={newSeriesButton} />

      {series.length === 0 ? (
        <EmptyState
          icon={<Award />}
          title={t("series.noSeries")}
          description={t("series.subtitle")}
          action={newSeriesButton}
        />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-hairline">
            {series.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <Link
                  href={`/series/${item.id}`}
                  className="min-w-0 flex-1 rounded-md transition-colors hover:text-primary"
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium">{item.name}</span>
                    <Badge tone={item.isPublished ? "success" : "neutral"}>
                      {item.isPublished ? t("series.published") : t("series.notPublished")}
                    </Badge>
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">
                    {t("series.championshipsCount", { count: item.championshipCount })}
                  </span>
                </Link>
                <SeriesActions
                  seriesId={item.id}
                  seriesName={item.name}
                  isPublished={item.isPublished}
                />
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
