import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './db_client';
import { importKnowledgeBundle } from './io_ingestion';
import { type KnowledgeBundle, KnowledgeBundleSchema } from '../schemas/zod_models';

describe('io_bundle (Enriched Import/Export)', () => {
    beforeEach(async () => {
        await db.sources.clear();
        await db.customEntries.clear();
    });

    it('should validate a valid bundle schema', () => {
        const rawBundle = {
            version: "1.0",
            exportDate: new Date().toISOString(),
            source: {
                name: "Test Bundle",
                type: "json",
                originalData: [],
            },
            entries: [
                {
                    sourceId: "some-uuid",
                    prompt: "Q1",
                    answer: "A1",
                    stats: {
                        interval: 10,
                        repetition: 5,
                    },
                    customLayers: { notes: "Note 1" }
                }
            ]
        };

        const result = KnowledgeBundleSchema.safeParse(rawBundle);
        expect(result.success).toBe(true);
    });

    it('should import a full bundle and preserve stats/notes', async () => {
        const bundle: KnowledgeBundle = {
            version: "1.0",
            exportDate: new Date(),
            source: {
                name: "Test Bundle",
                type: "json",
                originalData: [],
                createdAt: new Date(),
                updatedAt: new Date(),
                isSystemSource: false
            },
            entries: [
                {
                    sourceId: "old-id",
                    prompt: "Question 1",
                    answer: "Answer 1",
                    stats: {
                        interval: 10,
                        repetition: 5,
                        efactor: 2.8,
                        nextReview: new Date(),
                        history: [],
                        isReflexVerified: true,
                        createdAt: new Date(),
                        updatedAt: new Date()
                    },
                    customLayers: { notes: "My critical note" },
                    createdAt: new Date(),
                    updatedAt: new Date()
                }
            ]
        };

        const newId = await importKnowledgeBundle(bundle);

        const importedSource = await db.sources.get(newId);
        expect(importedSource).toBeDefined();
        expect(importedSource?.name).toBe("Test Bundle");

        const importedEntries = await db.customEntries.where('sourceId').equals(newId).toArray();
        expect(importedEntries).toHaveLength(1);
        expect(importedEntries[0].stats.repetition).toBe(5);
        expect(importedEntries[0].stats.isReflexVerified).toBe(true);
        expect(importedEntries[0].customLayers.notes).toBe("My critical note");

        // Ensure IDs were regenerated to avoid collisions
        expect(importedSource?.id).not.toBe(bundle.source.id);
        expect(importedEntries[0].id).not.toBe(bundle.entries[0].id);
        expect(importedEntries[0].sourceId).toBe(newId);
    });

    it('should replace entries but keep source metadata when re-importing same name', async () => {
        const bundle: KnowledgeBundle = {
            version: "1.0",
            exportDate: new Date(),
            source: {
                name: "Unique Bundle",
                type: "json",
                originalData: [],
                createdAt: new Date(),
                updatedAt: new Date(),
                isSystemSource: false
            },
            entries: [{ prompt: "Q1", answer: "A1", sourceId: "old", stats: {} as any, customLayers: {}, createdAt: new Date(), updatedAt: new Date() }]
        };

        const id1 = await importKnowledgeBundle(bundle);

        // Change entry and re-import
        bundle.entries[0].prompt = "Q1-modified";
        const id2 = await importKnowledgeBundle(bundle);

        expect(id1).toBe(id2); // Same source ID used
        const entries = await db.customEntries.where('sourceId').equals(id1).toArray();
        expect(entries).toHaveLength(1);
        expect(entries[0].prompt).toBe("Q1-modified"); // Replaced
    });
});
