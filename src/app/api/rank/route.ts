import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rankRequestSchema } from "@/lib/schemas/chief-of-staff";
import { safeValidateData } from "@/lib/utils/validators";
import { rankPeople } from "@/lib/ranking/rank";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = safeValidateData(rankRequestSchema, body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { query, relationshipState: filterState, tags: filterTags } = parsed.data;

    const people = await prisma.person.findMany({
      where: filterState ? { relationshipState: filterState } : undefined,
      include: { facts: true },
    });

    const filtered =
      filterTags && filterTags.length > 0
        ? people.filter((p) => {
            try {
              const tags = p.tags ? (JSON.parse(p.tags) as string[]) : [];
              return filterTags.some((t) => tags.includes(t));
            } catch {
              return false;
            }
          })
        : people;

    const peopleWithFacts = filtered.map((p) => ({
      id: p.id,
      name: p.name,
      relationshipState: p.relationshipState,
      lastContacted: p.lastContacted,
      facts: p.facts.map((f) => ({ type: f.type, value: f.value })),
    }));

    const ranked = rankPeople(peopleWithFacts, query);
    return NextResponse.json({ ranked, query });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
