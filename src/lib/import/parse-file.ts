/**
 * Parse CSV, JSON, or vCard (.vcf) into an array of contact-like objects for import.
 * CSV: first row = headers (name, email, phone, organization, role, etc.).
 * JSON: array of objects with name, email, phone, etc.
 * vCard: vCard 2.1/3.0/4.0 (FN, N, EMAIL, TEL, ORG, TITLE, NOTE).
 */

export interface ImportRow {
  name: string;
  primaryEmail?: string;
  phone?: string;
  organization?: string;
  role?: string;
  tags?: string[];
  notes?: string;
  relationshipState?: string;
}

const CSV_HEADER_MAP: Record<string, keyof ImportRow> = {
  name: "name",
  "given name": "name", // use as fallback if "name" missing; we'll combine below
  "full name": "name",
  email: "primaryEmail",
  "primary email": "primaryEmail",
  "e-mail": "primaryEmail",
  "e-mail 1 - value": "primaryEmail",
  "email 1 - value": "primaryEmail",
  phone: "phone",
  "phone 1 - value": "phone",
  "mobile phone": "phone",
  organization: "organization",
  "organization 1 - name": "organization",
  company: "organization",
  org: "organization",
  role: "role",
  "organization 1 - title": "role",
  title: "role",
  "job title": "role",
  tags: "tags",
  tag: "tags",
  notes: "notes",
  note: "notes",
  relationship: "relationshipState",
  "relationship state": "relationshipState",
};

function parseCsvLine(line: string): string[] {
  const row: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === "," && !inQuotes) {
      row.push(current.trim());
      current = "";
    } else {
      current += c;
    }
  }
  row.push(current.trim());
  return row;
}

function parseCsv(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return [];
  return lines.map((line) => parseCsvLine(line));
}

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/\s+/g, " ").trim();
}

export function parseCsvToContacts(csvText: string): ImportRow[] {
  const rows = parseCsv(csvText);
  if (rows.length < 2) return [];
  const headers = rows[0].map(normalizeHeader);
  const result: ImportRow[] = [];
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      const val = cells[i]?.trim();
      if (val) row[h] = val;
    });
    const name =
      (row["name"] ??
        row["full name"] ??
        [row["given name"], row["family name"]].filter(Boolean).join(" ")) ||
      "Unknown";
    const tagsRaw = row["tags"] ?? row["tag"];
    const tags = tagsRaw
      ? tagsRaw
          .split(/[,;]/)
          .map((s) => s.trim())
          .filter(Boolean)
      : undefined;
    result.push({
      name,
      primaryEmail:
        row["email"] ??
        row["primary email"] ??
        row["e-mail"] ??
        row["e-mail 1 - value"] ??
        row["email 1 - value"] ??
        undefined,
      phone: row["phone"] ?? row["phone 1 - value"] ?? row["mobile phone"] ?? undefined,
      organization:
        row["organization"] ??
        row["organization 1 - name"] ??
        row["company"] ??
        row["org"] ??
        undefined,
      role:
        row["role"] ??
        row["organization 1 - title"] ??
        row["title"] ??
        row["job title"] ??
        undefined,
      tags: tags?.length ? tags : undefined,
      notes: row["notes"] ?? row["note"] ?? undefined,
      relationshipState: row["relationship"] ?? row["relationship state"] ?? undefined,
    });
  }
  return result.filter((r) => r.name && r.name !== "Unknown");
}

export function parseJsonToContacts(jsonText: string): ImportRow[] {
  const raw = JSON.parse(jsonText) as unknown;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const o = item as Record<string, unknown>;
      const str = (v: unknown) => (typeof v === "string" ? v : v != null ? String(v) : undefined);
      const tags = o.tags;
      const tagsArr = Array.isArray(tags)
        ? tags.map((t) => (typeof t === "string" ? t : String(t)))
        : typeof tags === "string"
          ? tags
              .split(/[,;]/)
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined;
      return {
        name: str(o.name) ?? "Unknown",
        primaryEmail: str(o.primaryEmail ?? o.email),
        phone: str(o.phone),
        organization: str(o.organization ?? o.company ?? o.org),
        role: str(o.role ?? o.title),
        tags: tagsArr?.length ? tagsArr : undefined,
        notes: str(o.notes),
        relationshipState: str(o.relationshipState ?? o.relationship),
      };
    })
    .filter((r) => r.name && r.name !== "Unknown");
}

/**
 * Parse vCard (.vcf) text into ImportRow[].
 * Handles line folding (RFC 2426), FN, N, EMAIL, TEL, ORG, TITLE, NOTE.
 */
export function parseVcfToContacts(vcfText: string): ImportRow[] {
  const result: ImportRow[] = [];
  // Unfold lines: lines that start with space or tab continue the previous line
  const unfolded = vcfText.replace(/\r\n[ \t]|\n[ \t]|\r[ \t]/g, "").replace(/\r\n|\r/g, "\n");
  const blocks = unfolded.split(/\bBEGIN:VCARD\b/i).filter((b) => b.trim());
  for (const block of blocks) {
    const inner = block.replace(/\bEND:VCARD\b.*/is, "").trim();
    const lines = inner.split("\n");
    const fields: Record<string, string> = {};
    for (const line of lines) {
      const colonIndex = line.indexOf(":");
      if (colonIndex === -1) continue;
      const keyPart = line.slice(0, colonIndex).toUpperCase();
      const value = line
        .slice(colonIndex + 1)
        .trim()
        .replace(/\\n/g, "\n");
      const key = keyPart.split(";")[0];
      if (!key) continue;
      if (key === "EMAIL" && !fields["EMAIL"]) fields["EMAIL"] = value;
      else if (key === "EMAIL" && fields["EMAIL"]) continue;
      else if (key === "TEL" && !fields["TEL"]) fields["TEL"] = value;
      else if (key === "TEL" && fields["TEL"]) continue;
      else if (!fields[key]) fields[key] = value;
    }
    const name = fields["FN"] ?? fields["N"]?.replace(/;+/g, " ").trim() ?? "Unknown";
    if (!name || name === "Unknown") continue;
    result.push({
      name,
      primaryEmail: fields["EMAIL"] || undefined,
      phone: fields["TEL"] || undefined,
      organization: fields["ORG"] || undefined,
      role: fields["TITLE"] || undefined,
      notes: fields["NOTE"] || undefined,
    });
  }
  return result.filter((r) => r.name && r.name !== "Unknown");
}

export function parseFileToContacts(file: File): Promise<ImportRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      try {
        const ext = file.name.split(".").pop()?.toLowerCase();
        const rows =
          ext === "json"
            ? parseJsonToContacts(text)
            : ext === "vcf" || ext === "vcard"
              ? parseVcfToContacts(text)
              : parseCsvToContacts(text);
        resolve(rows);
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file, "UTF-8");
  });
}
