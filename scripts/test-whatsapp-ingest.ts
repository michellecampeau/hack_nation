/**
 * Test script for WhatsApp ingestion.
 * Run: npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/test-whatsapp-ingest.ts
 */

import * as fs from "fs";
import * as path from "path";
import { parseWhatsAppExport } from "../src/lib/ingestion/parse-whatsapp";
import { looksLikePhone, normalizePhone } from "../src/lib/identity/resolve";

const chatPath = path.join(__dirname, "../_chat.txt");
const text = fs.readFileSync(chatPath, "utf-8");

console.log("=== WhatsApp Parser Test ===\n");

const parsed = parseWhatsAppExport(text, "GSB 25_26 - General");

console.log("Messages parsed:", parsed.messages.length);
console.log("Participants:", parsed.participants.length);
console.log("Group name:", parsed.groupName);

const byType = { name: 0, phone: 0 };
for (const p of parsed.participants) {
  if (looksLikePhone(p.replace(/^~\s*/, ""))) byType.phone++;
  else byType.name++;
}
console.log("  - By name:", byType.name);
console.log("  - By phone:", byType.phone);

console.log("\nSample participants:");
parsed.participants.slice(0, 10).forEach((p, i) => {
  const clean = p.replace(/^~\s*/, "").trim();
  const isPhone = looksLikePhone(clean);
  const phoneNorm = isPhone ? normalizePhone(clean) : null;
  console.log(`  ${i + 1}. "${p}" -> ${isPhone ? `phone (${phoneNorm})` : "name"}`);
});

console.log("\nSample messages:");
parsed.messages.slice(0, 3).forEach((m, i) => {
  console.log(`  ${i + 1}. [${m.timestamp.toISOString()}] ${m.sender}: ${m.content.slice(0, 50)}...`);
});

console.log("\n=== Parser test passed ===");
