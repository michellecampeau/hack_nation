import OpenAI from "openai";

const MODEL = process.env.OPENAI_PROCESS_MESSAGES_MODEL ?? "gpt-4o-mini";

/** Max characters of message content to send to the LLM to avoid token limits */
const MAX_CONTENT_CHARS = 8000;

export interface ExtractedFact {
  type: "expertise" | "interest" | "shared_context";
  value: string;
}

/**
 * Extract significance (expertise, interests, shared_context) from chat messages
 * using an LLM. Returns structured Facts for use in edges (rank) and extend (compose).
 */
export async function extractSignificanceFromMessages(
  messages: Array<{ content: string }>,
  apiKey?: string
): Promise<ExtractedFact[]> {
  if (!apiKey?.trim()) return [];
  if (!messages.length) return [];

  const contents = messages
    .map((m) => m.content?.trim())
    .filter(Boolean)
    .join("\n---\n");

  if (!contents.trim()) return [];

  const truncated =
    contents.length > MAX_CONTENT_CHARS
      ? contents.slice(0, MAX_CONTENT_CHARS) + "\n[...truncated]"
      : contents;

  const openai = new OpenAI({ apiKey });
  const completion = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "user",
        content: `Given these chat messages from a contact, extract structured facts about them. Focus on:
- expertise: professional skills, job, industry, technical knowledge
- interest: hobbies, topics they care about, things they're excited about
- shared_context: events, groups, mutual connections, shared experiences mentioned

Return a JSON object with key "facts" containing an array of objects: { "type": "expertise"|"interest"|"shared_context", "value": "short descriptive string" }.
Extract only what is clearly stated or strongly implied. Be concise. Deduplicate similar items.
If nothing significant is found, return { "facts": [] }.

Messages:
${truncated}`,
      },
    ],
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw?.trim()) return [];

  try {
    const parsed = JSON.parse(raw) as { facts?: ExtractedFact[]; items?: ExtractedFact[] };
    const arr = parsed.facts ?? parsed.items ?? (Array.isArray(parsed) ? parsed : []);
    if (!Array.isArray(arr)) return [];

    const valid: ExtractedFact[] = [];
    const seen = new Set<string>();
    for (const item of arr) {
      const type = item?.type;
      const value = typeof item?.value === "string" ? item.value.trim() : "";
      if (!value || !["expertise", "interest", "shared_context"].includes(type)) continue;
      const key = `${type}:${value.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);
      valid.push({ type, value });
    }
    return valid;
  } catch {
    return [];
  }
}
