import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm">
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-4xl font-bold">Hack Nation</CardTitle>
            <CardDescription className="text-lg">
              Your hackathon project is ready to go!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">This project includes:</p>
            <ul className="list-inside list-disc space-y-2 text-muted-foreground">
              <li>Next.js 14 with App Router</li>
              <li>TypeScript for type safety</li>
              <li>TailwindCSS for styling</li>
              <li>Prisma ORM for database</li>
              <li>NextAuth.js for authentication</li>
              <li>Reusable UI components</li>
              <li>API routes ready to use</li>
            </ul>
            <div className="flex gap-4 pt-4">
              <Button>Get Started</Button>
              <Button variant="outline">Learn More</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
