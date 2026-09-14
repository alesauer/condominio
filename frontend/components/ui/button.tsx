import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-xs hover:bg-primary-hover active:bg-primary-hover font-semibold",
        destructive:
          "bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90 font-semibold",
        outline:
          "border border-border-strong bg-background shadow-xs hover:bg-muted hover:text-foreground text-foreground",
        secondary:
          "bg-white border border-border-strong text-slate-700 shadow-xs hover:bg-slate-50 dark:bg-card dark:text-slate-200 dark:border-border dark:hover:bg-slate-800",
        ghost:
          "hover:bg-accent hover:text-accent-foreground text-muted-foreground hover:text-foreground",
        link:
          "text-primary underline-offset-4 hover:underline font-semibold",
        success:
          "bg-emerald-600 text-white shadow-xs hover:bg-emerald-700 font-semibold",
      },
      size: {
        default: "h-10 px-4 py-2 text-sm",
        sm: "h-8.5 rounded-md px-3 text-xs",
        lg: "h-11 rounded-lg px-6 text-base",
        icon: "h-9 w-9 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
