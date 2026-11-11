import Link from "next/link";
import { SearchX } from "lucide-react";
import { getTranslator } from "@/lib/i18n/server";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/surfaces";

export const metadata = { title: "Page not found" };

/**
 * Covers every `notFound()` call under the public group (an unpublished or
 * unknown championship slug, country, or rider), plus any other unmatched
 * public URL, with the federation's own branded empty state instead of
 * Next.js's default page, which carries no locale, direction or styling.
 */
export default async function PublicNotFoundPage() {
  const { t } = await getTranslator();

  return (
    <EmptyState
      icon={<SearchX />}
      title={t("common.notFoundTitle")}
      description={t("common.notFoundBody")}
      action={
        <Button asChild variant="secondary">
          <Link href="/">{t("nav.home")}</Link>
        </Button>
      }
      className="mt-10"
    />
  );
}
