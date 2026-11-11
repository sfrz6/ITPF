"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Settings } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox, Input, Label, Select } from "@/components/ui/form-controls";
import { useI18n } from "@/lib/i18n/client";
import { createTranslator, getDictionary, type MessageKey } from "@/lib/i18n";
import { LOCALE_LABELS } from "@/lib/i18n/config";
import { updateDisplaySettingsAction } from "@/server/actions/display-settings";
import {
  ALL_PHASES,
  DEFAULT_PHASE_DURATION_SECONDS,
  MAX_PHASE_DURATION_SECONDS,
  MIN_PHASE_DURATION_SECONDS,
  phaseId,
  type DisplayLayout,
  type DisplayPhase,
  type DisplaySettings,
} from "@/domain/display/settings";

const LAYOUT_LABEL_KEY: Record<DisplayLayout, MessageKey> = {
  topCountries: "display.topCountries",
  topRiders: "display.topRiders",
  fullCountries: "display.countryRanking",
  fullRiders: "display.individualRanking",
  overall: "display.overallStandings",
  qr: "display.qrCode",
};

export function DisplaySettingsDialog({
  championshipDayId,
  dayNumber,
  settings,
}: {
  championshipDayId: string;
  dayNumber: number;
  settings: DisplaySettings;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  const enabledIds = new Set(settings.phases.map(phaseId));
  const [enabled, setEnabled] = React.useState<Record<string, boolean>>(() =>
    Object.fromEntries(ALL_PHASES.map((phase) => [phaseId(phase), enabledIds.has(phaseId(phase))])),
  );
  const [durations, setDurations] = React.useState<Record<string, number>>(() =>
    Object.fromEntries(
      ALL_PHASES.map((phase) => [
        phaseId(phase),
        settings.durationsSeconds[phaseId(phase)] ?? DEFAULT_PHASE_DURATION_SECONDS,
      ]),
    ),
  );
  const [pausedOnPhase, setPausedOnPhase] = React.useState<string>(settings.pausedOnPhase ?? "");

  // Pausing on a phase the operator just unchecked would pin the board to a
  // layout that no longer shows — clear it instead of leaving it dangling.
  function setPhaseEnabled(id: string, value: boolean) {
    setEnabled((previous) => ({ ...previous, [id]: value }));
    if (!value && pausedOnPhase === id) setPausedOnPhase("");
  }

  const enabledPhases = ALL_PHASES.filter((phase) => enabled[phaseId(phase)]);

  function save(event: React.FormEvent) {
    event.preventDefault();
    if (enabledPhases.length === 0) {
      toast.error(t("championships.displaySettingsSelectOne"));
      return;
    }
    startTransition(async () => {
      const result = await updateDisplaySettingsAction({
        championshipDayId,
        phases: enabledPhases.map((phase) => ({ layout: phase.layout, language: phase.language })),
        durationsSeconds: Object.fromEntries(
          enabledPhases.map((phase) => [phaseId(phase), durations[phaseId(phase)]]),
        ),
        pausedOnPhase: pausedOnPhase || null,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setOpen(false);
      toast.success(t("championships.displaySettingsSaved"));
      router.refresh();
    });
  }

  // The layout name is shown in *that phase's own language* — an Arabic
  // phase reads "أفضل 5 — الفرق" and an English phase reads "Top 5 — Teams"
  // — rather than always in whatever language the operator's own admin
  // session happens to be in, since the two phases are genuinely different
  // text the board will show, not the same text merely tagged by language.
  function phaseLabel(phase: DisplayPhase): string {
    const phaseT = createTranslator(getDictionary(phase.language));
    return `${phaseT(LAYOUT_LABEL_KEY[phase.layout])} — ${LOCALE_LABELS[phase.language]}`;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Settings aria-hidden />
          {t("championships.displaySettings")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t("championships.displaySettingsTitle", { day: dayNumber })}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={save}>
          <DialogBody className="space-y-4">
            <div className="space-y-2.5">
              {ALL_PHASES.map((phase) => {
                const id = phaseId(phase);
                return (
                  <div key={id} className="flex items-center gap-3">
                    <Checkbox
                      id={`phase-${id}`}
                      checked={enabled[id]}
                      onCheckedChange={(checked) => setPhaseEnabled(id, checked === true)}
                    />
                    <Label htmlFor={`phase-${id}`} className="min-w-0 flex-1 font-normal">
                      {phaseLabel(phase)}
                    </Label>
                    <Input
                      type="number"
                      min={MIN_PHASE_DURATION_SECONDS}
                      max={MAX_PHASE_DURATION_SECONDS}
                      value={durations[id]}
                      disabled={!enabled[id]}
                      onChange={(event) =>
                        setDurations((previous) => ({
                          ...previous,
                          [id]: Number(event.target.value) || DEFAULT_PHASE_DURATION_SECONDS,
                        }))
                      }
                      className="w-20 shrink-0"
                      aria-label={t("championships.displaySettingsDuration")}
                    />
                    <span className="shrink-0 text-xs text-muted">{t("common.seconds")}</span>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-border pt-3">
              <Label htmlFor="display-pause" className="mb-1.5 block">
                {t("championships.displaySettingsPause")}
              </Label>
              <Select
                id="display-pause"
                value={pausedOnPhase}
                onChange={(event) => setPausedOnPhase(event.target.value)}
              >
                <option value="">{t("championships.displaySettingsAutoRotate")}</option>
                {enabledPhases.map((phase) => (
                  <option key={phaseId(phase)} value={phaseId(phase)}>
                    {phaseLabel(phase)}
                  </option>
                ))}
              </Select>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" loading={pending}>
              {t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
