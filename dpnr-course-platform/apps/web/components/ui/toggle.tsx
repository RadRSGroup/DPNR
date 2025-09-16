import * as React from "react";
import { cn } from "../../lib/utils";

export interface ToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  pressed?: boolean;
}

export const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
  ({ className, pressed = false, children, ...props }, ref) => {
    return (
      <button
        aria-pressed={pressed}
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background",
          pressed
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "border border-input bg-transparent hover:bg-muted",
          "h-9 px-3",
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Toggle.displayName = "Toggle";

export default Toggle;

