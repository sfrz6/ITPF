"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ExternalLink, Eye, EyeOff, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form-controls";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/surfaces";
import { LogoField, type LogoValue } from "@/components/common/logo-field";
import { useI18n } from "@/lib/i18n/client";
import {
  setChampionshipPublishedAction,
  updateChampionshipAction,
  updateChampionshipLogoAction,
} from "@/server/actions/championships";

export interface ChampionshipSettingsData {
  readonly id: string;
  readonly name: string;
  readonly nameAr: string | null;
  readonly startDate: string;
  readonly location: string;
  readonly locationAr: string | null;
  readonly organizer: string | null;
  readonly organizerAr: string | null;
  readonly status: "DRAFT" | "ACTIVE" | "COMPLETED";
  readonly isPublished: boolean;
  readonly slug: string;
  readonly hasChampionshipLogo: boolean;
}

/**
 * Stands in for the existing logo until it's actually touched: the preview
 * points straight at the real image endpoint, but carries no real image
 * bytes, since those never need to leave the server unless the official
 * replaces them. `logoTouched` is what actually gates whether `save` sends a
 * logo update at all — this placeholder must never be submitted as-is.
 */
function existingLogoValue(championship: ChampionshipSettingsData): LogoValue | null {
  if (!championship.hasChampionshipLogo) return null;
  return {
    data: "",
    contentType: "image/png",
    previewUrl: `/api/championships/${championship.id}/logo/championship`,
  };
}

export function ChampionshipSettings({
  championship,
  canEdit,
  canPublish,
}: {
  championship: ChampionshipSettingsData;
  canEdit: boolean;
  canPublish: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [form, setForm] = React.useState({
    name: championship.name,
    nameAr: championship.nameAr ?? "",
    startDate: championship.startDate,
    location: championship.location,
    locationAr: championship.locationAr ?? "",
    organizer: championship.organizer ?? "",
    organizerAr: championship.organizerAr ?? "",
    status: championship.status,
  });
  const [logo, setLogo] = React.useState<LogoValue | null>(() => existingLogoValue(championship));
  const [logoTouched, setLogoTouched] = React.useState(false);

  function save(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await updateChampionshipAction({
        championshipId: championship.id,
        name: form.name.trim(),
        nameAr: form.nameAr.trim() || null,
        startDate: form.startDate,
        location: form.location.trim(),
        locationAr: form.locationAr.trim() || null,
        organizer: form.organizer.trim() || null,
        organizerAr: form.organizerAr.trim() || null,
        status: form.status,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      // Only sent when the official actually touched the logo field: this
      // keeps a plain text edit from ever re-sending (or clearing) a logo
      // the official never meant to change.
      if (logoTouched) {
        const logoResult = await updateChampionshipLogoAction({
          championshipId: championship.id,
          championshipLogo: logo ? { data: logo.data, contentType: logo.contentType } : null,
        });
        if (!logoResult.ok) {
          toast.error(logoResult.error);
          return;
        }
        setLogoTouched(false);
      }

      setEditing(false);
      toast.success(t("championships.updatedSuccess"));
      router.refresh();
    });
  }

  function togglePublished() {
    startTransition(async () => {
      const result = await setChampionshipPublishedAction({
        championshipId: championship.id,
        published: !championship.isPublished,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(t("championships.updatedSuccess"));
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("championships.overview")}</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          {championship.isPublished ? (
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/results/${championship.slug}`} target="_blank" rel="noreferrer">
                <ExternalLink aria-hidden />
                {t("publicResults.viewResults")}
              </Link>
            </Button>
          ) : null}
          {canPublish ? (
            <Button variant="secondary" size="sm" loading={pending} onClick={togglePublished}>
              {championship.isPublished ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
              {championship.isPublished
                ? t("championships.unpublish")
                : t("championships.publish")}
            </Button>
          ) : null}
          {canEdit && !editing ? (
            <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
              <Pencil aria-hidden />
              {t("common.edit")}
            </Button>
          ) : null}
        </div>
      </CardHeader>

      {editing ? (
        <CardContent>
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            <Field label={t("championships.championshipName")} htmlFor="ch-name" required>
              <Input
                id="ch-name"
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                maxLength={160}
                required
              />
            </Field>
            <Field label={t("championships.championshipNameAr")} htmlFor="ch-name-ar">
              <Input
                id="ch-name-ar"
                dir="rtl"
                value={form.nameAr}
                onChange={(event) => setForm({ ...form, nameAr: event.target.value })}
                maxLength={160}
              />
            </Field>
            <Field
              label={t("championships.startDate")}
              htmlFor="ch-start-date"
              hint={t("championships.startDateEditHint")}
              required
            >
              <Input
                id="ch-start-date"
                type="date"
                value={form.startDate}
                onChange={(event) => setForm({ ...form, startDate: event.target.value })}
                required
              />
            </Field>
            <div className="hidden sm:block" aria-hidden />
            <Field label={t("championships.location")} htmlFor="ch-location" required>
              <Input
                id="ch-location"
                value={form.location}
                onChange={(event) => setForm({ ...form, location: event.target.value })}
                maxLength={160}
                required
              />
            </Field>
            <Field label={t("championships.locationAr")} htmlFor="ch-location-ar">
              <Input
                id="ch-location-ar"
                dir="rtl"
                value={form.locationAr}
                onChange={(event) => setForm({ ...form, locationAr: event.target.value })}
                maxLength={160}
              />
            </Field>
            <Field label={t("championships.organizer")} htmlFor="ch-organizer">
              <Input
                id="ch-organizer"
                value={form.organizer}
                onChange={(event) => setForm({ ...form, organizer: event.target.value })}
                maxLength={160}
              />
            </Field>
            <Field label={t("championships.organizerAr")} htmlFor="ch-organizer-ar">
              <Input
                id="ch-organizer-ar"
                dir="rtl"
                value={form.organizerAr}
                onChange={(event) => setForm({ ...form, organizerAr: event.target.value })}
                maxLength={160}
              />
            </Field>
            <div className="sm:col-span-2">
              <LogoField
                id="ch-logo"
                label={t("championships.championshipLogo")}
                value={logo}
                onChange={(value) => {
                  setLogo(value);
                  setLogoTouched(true);
                }}
                t={t}
              />
            </div>
            <Field label={t("common.status")} htmlFor="ch-status">
              <Select
                id="ch-status"
                value={form.status}
                onChange={(event) =>
                  setForm({
                    ...form,
                    status: event.target.value as ChampionshipSettingsData["status"],
                  })
                }
              >
                <option value="DRAFT">{t("championships.statusDraft")}</option>
                <option value="ACTIVE">{t("championships.statusActive")}</option>
                <option value="COMPLETED">{t("championships.statusCompleted")}</option>
              </Select>
            </Field>
            <div className="flex items-center gap-2 sm:col-span-2">
              <Button type="submit" loading={pending}>
                {t("common.save")}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
                {t("common.cancel")}
              </Button>
            </div>
          </form>
        </CardContent>
      ) : null}
    </Card>
  );
}
