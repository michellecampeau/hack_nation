import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findOrCreatePerson, looksLikePhone } from "@/lib/identity/resolve";
import { parseWhatsAppExport } from "@/lib/ingestion/parse-whatsapp";
import { extractSignificanceFromMessages } from "@/lib/ingestion/process-messages";

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    let text: string;
    let groupName: string | undefined;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }
      text = await file.text();
      groupName = (formData.get("groupName") as string)?.trim() || undefined;
      // Infer group name from filename if not provided: "WhatsApp Chat - Group Name.txt" or "WhatsApp Chat - Group Name - General.txt"
      if (!groupName && file.name) {
        const match = file.name.match(/^WhatsApp Chat - (.+?)\.txt$/i);
        if (match?.[1]) groupName = match[1].trim();
      }
    } else if (contentType.includes("application/json")) {
      const body = await request.json();
      text = body.text ?? body.content ?? "";
      groupName = body.groupName ?? body.group_name;
    } else {
      text = await request.text();
    }

    if (!text.trim()) {
      return NextResponse.json({ error: "Empty chat content" }, { status: 400 });
    }

    const parsed = parseWhatsAppExport(text, groupName);
    const senderToLastMessage = new Map<string, Date>();
    for (const m of parsed.messages) {
      if (m.sender.toLowerCase() === "you") continue;
      const existing = senderToLastMessage.get(m.sender);
      if (!existing || m.timestamp > existing) {
        senderToLastMessage.set(m.sender, m.timestamp);
      }
    }

    const personIds: string[] = [];
    const seenSenders = new Set<string>();
    const senderToPersonId = new Map<string, string>();

    for (const sender of parsed.participants) {
      if (sender.toLowerCase() === "you" || seenSenders.has(sender)) continue;
      seenSenders.add(sender);
      const lastContacted = senderToLastMessage.get(sender) ?? null;
      const cleanSender = sender.replace(/^~\s*/, "").trim();
      const phone = looksLikePhone(cleanSender) ? cleanSender : undefined;
      const name = looksLikePhone(cleanSender) ? undefined : cleanSender;
      const person = await findOrCreatePerson({
        name: name || (phone ? `Unknown (${phone})` : sender),
        phone: phone ?? undefined,
        lastContacted: lastContacted ?? undefined,
      });
      personIds.push(person.id);
      senderToPersonId.set(sender, person.id);
    }

    const event = await prisma.event.create({
      data: {
        type: "message",
        channel: "whatsapp",
        timestamp: parsed.messages[0]?.timestamp ?? new Date(),
        participants: JSON.stringify(personIds),
        contentRef: parsed.groupName ?? "WhatsApp chat",
      },
    });

    // Persist messages per person
    const messagesToCreate: Array<{ personId: string; eventId: string; content: string; timestamp: Date; sourceGroup: string | null }> = [];
    for (const m of parsed.messages) {
      if (m.sender.toLowerCase() === "you") continue;
      const personId = senderToPersonId.get(m.sender);
      if (!personId) continue;
      messagesToCreate.push({
        personId,
        eventId: event.id,
        content: m.content || "",
        timestamp: m.timestamp,
        sourceGroup: parsed.groupName ?? null,
      });
    }
    if (messagesToCreate.length > 0) {
      await prisma.message.createMany({
        data: messagesToCreate.map((d) => ({
          personId: d.personId,
          eventId: d.eventId,
          content: d.content,
          timestamp: d.timestamp,
          channel: "whatsapp",
          sourceGroup: d.sourceGroup,
        })),
      });

      // Extract significance from messages (LLM) and create Facts
      const apiKey = process.env.OPENAI_API_KEY;
      if (apiKey?.trim()) {
        const messagesByPerson = new Map<string, Array<{ content: string }>>();
        for (const m of parsed.messages) {
          if (m.sender.toLowerCase() === "you") continue;
          const personId = senderToPersonId.get(m.sender);
          if (!personId || !m.content?.trim()) continue;
          const list = messagesByPerson.get(personId) ?? [];
          list.push({ content: m.content });
          messagesByPerson.set(personId, list);
        }
        for (const [personId, msgs] of messagesByPerson) {
          try {
            const facts = await extractSignificanceFromMessages(msgs, apiKey);
            for (const f of facts) {
              const existing = await prisma.fact.findFirst({
                where: {
                  personId,
                  type: f.type,
                  value: f.value,
                  sourceType: "whatsapp",
                },
              });
              if (!existing) {
                await prisma.fact.create({
                  data: {
                    personId,
                    type: f.type,
                    value: f.value,
                    author: "inferred",
                    confidence: 0.9,
                    sourceType: "whatsapp",
                    sourceRef: event.id,
                  },
                });
              }
            }
          } catch (err) {
            console.warn("Significance extraction failed for person", personId, err);
          }
        }
      }
    }

    if (groupName && personIds.length > 0) {
      for (const personId of personIds) {
        const existing = await prisma.fact.findFirst({
          where: {
            personId,
            type: "shared_context",
            value: { contains: groupName },
            sourceType: "whatsapp",
          },
        });
        if (!existing) {
          await prisma.fact.create({
            data: {
              personId,
              type: "shared_context",
              value: `Member of group: ${groupName}`,
              author: "inferred",
              sourceType: "whatsapp",
              sourceRef: event.id,
            },
          });
        }
      }
    }

    // Facts from messages are only extracted when OPENAI_API_KEY is set. Re-importing the same
    // chat will append messages and run extraction again (new facts added); you don't need to delete contacts.
    return NextResponse.json({
      created: personIds.length,
      participants: parsed.participants.length,
      messages: parsed.messages.length,
      eventId: event.id,
      factsExtracted: Boolean(process.env.OPENAI_API_KEY?.trim()),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
