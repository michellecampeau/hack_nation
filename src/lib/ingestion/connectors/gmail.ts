import type { IngestionConnector, IngestionResult } from "../types";

/**
 * Future: Gmail API; emit Events (email threads) and Facts (expertise, org role, recency);
 * identity resolution: email -> Person.
 */
export const gmailConnector: IngestionConnector = {
  name: "gmail",
  async ingest(): Promise<IngestionResult> {
    return { people: [], facts: [], events: [] };
  },
};
