import type { Metadata } from "next";
import Link from "next/link";
import { Flag } from "lucide-react";
import { CountryLabel } from "@/components/common/country-flag";
import { Card, EmptyState, PageHeader } from "@/components/ui/surfaces";
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
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {countriesList.map((country) => (
            <li key={country.id}>
              <Link href={`/results/countries/${country.iso2.toLowerCase()}`} className="block h-full">
                <Card className="flex h-full items-center gap-3 p-4 transition-colors hover:border-border-strong">
                  <CountryLabel iso2={country.iso2} name={country.name} size="lg" />
                  <span className="ms-auto shrink-0 text-xs text-muted">
                    {t("publicCountries.championshipsCount", { count: country.championshipCount })}
                  </span>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
