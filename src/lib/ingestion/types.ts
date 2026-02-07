/**
 * Ingestion connector contract. All ingestors (manual, WhatsApp, Gmail) implement this.
 * Manual persistence in MVP is done via POST /api/people and POST /api/facts; this
 * interface is for future job-based ingestion (e.g. run WhatsAppConnector.ingest() then persist).
 */

export interface PersonPayload {
  name: string;
  primaryEmail?: string | null;
  phone?: string | null;
  organization?: string | null;
  role?: string | null;
  tags?: string[] | null;
  relationshipState?: string;
  lastContacted?: Date | null;
  notes?: string | null;
  externalId?: string;
}

export interface FactPayload {
  type: string;
  value: string;
  author?: string;
  confidence?: number;
  timestamp?: Date;
  sourceType: string;
  sourceRef?: string | null;
  personExternalId: string;
}

export interface EventPayload {
  type: string;
  channel: string;
  timestamp?: Date;
  participants?: string[];
  contentRef?: string | null;
}

export interface IngestionResult {
  people: PersonPayload[];
  facts: FactPayload[];
  events: EventPayload[];
}

export interface IngestionConnector {
  name: string;
  ingest(): Promise<IngestionResult>;
}
