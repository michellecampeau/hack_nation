import { NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { composeRequestSchema } from "@/lib/schemas/chief-of-staff";
import { safeValidateData } from "@/lib/utils/validators";

const COMPOSE_MODEL = process.env.OPENAI_COMPOSE_MODEL ?? "gpt-4o-mini";

function buildComposePrompt(
  name: string,
  facts: Array<{ type: string; value: string }>,
  goal?: string
): string {
  const factsBlock = facts.map((f) => `- ${f.type}: ${f.value}`).join("\n");
  const goalLine = goal ? `\nThe user's goal or context for this outreach: ${goal}` : "";
  return `You are helping prepare a thoughtful, human outreach to a contact. Given the following person and known facts, produce a short bio, 2-4 connection points (why reach out now / what you have in common), and one concise outreach message (email or DM style). Be specific and warm; avoid generic flattery.

Person: ${name}
Known facts:
${factsBlock}${goalLine}

Respond with a single JSON object with exactly these keys (all strings; connectionPoints is an array of strings):
- "bio": 1-2 sentence summary of who they are and relevance
- "connectionPoints": array of 2-4 short bullets or sentences
- "message": the full outreach message (2-4 short paragraphs max)`;
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error: "Compose unavailable",
        message: "OPENAI_API_KEY is not set. Add it to .env to use compose.",
      },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const parsed = safeValidateData(composeRequestSchema, body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { personId, goal } = parsed.data;

    const person = await prisma.person.findUnique({
      where: { id: personId },
      include: { facts: true },
    });
    if (!person) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }

    const prompt = buildComposePrompt(
      person.name,
      person.facts.map((f) => ({ type: f.type, value: f.value })),
      goal
    );

    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: COMPOSE_MODEL,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json(
        { error: "Compose failed", message: "No content from model" },
        { status: 502 }
      );
    }

    const parsedJson = JSON.parse(raw) as {
      bio?: string;
      connectionPoints?: string[];
      message?: string;
    };
    const bio = typeof parsedJson.bio === "string" ? parsedJson.bio : "";
    const connectionPoints = Array.isArray(parsedJson.connectionPoints)
      ? parsedJson.connectionPoints.filter((x) => typeof x === "string")
      : [];
    const message = typeof parsedJson.message === "string" ? parsedJson.message : "";

    return NextResponse.json({
      bio,
      connectionPoints,
      message,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Internal Server Error", message: String(e) },
      { status: 500 }
    );
  }
}
