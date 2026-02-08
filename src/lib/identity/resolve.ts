/**
 * Identity resolution: find or create Person by phone/email to avoid duplicates.
 */

import { prisma } from "@/lib/prisma";

export function normalizePhone(s: string | null | undefined): string | null {
  if (!s || typeof s !== "string") return null;
  const digits = s.replace(/\D/g, "");
  if (digits.length < 7) return null;
  const withPlus = digits.startsWith("1") && digits.length === 11 ? digits : digits;
  return withPlus || null;
}

export function normalizeEmail(s: string | null | undefined): string | null {
  if (!s || typeof s !== "string") return null;
  const t = s.trim().toLowerCase();
  return t.includes("@") ? t : null;
}

export function looksLikePhone(s: string): boolean {
  if (!s || typeof s !== "string") return false;
  const digits = s.replace(/\D/g, "");
  return digits.length >= 7;
}

export interface PersonPayload {
  name?: string | null;
  primaryEmail?: string | null;
  phone?: string | null;
  organization?: string | null;
  role?: string | null;
  lastContacted?: Date | null;
  [key: string]: unknown;
}

/**
 * Find existing Person by normalized phone or email, or create new.
 * Handles "people without contacts": if only phone is available, use phone as display name.
 */
export async function findOrCreatePerson(payload: PersonPayload) {
  const phoneNorm = normalizePhone(payload.phone ?? null);
  const emailNorm = normalizeEmail(payload.primaryEmail ?? null);
  const name = (payload.name ?? "").trim() || null;

  if (phoneNorm || emailNorm) {
    const candidates = await prisma.person.findMany({
      where: { isOrigin: false },
      select: { id: true, name: true, phone: true, primaryEmail: true, lastContacted: true },
    });
    const existing = candidates.find(
      (p) =>
        (phoneNorm && normalizePhone(p.phone) === phoneNorm) ||
        (emailNorm && normalizeEmail(p.primaryEmail) === emailNorm)
    );
    if (existing) {
      const updates: Record<string, unknown> = {};
      if (payload.lastContacted && existing.lastContacted) {
        if (new Date(payload.lastContacted) > existing.lastContacted) {
          updates.lastContacted = payload.lastContacted;
        }
      } else if (payload.lastContacted) {
        updates.lastContacted = payload.lastContacted;
      }
      if (name && !existing.name?.trim()) updates.name = name;
      if (Object.keys(updates).length > 0) {
        return prisma.person.update({
          where: { id: existing.id },
          data: updates as Parameters<typeof prisma.person.update>[0]["data"],
        });
      }
      return prisma.person.findUniqueOrThrow({ where: { id: existing.id } });
    }
  }

  const displayName =
    name ||
    (payload.phone ? payload.phone.trim() || `Unknown (${payload.phone})` : "Unknown");

  return prisma.person.create({
    data: {
      name: displayName,
      primaryEmail: payload.primaryEmail ?? null,
      phone: payload.phone ?? null,
      organization: payload.organization ?? null,
      role: payload.role ?? null,
      relationshipState: "ok",
      lastContacted: payload.lastContacted ? new Date(payload.lastContacted) : null,
      isOrigin: false,
    },
  });
}
