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
  hometown?: string;
  birthday?: string;
  venmo?: string;
  universities?: string[];
  interests?: string[];
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
  hometown: "hometown",
  birthday: "birthday",
  venmo: "venmo",
  universities: "universities",
  interests: "interests",
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
      hometown: row["hometown"] ?? undefined,
      birthday: row["birthday"] ?? undefined,
      venmo: row["venmo"] ?? undefined,
      universities: (() => {
        const raw = row["universities"] ?? row["university"];
        const arr = raw ? raw.split(/[,;]/).map((s: string) => s.trim()).filter(Boolean) : [];
        return arr.length ? arr : undefined;
      })(),
      interests: (() => {
        const raw = row["interests"] ?? row["interest"];
        const arr = raw ? raw.split(/[,;]/).map((s: string) => s.trim()).filter(Boolean) : [];
        return arr.length ? arr : undefined;
      })(),
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
      const univ = o.universities;
    const univArr = Array.isArray(univ)
      ? univ.map((x) => (typeof x === "string" ? x : String(x)))
      : typeof univ === "string"
        ? univ.split(/[,;]/).map((s) => s.trim()).filter(Boolean)
        : undefined;
    const intr = o.interests;
    const intrArr = Array.isArray(intr)
      ? intr.map((x) => (typeof x === "string" ? x : String(x)))
      : typeof intr === "string"
        ? intr.split(/[,;]/).map((s) => s.trim()).filter(Boolean)
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
        hometown: str(o.hometown),
        birthday: str(o.birthday),
        venmo: str(o.venmo),
        universities: univArr?.length ? univArr : undefined,
        interests: intrArr?.length ? intrArr : undefined,
      };
    })
    .filter((r) => r.name && r.name !== "Unknown");
}

/**
 * Parse vCard (.vcf) text into ImportRow[].
 * Handles line folding, FN, N, EMAIL, TEL, ORG, ADR, BDAY, TITLE, NOTE (full text).
 * ORG: if value contains ";" then first part = hometown, rest = organization.
 * ADR: locality (4th component) used as hometown if no hometown from ORG.
 * NOTE: all NOTE lines concatenated (no truncation).
 */
/**
 * Unfold vCard text: standard folding (newline + space/tab) and quoted-printable
 * soft line breaks (=\r\n or =\n) so continued lines are joined and no trailing "=" remains.
 */
function unfoldVcf(vcfText: string): string {
  let t = vcfText.replace(/\r\n|\r/g, "\n");
  t = t.replace(/=\n/g, ""); // quoted-printable soft line break
  t = t.replace(/\n[ \t]/g, ""); // standard vCard line folding (newline + space/tab)
  return t;
}

export function parseVcfToContacts(vcfText: string): ImportRow[] {
  const result: ImportRow[] = [];
  const unfolded = unfoldVcf(vcfText);
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
      if (key === "NOTE") {
        fields["NOTE"] = fields["NOTE"] ? fields["NOTE"] + "\n" + value : value;
      } else if (key === "EMAIL" && !fields["EMAIL"]) fields["EMAIL"] = value;
      else if (key === "EMAIL" && fields["EMAIL"]) continue;
      else if (key === "TEL" && !fields["TEL"]) fields["TEL"] = value;
      else if (key === "TEL" && fields["TEL"]) continue;
      else if (!fields[key]) fields[key] = value;
    }
    const name = fields["FN"] ?? fields["N"]?.replace(/;+/g, " ").trim() ?? "Unknown";
    if (!name || name === "Unknown") continue;
    const orgRaw = fields["ORG"]?.trim();
    let hometown = fields["ADR"]
      ? (() => {
          const parts = fields["ADR"].split(";").map((p) => p.trim());
          return parts[3] ?? undefined;
        })()
      : undefined;
    let organization: string | undefined;
    if (orgRaw) {
      const orgParts = orgRaw.split(";").map((p) => p.trim()).filter(Boolean);
      if (orgParts.length >= 2) {
        hometown = hometown ?? orgParts[0];
        organization = orgParts.slice(1).join("; ");
      } else {
        organization = orgRaw;
      }
    }
    const univRaw = fields["X-UNIVERSITIES"] ?? fields["X-UNIVERSITY"];
    const universities = univRaw?.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
    const interestsRaw = fields["X-INTERESTS"] ?? fields["X-INTEREST"];
    const interests = interestsRaw?.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
    result.push({
      name,
      primaryEmail: fields["EMAIL"] || undefined,
      phone: fields["TEL"] || undefined,
      organization,
      role: fields["TITLE"] || undefined,
      notes: fields["NOTE"] || undefined,
      hometown,
      birthday: fields["BDAY"] || undefined,
      venmo: fields["X-VENMO"] ?? fields["VENMO"] ?? undefined,
      universities: universities?.length ? universities : undefined,
      interests: interests?.length ? interests : undefined,
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
