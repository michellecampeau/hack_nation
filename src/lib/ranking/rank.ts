import type { RankedEntry } from "@/types";

export interface ProfileChunk {
  label: string;
  text: string;
}

export interface PersonWithFacts {
  id: string;
  name: string;
  relationshipState: string;
  lastContacted: Date | null;
  facts: Array<{ type: string; value: string }>;
  /** Searchable profile fields (interests, notes, organization, etc.) for ranking. */
  profileChunks: ProfileChunk[];
}

const RELATIONSHIP_WEIGHT: Record<string, number> = {
  ok: 1,
  warm_up: 0.7,
  do_not_contact: 0,
};

const MAX_DAYS_RECENCY = 365;
const TOP_N = 20;

/**
 * Deterministic ranking: keyword match on facts + profile (interests, notes, etc.) + recency + relationship_state.
 * Excludes do_not_contact. Returns top N with explanations.
 */
export function rankPeople(
  people: PersonWithFacts[],
  query: string
): RankedEntry[] {
  const q = query.toLowerCase().trim();
  const terms = q.split(/\s+/).filter(Boolean);
  const now = new Date();

  const scored = people
    .filter((p) => p.relationshipState !== "do_not_contact")
    .map((person) => {
      const weight = RELATIONSHIP_WEIGHT[person.relationshipState] ?? 0.7;
      if (weight === 0) return null;

      let matchScore = 0;
      const matchReasons: string[] = [];

      for (const fact of person.facts) {
        const valueLower = fact.value.toLowerCase();
        for (const term of terms) {
          if (valueLower.includes(term)) {
            matchScore += 1;
            matchReasons.push(`Matched "${fact.type}": ${fact.value.slice(0, 60)}${fact.value.length > 60 ? "…" : ""}`);
          }
        }
      }

      const profileChunks = person.profileChunks ?? [];
      for (const chunk of profileChunks) {
        const textLower = chunk.text.toLowerCase();
        for (const term of terms) {
          if (textLower.includes(term)) {
            matchScore += 1;
            const snippet = chunk.text.slice(0, 60) + (chunk.text.length > 60 ? "…" : "");
            matchReasons.push(`Matched ${chunk.label}: ${snippet}`);
          }
        }
      }

      let recencyScore = 1;
      let recencyLabel = "No recent contact";
      if (person.lastContacted) {
        const days = Math.floor(
          (now.getTime() - new Date(person.lastContacted).getTime()) /
            (24 * 60 * 60 * 1000)
        );
        recencyScore = Math.max(0, 1 - days / MAX_DAYS_RECENCY);
        if (days === 0) recencyLabel = "Contacted today";
        else if (days === 1) recencyLabel = "Contacted yesterday";
        else if (days < 7) recencyLabel = `Contacted ${days} days ago`;
        else if (days < 30) recencyLabel = `Contacted ${Math.floor(days / 7)} weeks ago`;
        else recencyLabel = `Last contact ${Math.floor(days / 30)} months ago`;
      }

      const score = (matchScore * 2 + recencyScore) * weight;
      const explanation =
        matchReasons.length > 0
          ? [matchReasons[0], recencyLabel].join(". ")
          : recencyLabel;

      return { personId: person.id, personName: person.name, score, explanation };
    })
    .filter((x): x is RankedEntry => x !== null);

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, TOP_N);
}
