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
const MIN_SCORE = 2;

const ORIGIN_GOAL_BOOST = 1.5;
const ORIGIN_PREFERENCE_PENALTY = 0.8;
const ORIGIN_PREFERENCE_BOOST = 1.2;
/**
 * Deterministic ranking: keyword match on facts + profile (interests, notes, etc.) + recency + relationship_state.
 * Origin facts (goals, preferences, constraints) influence scoring and explainability.
 * Excludes do_not_contact. Returns all people with score > 2, sorted by score descending.
 */
export function rankPeople(
  people: PersonWithFacts[],
  query: string,
  originFacts: Array<{ type: string; value: string }> = []
): RankedEntry[] {
  const q = query.toLowerCase().trim();
  const terms = q.split(/\s+/).filter(Boolean);
  const now = new Date();

  const originGoals = originFacts.filter((f) => f.type === "goal");
  const originPreferences = originFacts.filter((f) => f.type === "preference");
  const originConstraints = originFacts.filter((f) => f.type === "constraint");

  const scored = people
    .filter((p) => p.relationshipState !== "do_not_contact")
    .map((person) => {
      const weight = RELATIONSHIP_WEIGHT[person.relationshipState] ?? 0.7;
      if (weight === 0) return null;

      let matchScore = 0;
      const matchReasons: string[] = [];
      const originInfluence: string[] = [];

      // Constraint: exclude if person's name contains any name-like part of the constraint
      // e.g. "avoid John" excludes "John Smith"; "exclude Jane Doe" excludes "Jane Doe"
      const personNameLower = person.name.toLowerCase();
      const CONSTRAINT_STOP_WORDS = new Set([
        "avoid", "don't", "dont", "exclude", "contact", "intro", "intros",
        "without", "warm", "context", "the", "a", "an", "do", "not", "no",
      ]);
      const constraintExcludes = originConstraints.some((c) => {
        const words = c.value.toLowerCase().split(/\s+/).filter((w) => w.length >= 2);
        const nameLikeWords = words.filter((w) => !CONSTRAINT_STOP_WORDS.has(w.replace(/[^a-z]/g, "")));
        return nameLikeWords.some((word) => personNameLower.includes(word));
      });
      if (constraintExcludes) return null;

      // Keyword match on facts
      for (const fact of person.facts) {
        const valueLower = fact.value.toLowerCase();
        for (const term of terms) {
          if (valueLower.includes(term)) {
            matchScore += 1;
            matchReasons.push(`Matched "${fact.type}": ${fact.value.slice(0, 60)}${fact.value.length > 60 ? "…" : ""}`);
          }
        }
      }

      // Keyword match on profile
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

      // Goal alignment: boost if candidate facts/profile overlap with Origin goals
      const allCandidateText = [
        ...person.facts.map((f) => f.value),
        ...profileChunks.map((c) => c.text),
      ].join(" ").toLowerCase();
      for (const goal of originGoals) {
        const goalWords = goal.value.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
        const overlap = goalWords.some((w) => allCandidateText.includes(w));
        if (overlap) {
          matchScore += ORIGIN_GOAL_BOOST;
          originInfluence.push(`Aligned with your goal: ${goal.value.slice(0, 60)}${goal.value.length > 60 ? "…" : ""}`);
        }
      }

      // Recency
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

      // Preference enforcement
      let preferenceMultiplier = 1;
      for (const pref of originPreferences) {
        const v = pref.value.toLowerCase();
        if (v.includes("avoid cold") || v.includes("avoid cold outreach")) {
          if (person.relationshipState === "warm_up" || (person.lastContacted && recencyScore < 0.5)) {
            preferenceMultiplier *= ORIGIN_PREFERENCE_PENALTY;
            originInfluence.push(`Preference applied: ${pref.value.slice(0, 50)}…`);
          }
        }
        if (v.includes("prefer warm") || v.includes("warm intro")) {
          const hasSharedContext = person.facts.some((f) => f.type === "shared_context");
          if (hasSharedContext) {
            preferenceMultiplier *= ORIGIN_PREFERENCE_BOOST;
            originInfluence.push(`Matches preference: ${pref.value.slice(0, 50)}…`);
          }
        }
        if (v.includes("short") || v.includes("concise")) {
          originInfluence.push(`Matches preference: ${pref.value.slice(0, 50)}…`);
        }
      }

      // General constraint: "avoid intros without warm context" → penalize when no shared_context
      for (const c of originConstraints) {
        const v = c.value.toLowerCase();
        if (v.includes("without warm") || v.includes("warm context")) {
          const hasSharedContext = person.facts.some((f) => f.type === "shared_context");
          if (!hasSharedContext) {
            preferenceMultiplier *= ORIGIN_PREFERENCE_PENALTY;
            originInfluence.push(`Constraint: ${c.value.slice(0, 50)}…`);
          }
        }
      }

      let score = (matchScore * 2 + recencyScore) * weight * preferenceMultiplier;
      const explanation =
        matchReasons.length > 0
          ? [matchReasons[0], recencyLabel].join(". ")
          : recencyLabel;

      return {
        personId: person.id,
        personName: person.name,
        score,
        explanation,
        originInfluence: originInfluence.length > 0 ? originInfluence : undefined,
      } as RankedEntry;
    })
    .filter((x): x is RankedEntry => x !== null);

  const aboveMin = scored.filter((e) => e.score > MIN_SCORE);
  aboveMin.sort((a, b) => b.score - a.score);
  return aboveMin;
}
