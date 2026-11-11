"use client";

import * as React from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/client";
import { MobileNavDrawer } from "@/components/layout/mobile-nav-drawer";

/**
 * The header's own opener for `MobileNavDrawer`. The bottom tab bar's "More"
 * tab (`PublicBottomNav`) opens the same drawer independently, each managing
 * its own open state and restoring focus to its own trigger on close.
 */
export function PublicMobileNav() {
  const { t } = useI18n();
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  return (
    <div className="md:hidden">
      <Button
        ref={triggerRef}
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label={t("nav.mainMenu")}
        aria-expanded={open}
        className="size-11 [&_svg]:size-6"
      >
        <Menu strokeWidth={2.5} aria-hidden />
      </Button>
      <MobileNavDrawer
        open={open}
        onClose={() => {
          setOpen(false);
          triggerRef.current?.focus();
        }}
      />
    </div>
  );
}
