/**
 * Parse exported WhatsApp chat .txt format.
 * Format: [Date, Time] Sender: Message
 * Example: [10/1/25, 7:39:52 AM] Thresa Skeslien Jenkins: This message was deleted.
 */

export interface ParsedMessage {
  sender: string;
  timestamp: Date;
  content: string;
}

export interface ParsedWhatsAppChat {
  participants: string[];
  messages: ParsedMessage[];
  groupName?: string;
}

const MESSAGE_REGEX = /^\s*\[([^\]]+),\s*([^\]]+)\]\s+([^:]+):\s*(.*)/s;

function parseTimestamp(dateStr: string, timeStr: string): Date {
  const [m, d, y] = dateStr.trim().split("/").map(Number);
  const year = y! < 100 ? 2000 + y! : y!;
  const timePart = timeStr.trim();
  const match = timePart.match(/^(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return new Date(year, (m ?? 1) - 1, d ?? 1);
  let [, h, min, sec, ampm] = match;
  let hour = parseInt(h!, 10);
  if (ampm!.toUpperCase() === "PM" && hour !== 12) hour += 12;
  if (ampm!.toUpperCase() === "AM" && hour === 12) hour = 0;
  return new Date(year, (m ?? 1) - 1, d ?? 1, hour, parseInt(min!, 10), parseInt(sec!, 10));
}

function stripUnicodeMarkers(s: string): string {
  return s.replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g, "").trim();
}

export function parseWhatsAppExport(text: string, groupName?: string): ParsedWhatsAppChat {
  const participants = new Set<string>();
  const messages: ParsedMessage[] = [];
  const lines = text.split(/\r?\n/);
  let currentMessage: ParsedMessage | null = null;

  for (const line of lines) {
    const match = line.match(MESSAGE_REGEX);
    if (match) {
      const [, dateStr, timeStr, senderRaw, content] = match;
      const sender = stripUnicodeMarkers(senderRaw!.trim());
      if (sender.toLowerCase() !== "you") {
        participants.add(sender);
      }
      currentMessage = {
        sender,
        timestamp: parseTimestamp(dateStr!, timeStr!),
        content: content?.trim() ?? "",
      };
      messages.push(currentMessage);
    } else if (currentMessage && line.trim()) {
      currentMessage.content += "\n" + line;
    }
  }

  return {
    participants: Array.from(participants),
    messages,
    groupName,
  };
}
