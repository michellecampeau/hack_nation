import Link from "next/link";
import { BridgeIcon } from "@/components/BridgeIcon";
import { FeatureCard } from "@/components/FeatureCard";

export default function Home() {
  return (
    <div className="space-y-14">
      <section className="animate-fade-in text-center">
        <BridgeIcon size={80} className="mx-auto text-bridge-node" />
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">Bridge</h1>
        <p className="mt-2 text-muted-foreground">
          Connections grounded in context and timing. Add nodes and details, find edges to reach out
          to, and extend outreach thoughtfully.
        </p>
      </section>
      <section className="grid animate-fade-in gap-6 md:grid-cols-3">
        <FeatureCard
          title="Nodes"
          description="Add and edit contacts, relationship state, and facts."
          action={{ label: "Open Nodes ›", to: "/people" }}
        />
        <FeatureCard
          title="Edges"
          description="See who to reach out to for a given goal or topic."
          action={{ label: "Find edges ›", to: "/rank" }}
        />
        <FeatureCard
          title="Extend"
          description="Generate a bio, connection points, and outreach message."
          action={{ label: "Extend message ›", to: "/compose" }}
        />
      </section>
    </div>
  );
}
