import type { Metadata } from "next";
import { Users } from "lucide-react";
import { CountryDirectory } from "@/components/results/country-directory";
import { EmptyState, PageHeader } from "@/components/ui/surfaces";
import { getTranslator } from "@/lib/i18n/server";
import { listCountriesWithPublishedRiders } from "@/server/services/public-countries";

export const metadata: Metadata = {
  title: "Athletes",
  description: "Every country with an athlete who has taken part in an ITPF championship.",
  robots: { index: true, follow: true },
};

/** Same cadence as the results index: see `(public)/results/page.tsx`. */
export const revalidate = 30;

export default async function PublicRidersIndexPage() {
  const { locale, t } = await getTranslator();
  const countriesList = await listCountriesWithPublishedRiders(locale);

  return (
    <>
      <PageHeader title={t("publicRiders.title")} description={t("publicRiders.subtitle")} />

      {countriesList.length === 0 ? (
        <EmptyState icon={<Users />} title={t("publicRiders.noCountriesYet")} />
      ) : (
        <CountryDirectory
          entries={countriesList.map((country) => ({
            id: country.id,
            iso2: country.iso2,
            name: country.name,
            href: `/results/countries/${country.iso2.toLowerCase()}?tab=athletes`,
            countLabel: t("publicRiders.ridersCount", { count: country.riderCount }),
          }))}
          searchLabel={t("publicRiders.search")}
          searchPlaceholder={t("publicRiders.searchPlaceholder")}
          noMatchesLabel={t("publicRiders.noMatches")}
        />
      )}
    </>
  );
}
