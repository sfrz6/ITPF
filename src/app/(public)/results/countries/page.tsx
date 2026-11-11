import type { Metadata } from "next";
import { Flag } from "lucide-react";
import { CountryDirectory } from "@/components/results/country-directory";
import { EmptyState, PageHeader } from "@/components/ui/surfaces";
import { getTranslator } from "@/lib/i18n/server";
import { listCountriesWithPublishedChampionships } from "@/server/services/public-countries";

export const metadata: Metadata = {
  title: "Countries",
  description: "Every country that has taken part in an ITPF championship.",
  robots: { index: true, follow: true },
};

/** Same cadence as the results index: see `(public)/results/page.tsx`. */
export const revalidate = 30;

export default async function PublicCountriesIndexPage() {
  const { locale, t } = await getTranslator();
  const countriesList = await listCountriesWithPublishedChampionships(locale);

  return (
    <>
      <PageHeader title={t("publicCountries.title")} description={t("publicCountries.subtitle")} />

      {countriesList.length === 0 ? (
        <EmptyState icon={<Flag />} title={t("publicCountries.noCountriesYet")} />
      ) : (
        <CountryDirectory
          entries={countriesList.map((country) => ({
            id: country.id,
            iso2: country.iso2,
            name: country.name,
            href: `/results/countries/${country.iso2.toLowerCase()}`,
            countLabel: t("publicCountries.championshipsCount", { count: country.championshipCount }),
          }))}
          searchLabel={t("publicCountries.search")}
          searchPlaceholder={t("publicCountries.searchPlaceholder")}
          noMatchesLabel={t("publicCountries.noMatches")}
        />
      )}
    </>
  );
}
