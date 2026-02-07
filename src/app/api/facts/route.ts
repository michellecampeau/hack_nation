import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createFactSchema } from "@/lib/schemas/chief-of-staff";
import { safeValidateData } from "@/lib/utils/validators";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = safeValidateData(createFactSchema, body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const data = parsed.data;
    const fact = await prisma.fact.create({
      data: {
        personId: data.personId,
        type: data.type,
        value: data.value,
        author: data.author ?? "me",
        confidence: data.confidence ?? 1,
        sourceType: data.sourceType ?? "manual",
        sourceRef: data.sourceRef ?? null,
      },
    });
    return NextResponse.json({ data: fact }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
