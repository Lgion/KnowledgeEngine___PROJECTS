import Dexie, { type Table } from "dexie";
import { type Source, type CustomEntry } from "../schemas/zod_models";

export const DB_NAME = "KnowledgeEngineDB";

/**
 * Knowledge Engine Database Client
 * Offline-First powered by Dexie.js
 */
export class KnowledgeEngineDB extends Dexie {
    // Tables are defined by their interfaces
    sources!: Table<Source>;
    customEntries!: Table<CustomEntry>;

    constructor() {
        super(DB_NAME);

        // Define table schemas and indexes
        // Primary key is 'id' (UUID string).
        // & marks unique index for [sourceId+prompt] to prevent duplicates.
        // Indexing stats.nextReview for the SRS engine.
        this.version(2).stores({
            sources: "id, name, type, createdAt",
            customEntries: "id, sourceId, prompt, updatedAt, stats.nextReview, metadata.isDeepGap, &[sourceId+prompt]",
        });
    }
}

// Singleton instance for the application
export const db = new KnowledgeEngineDB();
