import { prisma } from "@/lib/prisma";

function norm(s: string | null): string {
  return (s ?? "").toLowerCase().trim().replace(/\s+/g, " ");
}

function score(p: { primaryEmail?: string | null; organization?: string | null; role?: string | null }): number {
  return (p.primaryEmail ? 4 : 0) + (p.organization ? 2 : 0) + (p.role ? 1 : 0);
}

async function mergeInto(keep: { id: string }, remove: { id: string }) {
  const dupFacts = await prisma.fact.findMany({ where: { personId: remove.id } });
  for (const f of dupFacts) {
    await prisma.fact.create({
      data: {
        personId: keep.id,
        type: f.type,
        value: f.value,
        author: f.author,
        confidence: f.confidence,
        sourceType: f.sourceType,
        sourceRef: f.sourceRef,
      },
    });
  }
  await prisma.fact.deleteMany({ where: { personId: remove.id } });
  await prisma.person.delete({ where: { id: remove.id } });
}

/** Merges duplicate people (same normalized name). */
function mergeDuplicates(people: Array<{ id: string; name: string | null; primaryEmail?: string | null; organization?: string | null; role?: string | null }>) {
  const byName = new Map<string, typeof people>();
  for (const p of people) {
    const key = norm(p.name);
    if (!key) continue;
    const list = byName.get(key) ?? [];
    list.push(p);
    byName.set(key, list);
  }
  return byName;
}

/** Ensures exactly one Origin person exists. Merges duplicate Michelle Campeaus and creates if needed. */
export async function ensureOrigin() {
  const all = await prisma.person.findMany();
  const byName = mergeDuplicates(all);
  for (const [, group] of byName) {
    if (group.length <= 1) continue;
    const best = group.reduce((a, b) => (score(b) > score(a) ? b : a));
    const others = group.filter((p) => p.id !== best.id);
    for (const dup of others) {
      await mergeInto(best, dup);
    }
  }
  const after = await prisma.person.findMany({ orderBy: { updatedAt: "desc" } });
  await prisma.person.updateMany({ where: { isOrigin: true }, data: { isOrigin: false } });
  const michelles = after.filter((p) => norm(p.name).includes("michelle") && norm(p.name).includes("campeau"));
  const chosen = michelles.length > 0
    ? michelles.reduce((a, b) => (score(b) > score(a) ? b : a))
    : null;
  if (chosen) {
    return prisma.person.update({
      where: { id: chosen.id },
      data: { isOrigin: true },
      include: { facts: true },
    });
  }
  return prisma.person.create({
    data: { name: "Michelle Campeau", isOrigin: true, relationshipState: "ok" },
    include: { facts: true },
  });
}
