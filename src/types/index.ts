// Add your custom types here

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

// --- AI Chief of Staff ---

export const RELATIONSHIP_STATES = ["ok", "warm_up", "do_not_contact"] as const;
export const FACT_TYPES = [
  "expertise",
  "interest",
  "shared_context",
  "preference",
  "relationship_status",
  "logistics",
  "goal",
  "constraint",
] as const;
export const FACT_AUTHORS = ["me", "them", "inferred"] as const;
export const FACT_SOURCE_TYPES = ["manual", "whatsapp", "gmail"] as const;

export type RelationshipState = (typeof RELATIONSHIP_STATES)[number];
export type FactType = (typeof FACT_TYPES)[number];
export type FactAuthor = (typeof FACT_AUTHORS)[number];
export type FactSourceType = (typeof FACT_SOURCE_TYPES)[number];

export interface PersonRecord {
  id: string;
  isOrigin?: boolean;
  name: string;
  primaryEmail: string | null;
  phone: string | null;
  organization: string | null;
  role: string | null;
  tags: string[] | null;
  relationshipState: string;
  lastContacted: Date | null;
  notes: string | null;
  hometown: string | null;
  birthday: string | null;
  venmo: string | null;
  universities: string[] | null;
  interests: string[] | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FactRecord {
  id: string;
  personId: string;
  type: string;
  value: string;
  author: string;
  confidence: number;
  timestamp: Date;
  sourceType: string;
  sourceRef: string | null;
  createdAt: Date;
}

export interface PersonWithFacts extends PersonRecord {
  facts: FactRecord[];
}

export interface RankRequest {
  query: string;
  relationshipState?: string;
  tags?: string[];
}

export interface RankedEntry {
  personId: string;
  personName: string;
  score: number;
  explanation: string;
  originInfluence?: string[];
}

export interface RankResponse {
  ranked: RankedEntry[];
  query: string;
}

export interface ComposeRequest {
  personId: string;
  goal?: string;
  format?: "email" | "text";
  refinement?: string;
}

export interface ComposeResponse {
  bio: string;
  connectionPoints: string[];
  message: string;
}
