import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-all duration-200 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
          variant === "primary" &&
            "bg-primary text-primary-foreground hover:bg-primary-light shadow-sm hover:shadow-md active:scale-[0.98]",
          variant === "secondary" &&
            "bg-accent text-accent-foreground hover:bg-accent/80",
          variant === "outline" &&
            "border border-border-strong text-foreground hover:bg-accent",
          variant === "ghost" &&
            "text-foreground hover:bg-accent",
          size === "sm" && "h-9 px-3.5 text-sm",
          size === "md" && "h-11 px-5 text-sm",
          size === "lg" && "h-12 px-6 text-base",
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
