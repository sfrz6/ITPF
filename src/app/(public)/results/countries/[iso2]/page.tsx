import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { CountryFlag } from "@/components/common/country-flag";
import { getTranslator } from "@/lib/i18n/server";
import { getCountryProfile, getPublicCountryByIso2 } from "@/server/services/public-countries";
import { CountryProfileTabs } from "./country-profile-tabs";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ iso2: string }>;
}): Promise<Metadata> {
  const { iso2 } = await params;
  const { locale } = await getTranslator();
  const country = await getPublicCountryByIso2(iso2, locale);
  if (!country) return { title: "Countries" };
  return {
    title: country.name,
    description: `ITPF championship history for ${country.name}.`,
    robots: { index: true, follow: true },
  };
}

export default async function PublicCountryProfilePage({
  params,
}: {
  params: Promise<{ iso2: string }>;
}) {
  const { iso2 } = await params;
  const { locale, t } = await getTranslator();

  const country = await getPublicCountryByIso2(iso2, locale);
  if (!country) notFound();

  const profile = await getCountryProfile(country.id, locale);
  if (profile.championshipCount === 0) notFound();

  return (
    <div className="space-y-5">
      <Link
        href="/results/countries"
        className="inline-flex items-center gap-1 text-sm font-medium text-foreground hover:text-primary"
      >
        <ChevronLeft className="size-4 rtl:rotate-180" aria-hidden />
        {t("publicCountries.allCountries")}
      </Link>

      {/* The banner photo (`public/brand/country-profile-banner.jpg`) sits
          behind a left-to-right dark fade, so the flag and name always read
          clearly on the left regardless of how wide the photo itself is —
          same treatment on every tab, since the hero sits above them all. */}
      <div
        className="relative overflow-hidden rounded-2xl bg-ink-950 bg-cover bg-center"
        style={{ backgroundImage: "url('/brand/country-profile-banner.jpg')" }}
      >
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, rgba(6,13,18,0.92) 0%, rgba(6,13,18,0.65) 45%, rgba(6,13,18,0.1) 80%)",
          }}
        />
        <div className="relative flex flex-wrap items-end gap-4 px-6 py-8 sm:px-8">
          <CountryFlag iso2={country.iso2} name={country.name} size="lg" className="h-12 w-16 shrink-0" />
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold text-white sm:text-3xl">{country.name}</h1>
            <p className="text-sm text-white/75">{t("publicCountries.heroSubtitle")}</p>
          </div>
        </div>
      </div>

      <Suspense fallback={null}>
        <CountryProfileTabs countryName={country.name} profile={profile} />
      </Suspense>
    </div>
  );
}
