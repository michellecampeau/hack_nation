import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Chief of Staff</h1>
        <p className="mt-2 text-muted-foreground">
          A personal relationship assistant. Add people and facts, rank who to reach out to, and
          draft thoughtful outreach.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">People</CardTitle>
            <CardDescription>Add and edit contacts, relationship state, and facts.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/people">
              <Button>Open People</Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Rank</CardTitle>
            <CardDescription>See who to reach out to for a given goal or topic.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/rank">
              <Button variant="outline">Rank contacts</Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Compose</CardTitle>
            <CardDescription>
              Generate a bio, connection points, and outreach message.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/compose">
              <Button variant="outline">Compose message</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
