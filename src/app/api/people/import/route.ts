import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createPersonSchema } from "@/lib/schemas/chief-of-staff";
import { safeValidateData } from "@/lib/utils/validators";

type PersonCreateData = {
  name: string;
  primaryEmail?: string | null;
  phone?: string | null;
  organization?: string | null;
  role?: string | null;
  tags?: string[] | null;
  relationshipState?: string;
  lastContacted?: string | null;
  notes?: string | null;
  hometown?: string | null;
  birthday?: string | null;
  venmo?: string | null;
  universities?: string[] | null;
  interests?: string[] | null;
  userId?: string | null;
};

function toDbRow(data: PersonCreateData) {
  const rel =
    data.relationshipState === "warm_up" || data.relationshipState === "do_not_contact"
      ? data.relationshipState
      : "ok";
  return {
    name: data.name,
    primaryEmail: data.primaryEmail === "" ? null : (data.primaryEmail ?? null),
    phone: data.phone ?? null,
    organization: data.organization ?? null,
    role: data.role ?? null,
    tags: data.tags?.length ? JSON.stringify(data.tags) : null,
    relationshipState: rel,
    lastContacted: data.lastContacted ? new Date(data.lastContacted) : null,
    notes: data.notes ?? null,
    hometown: data.hometown ?? null,
    birthday: data.birthday ?? null,
    venmo: data.venmo ?? null,
    universities: data.universities?.length ? JSON.stringify(data.universities) : null,
    interests: data.interests?.length ? JSON.stringify(data.interests) : null,
    userId: data.userId ?? null,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const raw = body?.people;
    if (!Array.isArray(raw) || raw.length === 0) {
      return NextResponse.json(
        { error: "Body must include a non-empty 'people' array" },
        { status: 400 }
      );
    }
    if (raw.length > 500) {
      return NextResponse.json({ error: "Maximum 500 contacts per import" }, { status: 400 });
    }

    let created = 0;
    const errors: string[] = [];

    for (let i = 0; i < raw.length; i++) {
      const parsed = safeValidateData(createPersonSchema, raw[i]);
      if (!parsed.success) {
        const msg = parsed.error.flatten().formErrors?.join(", ") ?? "Validation failed";
        errors.push(`Row ${i + 1}: ${msg}`);
        continue;
      }
      try {
        await prisma.person.create({ data: toDbRow(parsed.data as PersonCreateData) });
        created++;
      } catch (e) {
        errors.push(`Row ${i + 1}: ${e instanceof Error ? e.message : "Failed to create"}`);
      }
    }

    const failed = raw.length - created;
    return NextResponse.json({
      created,
      failed,
      total: raw.length,
      ...(errors.length > 0 && { errors }),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
