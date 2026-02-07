import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPersonSchema } from "@/lib/schemas/chief-of-staff";
import { safeValidateData } from "@/lib/utils/validators";

function parseTags(tags: string | null): string[] | null {
  if (tags == null || tags === "") return null;
  try {
    const parsed = JSON.parse(tags) as unknown;
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function personToJson(p: { tags: string | null; [key: string]: unknown }) {
  const { tags, ...rest } = p;
  return { ...rest, tags: parseTags(tags) };
}

export async function GET() {
  try {
    const people = await prisma.person.findMany({
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { facts: true } } },
    });
    return NextResponse.json({
      data: people.map((p) => {
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
        primaryEmail: data.primaryEmail === "" ? null : data.primaryEmail ?? null,
        phone: data.phone ?? null,
        organization: data.organization ?? null,
        role: data.role ?? null,
        tags: data.tags ? JSON.stringify(data.tags) : null,
        relationshipState: data.relationshipState ?? "ok",
        lastContacted: data.lastContacted
          ? new Date(data.lastContacted)
          : null,
        notes: data.notes ?? null,
        userId: data.userId ?? null,
      },
    });
    return NextResponse.json({ data: personToJson(person) }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
