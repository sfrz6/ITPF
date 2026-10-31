import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { requirePageAdmin } from "@/lib/auth/page-guards";
import { getTranslator } from "@/lib/i18n/server";
import { PageHeader } from "@/components/ui/surfaces";
import { listChampionships } from "@/server/services/championships";
import { getSeriesForEdit } from "@/server/services/series";
import { SeriesEditor } from "../series-editor";

export const metadata = { title: "Edit qualification series" };

export default async function EditSeriesPage({
  params,
}: {
  params: Promise<{ seriesId: string }>;
}) {
  await requirePageAdmin();
  const { seriesId } = await params;
  const { locale, t } = await getTranslator();

  const [series, championships] = await Promise.all([
    getSeriesForEdit(seriesId),
    listChampionships({ publishedOnly: true }),
  ]);
  if (!series) notFound();

  return (
    <>
      <PageHeader
        breadcrumb={
          <Link href="/series" className="inline-flex items-center gap-1 hover:text-foreground">
            <ChevronLeft className="size-3.5 rtl:rotate-180" aria-hidden />
            {t("series.title")}
          </Link>
        }
        title={series.name}
      />

      <SeriesEditor
        mode="edit"
        series={series}
        availableChampionships={championships}
        locale={locale}
      />
    </>
  );
}
