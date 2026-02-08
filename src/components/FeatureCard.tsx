import Link from "next/link";
import { cn } from "@/lib/utils";

interface FeatureCardAction {
  label: string;
  to: string;
}

interface FeatureCardProps {
  title: string;
  description: string;
  action: FeatureCardAction;
  className?: string;
}

export function FeatureCard({ title, description, action, className }: FeatureCardProps) {
  return (
    <Link
      href={action.to}
      className={cn(
        "block rounded-lg border bg-card text-card-foreground shadow-sm transition-shadow hover:shadow-[0_1px_3px_rgba(0,0,0,0.1)]",
        "border-border",
        className
      )}
    >
      <div className="p-6">
        <h3 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span className="h-2 w-2 rounded-full bg-bridge-node-subtle" aria-hidden />
          {title}
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <div className="mt-4">
          <span
            className="inline-flex h-9 items-center rounded-md px-3 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {action.label}
          </span>
        </div>
      </div>
    </Link>
  );
}
