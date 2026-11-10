import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { CountryFlag } from "@/components/common/country-flag";
import { getTranslator } from "@/lib/i18n/server";
import {
  getCountryRiderResults,
  getPublicCountryByIso2,
  listCountriesWithPublishedRiders,
} from "@/server/services/public-countries";
import { CountryRiderTable } from "./country-rider-table";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ iso2: string }>;
}): Promise<Metadata> {
  const { iso2 } = await params;
  const { locale } = await getTranslator();
  const country = await getPublicCountryByIso2(iso2, locale);
  if (!country) return { title: "Athletes" };
  return {
    title: `${country.name} — Athletes`,
    description: `Combined athlete results for ${country.name}.`,
    robots: { index: true, follow: true },
  };
}

export default async function PublicCountryRidersPage({
  params,
}: {
  params: Promise<{ iso2: string }>;
}) {
  const { iso2 } = await params;
  const { locale, t } = await getTranslator();

  const country = await getPublicCountryByIso2(iso2, locale);
  if (!country) notFound();

  // Only a country that actually has a rider in a published championship
  // gets a page — matches the directory above it, which already drops any
  // country with none.
  const countriesList = await listCountriesWithPublishedRiders(locale);
  if (!countriesList.some((entry) => entry.id === country.id)) notFound();

  const rows = await getCountryRiderResults(country.id, locale);

  return (
    <div className="space-y-6">
      <Link
        href="/results/riders"
        className="inline-flex items-center gap-1 text-sm font-medium text-foreground hover:text-primary"
      >
        <ChevronLeft className="size-4 rtl:rotate-180" aria-hidden />
        {t("publicRiders.backToAthletes")}
      </Link>

      <header className="flex items-center gap-4">
        <CountryFlag iso2={country.iso2} name={country.name} size="lg" className="h-10 w-14" />
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{country.name}</h1>
      </header>

      <CountryRiderTable rows={rows} />
    </div>
  );
}
