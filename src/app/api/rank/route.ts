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
      where: {
        isOrigin: false,
        ...(filterState ? { relationshipState: filterState } : {}),
      },
      include: { facts: true },
    });

    const origin = await prisma.person.findFirst({
      where: { isOrigin: true },
      include: { facts: true },
    });
    const originFacts = origin?.facts ?? [];

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

    const peopleWithFacts = filtered.map((p) => {
      const parseJsonArray = (raw: string | null): string[] => {
        if (!raw?.trim()) return [];
        try {
          const arr = JSON.parse(raw) as unknown;
          return Array.isArray(arr) ? arr.map((x) => String(x).trim()).filter(Boolean) : [];
        } catch {
          return [];
        }
      };
      const interests = parseJsonArray(p.interests);
      const tags = parseJsonArray(p.tags);
      const universities = parseJsonArray(p.universities);
      const profileChunks: Array<{ label: string; text: string }> = [];
      if (interests.length) profileChunks.push({ label: "interests", text: interests.join(", ") });
      if (p.notes?.trim()) profileChunks.push({ label: "notes", text: p.notes.trim() });
      if (p.organization?.trim()) profileChunks.push({ label: "organization", text: p.organization.trim() });
      if (p.role?.trim()) profileChunks.push({ label: "role", text: p.role.trim() });
      if (p.hometown?.trim()) profileChunks.push({ label: "hometown", text: p.hometown.trim() });
      if (tags.length) profileChunks.push({ label: "tags", text: tags.join(", ") });
      if (universities.length) profileChunks.push({ label: "universities", text: universities.join(", ") });

      return {
        id: p.id,
        name: p.name,
        relationshipState: p.relationshipState,
        lastContacted: p.lastContacted,
        facts: p.facts.map((f) => ({ type: f.type, value: f.value })),
        profileChunks,
      };
    });

    const ranked = rankPeople(peopleWithFacts, query, originFacts.map((f) => ({ type: f.type, value: f.value })));
    return NextResponse.json({ ranked, query });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
