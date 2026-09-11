"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CheckboxProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(
  ({ className, checked = false, onCheckedChange, disabled, id, ...props }, ref) => {
    return (
      <button
        type="button"
        role="checkbox"
        id={id}
        ref={ref}
        aria-checked={checked}
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled && onCheckedChange) {
            onCheckedChange(!checked);
          }
        }}
        className={cn(
          "peer h-4 w-4 shrink-0 rounded border ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-colors flex items-center justify-center cursor-pointer",
          checked
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-background border-input hover:border-primary/80",
          className
        )}
        {...props}
      >
        {checked && <Check className="h-3 w-3 stroke-[3]" />}
      </button>
    );
  }
);
Checkbox.displayName = "Checkbox";

export { Checkbox };
