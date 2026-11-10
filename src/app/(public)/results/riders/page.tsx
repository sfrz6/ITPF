import type { Metadata } from "next";
import Link from "next/link";
import { Users } from "lucide-react";
import { CountryLabel } from "@/components/common/country-flag";
import { Card, EmptyState, PageHeader } from "@/components/ui/surfaces";
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
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {countriesList.map((country) => (
            <li key={country.id}>
              <Link href={`/results/riders/${country.iso2.toLowerCase()}`} className="block h-full">
                <Card className="flex h-full items-center gap-3 p-4 transition-colors hover:border-border-strong">
                  <CountryLabel iso2={country.iso2} name={country.name} size="lg" />
                  <span className="ms-auto shrink-0 text-xs text-muted">
                    {t("publicRiders.ridersCount", { count: country.riderCount })}
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
