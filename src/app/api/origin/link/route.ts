import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { originLinkSchema } from "@/lib/schemas/chief-of-staff";
import { safeValidateData } from "@/lib/utils/validators";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = safeValidateData(originLinkSchema, body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { personId } = parsed.data;

    const person = await prisma.person.findUnique({ where: { id: personId } });
    if (!person) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }

    await prisma.person.updateMany({
      where: { isOrigin: true },
      data: { isOrigin: false },
    });
    await prisma.person.update({
      where: { id: personId },
      data: { isOrigin: true },
    });

    return NextResponse.json({ linked: true, personId });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
