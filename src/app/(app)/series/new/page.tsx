import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requirePageAdmin } from "@/lib/auth/page-guards";
import { getTranslator } from "@/lib/i18n/server";
import { PageHeader } from "@/components/ui/surfaces";
import { listChampionships } from "@/server/services/championships";
import { SeriesEditor } from "../series-editor";

export const metadata = { title: "New qualification series" };

export default async function NewSeriesPage() {
  await requirePageAdmin();
  const { locale, t } = await getTranslator();
  const championships = await listChampionships({ publishedOnly: true });

  return (
    <>
      <PageHeader
        breadcrumb={
          <Link href="/series" className="inline-flex items-center gap-1 hover:text-foreground">
            <ChevronLeft className="size-3.5 rtl:rotate-180" aria-hidden />
            {t("series.title")}
          </Link>
        }
        title={t("series.newSeries")}
      />

      <SeriesEditor mode="create" availableChampionships={championships} locale={locale} />
    </>
  );
}
