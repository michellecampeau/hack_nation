"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const appLinks = [
  { href: "/", label: "Home" },
  { href: "/people", label: "People" },
  { href: "/rank", label: "Rank" },
  { href: "/compose", label: "Compose" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="border-b bg-background">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        <Link href="/" className="text-lg font-semibold">
          Chief of Staff
        </Link>
        {appLinks.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
              pathname === href || (href !== "/" && pathname?.startsWith(href))
                ? "text-foreground"
                : ""
            )}
          >
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
