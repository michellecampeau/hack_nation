"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const appLinks = [
  { href: "/", label: "Home" },
  { href: "/people", label: "People" },
  { href: "/rank", label: "Rank" },
  { href: "/compose", label: "Compose" },
];

export function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <nav className="border-b bg-background">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-semibold">
            Chief of Staff
          </Link>
          {!pathname?.startsWith("/auth") &&
            appLinks.map(({ href, label }) => (
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
        <div className="flex items-center gap-4">
          {session ? (
            <>
              <span className="text-sm text-muted-foreground">{session.user?.email}</span>
              <Button onClick={() => signOut()} variant="outline" size="sm">
                Sign Out
              </Button>
            </>
          ) : (
            <Link href="/auth/signin">
              <Button variant="outline" size="sm">
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
