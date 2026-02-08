import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageLayoutProps {
  children: ReactNode;
  className?: string;
}

export function PageLayout({ children, className }: PageLayoutProps) {
  return (
    <div className={cn("mx-auto max-w-4xl px-6 py-10 md:px-8 md:py-14", className)}>
      {children}
    </div>
  );
}
