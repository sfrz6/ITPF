import { notFound } from "next/navigation";
import { requirePageUser } from "@/lib/auth/page-guards";
import { hasPermission } from "@/domain/permissions";
import { getChampionshipDetail } from "@/server/services/championships";
import { ChampionshipSettings } from "./championship-settings";
import { ScheduleDays } from "./schedule-days";

export default async function ChampionshipSchedulePage({
  params,
}: {
  params: Promise<{ championshipId: string }>;
}) {
  const principal = await requirePageUser();
  const { championshipId } = await params;

  const championship = await getChampionshipDetail(championshipId);
  if (!championship) notFound();

  const canEdit = hasPermission(principal, "EDIT_CHAMPIONSHIP");
  const canPublish = hasPermission(principal, "MANAGE_PUBLIC_RESULTS");
  const canReview = hasPermission(principal, "CONFIRM_RUNS");

  return (
    <div className="space-y-5">
      {canEdit || canPublish ? (
        <ChampionshipSettings
          championship={{
            id: championship.id,
            name: championship.name,
            nameAr: championship.nameAr,
            startDate: championship.startDate,
            location: championship.location,
            locationAr: championship.locationAr,
            organizer: championship.organizer,
            organizerAr: championship.organizerAr,
            status: championship.status,
            isPublished: championship.isPublished,
            slug: championship.slug,
            hasChampionshipLogo: championship.hasChampionshipLogo,
          }}
          canEdit={canEdit}
          canPublish={canPublish}
        />
      ) : null}

      <ScheduleDays
        days={championship.days.map((day) => ({
          id: day.id,
          dayNumber: day.dayNumber,
          competitionDate: day.competitionDate,
          displaySettings: day.displaySettings,
          events: day.events.map((event) => ({
            id: event.id,
            eventType: event.eventType,
            needsReview: event.needsReview,
            reviewedAt: event.reviewedAt,
            runs: event.runs.map((runItem) => ({
              id: runItem.id,
              runNumber: runItem.runNumber,
              pegSizeCm: runItem.pegSizeCm,
              timeLimitSeconds: runItem.timeLimitSeconds,
              status: runItem.status,
            })),
          })),
        }))}
        championshipId={championship.id}
        championshipSlug={championship.slug}
        isPublished={championship.isPublished}
        canEdit={canEdit}
        canReview={canReview}
        isAdmin={principal.isAdmin}
      />
    </div>
  );
}
