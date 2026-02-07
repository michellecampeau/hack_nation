import { z } from "zod";
import {
  RELATIONSHIP_STATES,
  FACT_TYPES,
  FACT_AUTHORS,
} from "@/types";

const relationshipStateSchema = z.enum(RELATIONSHIP_STATES);
const factTypeSchema = z.enum(FACT_TYPES);
const factAuthorSchema = z.enum(FACT_AUTHORS);

export const createPersonSchema = z.object({
  name: z.string().min(1, "Name is required"),
  primaryEmail: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  organization: z.string().optional(),
  role: z.string().optional(),
  tags: z.array(z.string()).optional(),
  relationshipState: relationshipStateSchema.optional().default("ok"),
  lastContacted: z.string().optional(),
  notes: z.string().optional(), // full text, no length limit
  hometown: z.string().optional(),
  birthday: z.string().optional(),
  venmo: z.string().optional(),
  universities: z.array(z.string()).optional(),
  interests: z.array(z.string()).optional(),
  userId: z.string().optional(),
});

export const createFactSchema = z.object({
  personId: z.string().min(1, "personId is required"),
  type: factTypeSchema,
  value: z.string().min(1, "Value is required"),
  author: factAuthorSchema.optional().default("me"),
  confidence: z.number().min(0).max(1).optional().default(1),
  sourceType: z.literal("manual").optional().default("manual"),
  sourceRef: z.string().optional(),
});

export const rankRequestSchema = z.object({
  query: z.string().min(1, "Query is required"),
  relationshipState: relationshipStateSchema.optional(),
  tags: z.array(z.string()).optional(),
});

export const composeRequestSchema = z.object({
  personId: z.string().min(1, "personId is required"),
  goal: z.string().optional(),
});

export const updatePersonSchema = createPersonSchema.partial();

export type CreatePersonInput = z.infer<typeof createPersonSchema>;
export type UpdatePersonInput = z.infer<typeof updatePersonSchema>;
export type CreateFactInput = z.infer<typeof createFactSchema>;
export type RankRequestInput = z.infer<typeof rankRequestSchema>;
export type ComposeRequestInput = z.infer<typeof composeRequestSchema>;
