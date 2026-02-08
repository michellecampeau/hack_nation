"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BridgeIcon } from "@/components/BridgeIcon";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/origin", label: "Origin" },
  { href: "/people", label: "Nodes" },
  { href: "/rank", label: "Edges" },
  { href: "/compose", label: "Extend" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-border bg-background">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-12 px-6 md:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 text-foreground transition-opacity hover:opacity-80"
          aria-label="Bridge home"
        >
          <BridgeIcon size={28} className="text-bridge-node" />
          <span className="text-lg font-semibold tracking-tight">Bridge</span>
        </Link>
        <div className="flex flex-1 items-center justify-end gap-6">
          {navItems.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "text-sm font-medium transition-colors",
                pathname === href || (href !== "/" && pathname?.startsWith(href))
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
