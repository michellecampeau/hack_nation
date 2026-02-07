"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const { data: session } = useSession();

  return (
    <nav className="border-b">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold">
          Hack Nation
        </Link>
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
