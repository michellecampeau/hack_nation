import type { IngestionConnector, IngestionResult } from "../types";

/**
 * Manual connector: in MVP, manual entry goes through POST /api/people and POST /api/facts.
 * This connector's ingest() is used when we run a "persist from connector" job; for now it returns empty.
 */
export const manualConnector: IngestionConnector = {
  name: "manual",
  async ingest(): Promise<IngestionResult> {
    return { people: [], facts: [], events: [] };
  },
};
