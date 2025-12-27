import { forwardRef, ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <button
        className={cn(
          // Base styles
          "inline-flex items-center justify-center whitespace-nowrap font-[family-name:var(--font-syne)] font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
          // Variants
          {
            // Primary - silver accent
            "bg-primary text-primary-foreground rounded-xl shadow-[0_4px_16px_rgba(196,206,228,0.25)] hover:brightness-110 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(196,206,228,0.35)]":
              variant === "default",
            // Secondary - elevated surface
            "bg-elevated text-foreground rounded-xl hover:bg-card-hover":
              variant === "secondary",
            // Outline
            "border border-border-medium bg-transparent rounded-xl hover:bg-secondary":
              variant === "outline",
            // Ghost
            "hover:bg-secondary rounded-lg": variant === "ghost",
          },
          // Sizes
          {
            "h-12 px-6 text-base": size === "default",
            "h-10 px-4 text-sm": size === "sm",
            "h-14 px-8 text-lg": size === "lg",
            "h-10 w-10 rounded-lg": size === "icon",
          },
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
