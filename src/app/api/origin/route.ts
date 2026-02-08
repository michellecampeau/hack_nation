import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureOrigin } from "@/lib/origin";
import { originUpdateSchema } from "@/lib/schemas/chief-of-staff";
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

function personToJson(p: {
  id: string;
  name: string;
  primaryEmail: string | null;
  phone: string | null;
  organization: string | null;
  role: string | null;
  tags: string | null;
  relationshipState: string;
  lastContacted: Date | null;
  notes: string | null;
  hometown: string | null;
  birthday: string | null;
  venmo: string | null;
  universities: string | null;
  interests: string | null;
  isOrigin: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  const { tags, universities, interests, ...rest } = p;
  return {
    ...rest,
    tags: parseJsonArray(tags),
    universities: parseJsonArray(universities),
    interests: parseJsonArray(interests),
  };
}

export async function GET() {
  try {
    const origin = await ensureOrigin();
    if (!origin) {
      return NextResponse.json({ error: "Origin not found" }, { status: 404 });
    }
    const { facts, ...personRest } = origin;
    return NextResponse.json({
      person: personToJson(personRest as Parameters<typeof personToJson>[0]),
      facts: facts.map((f) => ({
        id: f.id,
        personId: f.personId,
        type: f.type,
        value: f.value,
        author: f.author,
        confidence: f.confidence,
        sourceType: f.sourceType,
        sourceRef: f.sourceRef,
        createdAt: f.createdAt,
      })),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = safeValidateData(originUpdateSchema, body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { person: personData, facts: factsData } = parsed.data;

    const origin = await ensureOrigin();
    if (!origin) {
      return NextResponse.json({ error: "Origin not found" }, { status: 404 });
    }

    if (personData) {
      const updatePayload: Record<string, unknown> = {};
      if (personData.name !== undefined) updatePayload.name = personData.name;
      if (personData.role !== undefined) updatePayload.role = personData.role ?? null;
      if (personData.notes !== undefined) updatePayload.notes = personData.notes ?? null;
      if (personData.interests !== undefined) {
        updatePayload.interests =
          personData.interests?.length ?
            JSON.stringify(personData.interests.map((s) => String(s).trim()).filter(Boolean)) :
            null;
      }
      if (Object.keys(updatePayload).length > 0) {
        await prisma.person.update({
          where: { id: origin.id },
          data: updatePayload as Parameters<typeof prisma.person.update>[0]["data"],
        });
      }
    }

    if (factsData !== undefined) {
      await prisma.fact.deleteMany({ where: { personId: origin.id } });
      for (const f of factsData) {
        await prisma.fact.create({
          data: {
            personId: origin.id,
            type: f.type,
            value: f.value,
            author: "me",
            sourceType: "manual",
          },
        });
      }
    }

    const updated = await prisma.person.findUnique({
      where: { id: origin.id },
      include: { facts: true },
    });
    if (!updated) {
      return NextResponse.json({ error: "Origin not found" }, { status: 404 });
    }
    const { facts, ...personRest } = updated;
    return NextResponse.json({
      person: personToJson(personRest as Parameters<typeof personToJson>[0]),
      facts: facts.map((f) => ({
        id: f.id,
        personId: f.personId,
        type: f.type,
        value: f.value,
        author: f.author,
        confidence: f.confidence,
        sourceType: f.sourceType,
        sourceRef: f.sourceRef,
        createdAt: f.createdAt,
      })),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
