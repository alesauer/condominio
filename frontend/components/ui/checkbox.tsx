"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "checked"> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked = false, onCheckedChange, disabled, ...props }, ref) => {
    return (
      <span
        onClick={() => {
          if (!disabled && onCheckedChange) {
            onCheckedChange(!checked);
          }
        }}
        className={cn(
          "relative inline-flex items-center justify-center h-4 w-4 shrink-0 rounded-sm border ring-offset-background transition-colors select-none",
          checked
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-background border-input hover:border-primary/70",
          disabled ? "cursor-not-allowed opacity-50 border-muted-foreground/40" : "cursor-pointer",
          className
        )}
      >
        <input
          type="checkbox"
          ref={ref}
          checked={checked}
          disabled={disabled}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          className="sr-only"
          {...props}
        />
        {checked && <Check className="h-3 w-3 stroke-[3]" />}
      </span>
    );
  }
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
