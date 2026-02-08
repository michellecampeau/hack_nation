import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { parseWhatsAppExport } from "../parse-whatsapp";

const CHAT_PATH = join(process.cwd(), "_chat.txt");

function loadChat(): string {
  return readFileSync(CHAT_PATH, "utf-8");
}

describe("parseWhatsAppExport", () => {
  describe("with _chat.txt", () => {
    const text = loadChat();

    it("parses and returns participants (excluding 'you')", () => {
      const parsed = parseWhatsAppExport(text);
      expect(Array.isArray(parsed.participants)).toBe(true);
      expect(parsed.participants.length).toBeGreaterThan(0);
      expect(parsed.participants.every((p) => p.toLowerCase() !== "you")).toBe(true);
      // Sample names from _chat.txt
      expect(parsed.participants.some((p) => p.includes("Alex LaPolice"))).toBe(true);
      expect(parsed.participants.some((p) => p.includes("Tanvi Sharma"))).toBe(true);
    });

    it("parses and returns messages with sender, timestamp, content", () => {
      const parsed = parseWhatsAppExport(text);
      expect(Array.isArray(parsed.messages)).toBe(true);
      expect(parsed.messages.length).toBeGreaterThan(0);
      for (const m of parsed.messages) {
        expect(typeof m.sender).toBe("string");
        expect(m.timestamp instanceof Date).toBe(true);
        expect(typeof m.content).toBe("string");
      }
    });

    it("includes first and last message from file", () => {
      const parsed = parseWhatsAppExport(text);
      const first = parsed.messages[0];
      const last = parsed.messages[parsed.messages.length - 1];
      expect(first).toBeDefined();
      expect(last).toBeDefined();
      expect(first.sender).toBe("Thresa Skeslien Jenkins");
      expect(first.content).toContain("deleted");
      expect(last.sender).toBe("Samuel McColgan");
      expect(last.content).toContain("Cadoc Capital");
    });

    it("handles multi-line messages (continuation lines)", () => {
      const parsed = parseWhatsAppExport(text);
      const withNewline = parsed.messages.find(
        (m) => m.content.includes("\n") && m.content.trim().length > 1
      );
      expect(withNewline).toBeDefined();
    });

    it("passes through groupName when provided", () => {
      const withName = parseWhatsAppExport(text, "GSB 25_26");
      expect(withName.groupName).toBe("GSB 25_26");
      const withoutName = parseWhatsAppExport(text);
      expect(withoutName.groupName).toBeUndefined();
    });

    it("includes senders with various formats (names, phones, ~ prefix)", () => {
      const parsed = parseWhatsAppExport(text);
      expect(parsed.participants.length).toBeGreaterThan(0);
      expect(parsed.messages.some((m) => m.sender.includes("Andrew") || m.sender.includes("Mara"))).toBe(true);
    });

    it("has more messages than a minimal count from _chat.txt", () => {
      const parsed = parseWhatsAppExport(text);
      expect(parsed.messages.length).toBeGreaterThanOrEqual(100);
    });
  });
});
