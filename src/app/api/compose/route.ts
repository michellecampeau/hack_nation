import { NextResponse } from "next/server";
import OpenAI from "openai";
import { prisma } from "@/lib/prisma";
import { composeRequestSchema } from "@/lib/schemas/chief-of-staff";
import { safeValidateData } from "@/lib/utils/validators";

const COMPOSE_MODEL = process.env.OPENAI_COMPOSE_MODEL ?? "gpt-4o-mini";

function parseJsonArray(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  try {
    const arr = JSON.parse(raw) as unknown;
    return Array.isArray(arr) ? arr.map((x) => String(x).trim()).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function buildOriginBlock(origin: {
  name: string;
  role?: string | null;
  notes?: string | null;
  interests?: string[] | null;
  facts: Array<{ type: string; value: string }>;
}): string {
  const lines: string[] = [];
  lines.push(`Name: ${origin.name}`);
  if (origin.role?.trim()) lines.push(`Current focus/role: ${origin.role.trim()}`);
  if (origin.notes?.trim()) lines.push(`About me: ${origin.notes.trim()}`);
  const interests = origin.interests?.filter(Boolean) ?? [];
  if (interests.length) lines.push(`Interests: ${interests.join(", ")}`);
  const goals = origin.facts.filter((f) => f.type === "goal");
  if (goals.length) {
    lines.push(`Goals: ${goals.map((g) => g.value).join("; ")}`);
  }
  const prefs = origin.facts.filter((f) => f.type === "preference");
  if (prefs.length) {
    lines.push(`Preferences: ${prefs.map((p) => p.value).join("; ")}`);
  }
  const constraints = origin.facts.filter((f) => f.type === "constraint");
  if (constraints.length) {
    lines.push(`Constraints: ${constraints.map((c) => c.value).join("; ")}`);
  }
  return lines.join("\n");
}

function buildProfileBlock(person: {
  name: string;
  organization?: string | null;
  role?: string | null;
  notes?: string | null;
  hometown?: string | null;
  interests?: string | null;
  universities?: string | null;
  tags?: string | null;
  birthday?: string | null;
  venmo?: string | null;
}): string {
  const lines: string[] = [];
  lines.push(`Name: ${person.name}`);
  if (person.organization?.trim()) lines.push(`Organization: ${person.organization.trim()}`);
  if (person.role?.trim()) lines.push(`Role: ${person.role.trim()}`);
  if (person.hometown?.trim()) lines.push(`Hometown: ${person.hometown.trim()}`);
  const interests = parseJsonArray(person.interests);
  if (interests.length) lines.push(`Interests: ${interests.join(", ")}`);
  const universities = parseJsonArray(person.universities);
  if (universities.length) lines.push(`Universities: ${universities.join(", ")}`);
  const tags = parseJsonArray(person.tags);
  if (tags.length) lines.push(`Tags: ${tags.join(", ")}`);
  if (person.birthday?.trim()) lines.push(`Birthday: ${person.birthday.trim()}`);
  if (person.venmo?.trim()) lines.push(`Venmo: ${person.venmo.trim()}`);
  if (person.notes?.trim()) lines.push(`Notes: ${person.notes.trim()}`);
  return lines.join("\n");
}

function buildComposePrompt(
  profileBlock: string,
  facts: Array<{ type: string; value: string }>,
  goal?: string,
  format: "email" | "text" = "email",
  refinement?: string,
  originBlock?: string,
  messageContextBlock?: string
): string {
  const factsBlock =
    facts.length > 0 ? facts.map((f) => `- ${f.type}: ${f.value}`).join("\n") : "(none)";
  const goalLine = goal ? `\nThe user's goal or context for this outreach: ${goal}` : "";
  const refinementLine =
    refinement?.trim() ?
      `\nThe user wants you to incorporate this additional instruction when generating the message: ${refinement.trim()}` :
      "";
  const formatInstruction =
    format === "text"
      ? "Format the message as a short text message or DM: concise, casual, 1-3 short sentences. No subject line or email sign-off."
      : "Format the message as an email: clear subject line, 2-4 short paragraphs, appropriate greeting and sign-off.";
  const originSection =
    originBlock?.trim() ?
      `

You (the sender) — use for tone and framing:
${originBlock}
Respect Origin preferences (e.g. brevity, warm intros) and constraints (softer tone where relevant).` :
      "";
  const messageContextSection =
    messageContextBlock?.trim() ?
      `

Recent message context from this contact (use for personal context, topics they care about):
${messageContextBlock}` :
      "";

  return `You are helping prepare a thoughtful, human outreach to a contact. Use ONLY the information provided below. Do not invent or assume any details about their career, industry, work experience, or background that are not explicitly stated. If something is not mentioned, do not include it in the bio or message.
${originSection}

Contact profile (use only this information):
${profileBlock}

Known facts about the contact (expertise, interests, shared context — use only these):
${factsBlock}${messageContextSection}${goalLine}

Produce a short bio of THE CONTACT (the person we are reaching out to), 2-4 connection points (why reach out now / what you have in common), and one outreach message. Be specific and warm; only reference details that appear above.

CRITICAL — Bio: The "bio" must describe THE CONTACT (the recipient), never the sender. Use only the "Contact profile" and "Known facts about the contact" sections. Do not summarize the Origin/sender in the bio.

CRITICAL for connection points: They must reflect GENUINE overlap between the sender's interests (from Origin) and the contact's interests/profile. Do NOT claim to share an interest that only the contact has. Only mention shared interests when BOTH the Origin block and the Contact profile explicitly include that interest. If there is no overlap, use other connection points (e.g. shared context, goal alignment, mutual connections) or keep it general—never fabricate shared interests.${refinementLine} ${formatInstruction}

Respond with a single JSON object with exactly these keys (all strings; connectionPoints is an array of strings):
- "bio": 1-2 sentence summary of THE CONTACT (the person we are reaching out to), based ONLY on the Contact profile and Known facts about the contact above. Never describe the sender/Origin in the bio.
- "connectionPoints": array of 2-4 short bullets or sentences—only include shared interests when both Origin and contact have them; do not assume or invent overlap
- "message": the full outreach message, formatted as requested above`;
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
    const { personId, goal, format = "email", refinement } = parsed.data;

    const [person, origin, recentMessages] = await Promise.all([
      prisma.person.findUnique({
        where: { id: personId },
        include: { facts: true },
      }),
      prisma.person.findFirst({
        where: { isOrigin: true },
        include: { facts: true },
      }),
      // PrismaClient.message (Message model) – cast for TS when client types are stale
      (prisma as unknown as { message: { findMany: (args: unknown) => Promise<{ content: string }[]> } }).message.findMany({
        where: { personId, content: { not: "" } },
        orderBy: { timestamp: "desc" },
        take: 3,
      }),
    ]);
    if (!person) {
      return NextResponse.json({ error: "Person not found" }, { status: 404 });
    }

    const messageContextBlock =
      recentMessages.length > 0
        ? recentMessages
            .map((m: { content: string }) => m.content.trim())
            .filter(Boolean)
            .slice(0, 3)
            .map((c: string) => `- "${c.slice(0, 200)}${c.length > 200 ? "…" : ""}"`)
            .join("\n")
        : undefined;

    const profileBlock = buildProfileBlock(person);
    const originInterests = origin?.interests
      ? (() => {
          try {
            const arr = typeof origin.interests === "string" ? JSON.parse(origin.interests) : origin.interests;
            return Array.isArray(arr) ? arr.map(String).filter(Boolean) : [];
          } catch {
            return [];
          }
        })()
      : [];
    const originBlock =
      origin
        ? buildOriginBlock({
            name: origin.name,
            role: origin.role,
            notes: origin.notes,
            interests: originInterests,
            facts: origin.facts.map((f: { type: string; value: string }) => ({ type: f.type, value: f.value })),
          })
        : undefined;
    const prompt = buildComposePrompt(
      profileBlock,
      person.facts.map((f: { type: string; value: string }) => ({ type: f.type, value: f.value })),
      goal,
      format,
      refinement,
      originBlock,
      messageContextBlock
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
