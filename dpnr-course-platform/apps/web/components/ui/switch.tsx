import * as React from "react";
import { cn } from "../../lib/utils";

export interface SwitchProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ className, checked = false, onCheckedChange, disabled, ...props }, ref) => {
    function toggle() {
      if (disabled) return;
      onCheckedChange?.(!checked);
    }
    function onKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    }
    return (
      <button
        type="button"
        ref={ref}
        role="switch"
        aria-checked={checked}
        aria-disabled={disabled}
        aria-label={props["aria-label"] || "Toggle"}
        onClick={toggle}
        onKeyDown={onKeyDown}
        className={cn(
          "relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full border border-input transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ring-offset-background",
          checked ? "bg-primary" : "bg-muted",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        {...props}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-6 w-6 transform rounded-full shadow transition border border-black/10 dark:border-white/10",
            "bg-white dark:bg-foreground",
            checked ? "translate-x-7" : "translate-x-1"
          )}
        />
      </button>
    );
  }
);
Switch.displayName = "Switch";

export default Switch;
