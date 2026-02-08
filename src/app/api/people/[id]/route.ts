import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updatePersonSchema } from "@/lib/schemas/chief-of-staff";
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = safeValidateData(updatePersonSchema, body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const data = parsed.data;
    const updatePayload: Parameters<typeof prisma.person.update>[0]["data"] = {};
    if (data.name !== undefined) updatePayload.name = data.name;
    if (data.primaryEmail !== undefined)
      updatePayload.primaryEmail = data.primaryEmail === "" ? null : data.primaryEmail;
    if (data.phone !== undefined) updatePayload.phone = data.phone ?? null;
    if (data.organization !== undefined)
      updatePayload.organization = data.organization ?? null;
    if (data.role !== undefined) updatePayload.role = data.role ?? null;
    if (data.tags !== undefined)
      updatePayload.tags = data.tags ? JSON.stringify(data.tags) : null;
    if (data.relationshipState !== undefined)
      updatePayload.relationshipState = data.relationshipState;
    if (data.lastContacted !== undefined)
      updatePayload.lastContacted = data.lastContacted
        ? new Date(data.lastContacted)
        : null;
    if (data.notes !== undefined) updatePayload.notes = data.notes ?? null;
    if (data.userId !== undefined) updatePayload.userId = data.userId ?? null;
    if (data.hometown !== undefined) updatePayload.hometown = data.hometown ?? null;
    if (data.birthday !== undefined) updatePayload.birthday = data.birthday ?? null;
    if (data.venmo !== undefined) updatePayload.venmo = data.venmo ?? null;
    if (data.universities !== undefined)
      updatePayload.universities = data.universities?.length ? JSON.stringify(data.universities) : null;
    if (data.interests !== undefined)
      updatePayload.interests = data.interests?.length ? JSON.stringify(data.interests) : null;

    const person = await prisma.person.update({
      where: { id },
      data: updatePayload,
    });
    return NextResponse.json({
      data: {
        ...person,
        tags: parseJsonArray(person.tags),
        universities: parseJsonArray(person.universities),
        interests: parseJsonArray(person.interests),
      },
    });
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && e.code === "P2025") {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }
    console.error(e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const person = await prisma.person.findUnique({
      where: { id },
      include: { facts: true },
    });
    if (!person) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }
    const { tags, universities, interests, ...rest } = person;
    return NextResponse.json({
      data: {
        ...rest,
        tags: parseJsonArray(tags),
        universities: parseJsonArray(universities),
        interests: parseJsonArray(interests),
        facts: person.facts,
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const person = await prisma.person.findUnique({
      where: { id },
      select: { isOrigin: true },
    });
    if (!person) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }
    if (person.isOrigin) {
      return NextResponse.json(
        { error: "Cannot delete Origin. Unlink from Origin first." },
        { status: 400 }
      );
    }
    await prisma.person.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && e.code === "P2025") {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }
    console.error(e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
