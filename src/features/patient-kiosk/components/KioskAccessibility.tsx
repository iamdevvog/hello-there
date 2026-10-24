import { Accessibility, Eye, Minus, MoveHorizontal, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useKiosk } from "@/features/patient-kiosk/kiosk-context";
import { useKioskAccessibility } from "@/features/patient-kiosk/use-kiosk-accessibility";
import { KioskText } from "./KioskText";
import { ReadAloudToggle, SpeechControls } from "@/components/a11y";
import { cn } from "@/lib/utils";

/** Working text-size, contrast and motion controls for the kiosk. */
export function KioskAccessibility() {
  const { t } = useKiosk();
  const a11y = useKioskAccessibility();

  const toggleRow = (
    label: string,
    icon: typeof Eye,
    checked: boolean,
    set: (v: boolean) => void,
  ) => {
    const Icon = icon;
    return (
      <Button variant="ghost"
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => set(!checked)}
        className="flex min-h-14 w-full items-center justify-between gap-4 rounded-2xl border border-border bg-background px-4 text-left text-base font-semibold transition-colors hover:bg-muted"
      >
        <span className="flex items-center gap-3">
          <Icon aria-hidden="true" className="size-5 text-primary" />
          {label}
        </span>
        <span
          aria-hidden="true"
          className={cn(
            "grid h-7 w-12 shrink-0 items-center rounded-full px-1 transition-colors",
            checked ? "bg-primary" : "bg-muted",
          )}
        >
          <span
            className={cn(
              "size-5 rounded-full bg-background shadow-sm transition-transform",
              checked ? "translate-x-5" : "translate-x-0",
            )}
          />
        </span>
      </Button>
    );
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
      <Button variant="ghost"
        type="button"
        aria-label={t("kiosk.a11y.button")}
        className="inline-flex min-h-14 items-center gap-2.5 rounded-full border border-border bg-surface px-5 text-base font-semibold transition-colors hover:bg-muted"
      >
        <Accessibility aria-hidden="true" className="size-5" />
        <span className="hidden sm:inline">{t("kiosk.a11y.button")}</span>
      </Button>
      </PopoverTrigger>
        <PopoverContent align="end" sideOffset={12} collisionPadding={12}
          aria-label={t("kiosk.a11y.title")}
          className="surface-panel w-[19rem] max-w-[calc(100vw-1.5rem)] max-h-[var(--radix-popover-content-available-height)] overflow-y-auto overscroll-contain rounded-3xl p-5"
        >
          <KioskText
            tkey="kiosk.a11y.title"
            className="text-lg font-semibold"
            secondaryClassName="text-sm"
          />

          <div className="mt-5">
            <ReadAloudToggle className="min-h-14 w-full justify-center text-base" />
            <SpeechControls />
          </div>

          <p className="mt-5 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t("kiosk.a11y.textSize")}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <Button variant="ghost"
              type="button"
              onClick={a11y.shrink}
              disabled={!a11y.canShrink}
              aria-label={t("kiosk.a11y.smaller")}
              className="grid size-14 place-items-center rounded-2xl border border-border bg-background transition-colors hover:bg-muted disabled:opacity-40"
            >
              <Minus aria-hidden="true" className="size-5" />
            </Button>
            <span
              aria-hidden="true"
              className="grid h-14 flex-1 place-items-center rounded-2xl bg-muted text-base font-semibold"
            >
              <MoveHorizontal className="size-5" />
            </span>
            <Button variant="ghost"
              type="button"
              onClick={a11y.grow}
              disabled={!a11y.canGrow}
              aria-label={t("kiosk.a11y.bigger")}
              className="grid size-14 place-items-center rounded-2xl border border-border bg-background transition-colors hover:bg-muted disabled:opacity-40"
            >
              <Plus aria-hidden="true" className="size-5" />
            </Button>
          </div>

          <div className="mt-3 space-y-2">
            {toggleRow(t("kiosk.a11y.contrast"), Eye, a11y.highContrast, a11y.setHighContrast)}
            {toggleRow(
              t("kiosk.a11y.motion"),
              MoveHorizontal,
              a11y.reduceMotion,
              a11y.setReduceMotion,
            )}
          </div>

          <Button variant="ghost"
            type="button"
            onClick={a11y.reset}
            className="mt-4 min-h-12 w-full rounded-full border border-border text-base font-semibold transition-colors hover:bg-muted"
          >
            {t("kiosk.a11y.reset")}
          </Button>
        </PopoverContent>
    </Popover>
  );
}
