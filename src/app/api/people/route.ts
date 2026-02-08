import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureOrigin } from "@/lib/origin";
import { createPersonSchema } from "@/lib/schemas/chief-of-staff";
import { safeValidateData } from "@/lib/utils/validators";

function parseJsonArray(s: string | null): string[] | null {
  if (s == null || s === "") return null;
  try {
    const parsed = JSON.parse(s) as unknown;
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function personToJson(p: Record<string, unknown>) {
  const { tags, universities, interests, ...rest } = p;
  return {
    ...rest,
    tags: parseJsonArray(tags as string | null),
    universities: parseJsonArray(universities as string | null),
    interests: parseJsonArray(interests as string | null),
  };
}

export async function GET() {
  try {
    await ensureOrigin();
    const people = await prisma.person.findMany({
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { facts: true } } },
    });
    const origin = people.find((p) => p.isOrigin);
    const originNameNorm = (origin?.name ?? "").toLowerCase().trim();
    const filtered = originNameNorm
      ? people.filter((p) => {
          if (p.isOrigin) return true;
          return (p.name ?? "").toLowerCase().trim() !== originNameNorm;
        })
      : people;
    return NextResponse.json({
      data: filtered.map((p) => {
        const { _count, ...rest } = p;
        return { ...personToJson(rest), factCount: _count?.facts ?? 0 };
      }),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = safeValidateData(createPersonSchema, body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const data = parsed.data;
    const person = await prisma.person.create({
      data: {
        name: data.name,
        isOrigin: false,
        primaryEmail: data.primaryEmail === "" ? null : data.primaryEmail ?? null,
        phone: data.phone ?? null,
        organization: data.organization ?? null,
        role: data.role ?? null,
        tags: data.tags?.length ? JSON.stringify(data.tags) : null,
        relationshipState: data.relationshipState ?? "ok",
        lastContacted: data.lastContacted ? new Date(data.lastContacted) : null,
        notes: data.notes ?? null,
        hometown: data.hometown ?? null,
        birthday: data.birthday ?? null,
        venmo: data.venmo ?? null,
        universities: data.universities?.length ? JSON.stringify(data.universities) : null,
        interests: data.interests?.length ? JSON.stringify(data.interests) : null,
        userId: data.userId ?? null,
      },
    });
    return NextResponse.json({ data: personToJson(person) }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await prisma.person.deleteMany({ where: { isOrigin: false } });
    return NextResponse.json({ deleted: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
