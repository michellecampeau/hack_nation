import type { IngestionConnector, IngestionResult } from "../types";

/**
 * Future: parse exported .txt chats; emit Events (message threads) and Facts (shared groups, topics);
 * identity resolution: phone -> Person.
 */
export const whatsappConnector: IngestionConnector = {
  name: "whatsapp",
  async ingest(): Promise<IngestionResult> {
    return { people: [], facts: [], events: [] };
  },
};
