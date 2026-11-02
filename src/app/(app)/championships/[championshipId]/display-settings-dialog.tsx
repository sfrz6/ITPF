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
import type { MessageKey } from "@/lib/i18n";
import { updateDisplaySettingsAction } from "@/server/actions/display-settings";
import {
  DEFAULT_PHASE_DURATION_SECONDS,
  DISPLAY_PHASES,
  MAX_PHASE_DURATION_SECONDS,
  MIN_PHASE_DURATION_SECONDS,
  type DisplayPhase,
  type DisplaySettings,
} from "@/domain/display/settings";

const PHASE_LABEL_KEY: Record<DisplayPhase, MessageKey> = {
  topCountries: "display.topCountries",
  topRiders: "display.topRiders",
  fullCountries: "display.countryRanking",
  fullRiders: "display.individualRanking",
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

  const [enabled, setEnabled] = React.useState<Record<DisplayPhase, boolean>>(() =>
    Object.fromEntries(
      DISPLAY_PHASES.map((phase) => [phase, settings.phases.includes(phase)]),
    ) as Record<DisplayPhase, boolean>,
  );
  const [durations, setDurations] = React.useState<Record<DisplayPhase, number>>(() =>
    Object.fromEntries(
      DISPLAY_PHASES.map((phase) => [
        phase,
        settings.durationsSeconds[phase] ?? DEFAULT_PHASE_DURATION_SECONDS,
      ]),
    ) as Record<DisplayPhase, number>,
  );
  const [pausedOnPhase, setPausedOnPhase] = React.useState<DisplayPhase | "">(
    settings.pausedOnPhase ?? "",
  );

  // Pausing on a phase the operator just unchecked would pin the board to a
  // layout that no longer shows — clear it instead of leaving it dangling.
  function setPhaseEnabled(phase: DisplayPhase, value: boolean) {
    setEnabled((previous) => ({ ...previous, [phase]: value }));
    if (!value && pausedOnPhase === phase) setPausedOnPhase("");
  }

  const enabledPhases = DISPLAY_PHASES.filter((phase) => enabled[phase]);

  function save(event: React.FormEvent) {
    event.preventDefault();
    if (enabledPhases.length === 0) {
      toast.error(t("championships.displaySettingsSelectOne"));
      return;
    }
    startTransition(async () => {
      const result = await updateDisplaySettingsAction({
        championshipDayId,
        phases: enabledPhases,
        durationsSeconds: Object.fromEntries(enabledPhases.map((phase) => [phase, durations[phase]])),
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
              {DISPLAY_PHASES.map((phase) => (
                <div key={phase} className="flex items-center gap-3">
                  <Checkbox
                    id={`phase-${phase}`}
                    checked={enabled[phase]}
                    onCheckedChange={(checked) => setPhaseEnabled(phase, checked === true)}
                  />
                  <Label htmlFor={`phase-${phase}`} className="min-w-0 flex-1 font-normal">
                    {t(PHASE_LABEL_KEY[phase])}
                  </Label>
                  <Input
                    type="number"
                    min={MIN_PHASE_DURATION_SECONDS}
                    max={MAX_PHASE_DURATION_SECONDS}
                    value={durations[phase]}
                    disabled={!enabled[phase]}
                    onChange={(event) =>
                      setDurations((previous) => ({
                        ...previous,
                        [phase]: Number(event.target.value) || DEFAULT_PHASE_DURATION_SECONDS,
                      }))
                    }
                    className="w-20 shrink-0"
                    aria-label={t("championships.displaySettingsDuration")}
                  />
                  <span className="shrink-0 text-xs text-muted">{t("common.seconds")}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-3">
              <Label htmlFor="display-pause" className="mb-1.5 block">
                {t("championships.displaySettingsPause")}
              </Label>
              <Select
                id="display-pause"
                value={pausedOnPhase}
                onChange={(event) => setPausedOnPhase(event.target.value as DisplayPhase | "")}
              >
                <option value="">{t("championships.displaySettingsAutoRotate")}</option>
                {enabledPhases.map((phase) => (
                  <option key={phase} value={phase}>
                    {t(PHASE_LABEL_KEY[phase])}
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
