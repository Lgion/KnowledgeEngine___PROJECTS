import { describe, it, expect, beforeEach } from 'vitest';
import { createBundle } from './srv_bundle';
import { db } from './db_client';

describe('srv_bundle', () => {
    beforeEach(async () => {
        await db.sources.clear();
        await db.customEntries.clear();
    });

    it('should create a source and custom entries from raw data', async () => {
        const rawData = [
            { id: 1, front: "Q1", back: "A1" },
            { id: 2, front: "Q2", back: "A2" }
        ];

        const sourceId = await createBundle({
            name: "Test Bundle",
            type: "json",
            rawData,
            mapping: {
                promptField: "front",
                answerField: "back"
            }
        });

        const source = await db.sources.get(sourceId);
        expect(source).toBeDefined();
        expect(source?.name).toBe("Test Bundle");

        const entries = (await db.customEntries.where("sourceId").equals(sourceId).toArray()).sort((a, b) => a.prompt.localeCompare(b.prompt));
        expect(entries.length).toBe(2);
        expect(entries[0].prompt).toBe("Q1");
        expect(entries[0].answer).toBe("A1");
        expect(entries[0].stats.efactor).toBe(2.5);
    });
});
