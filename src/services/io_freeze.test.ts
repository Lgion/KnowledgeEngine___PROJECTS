import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './db_client';
import { createBundle } from './srv_bundle';
import { freezeBundle } from './io_freeze';

describe('io_freeze (Freeze / Promotion Logic)', () => {
    beforeEach(async () => {
        await db.sources.clear();
        await db.customEntries.clear();
    });

    it('should promote a bundle to a new source with merged notes', async () => {
        // 1. Create initial bundle
        const sourceId = await createBundle({
            name: "Original",
            type: "json",
            rawData: [{ q: "Q1", a: "A1" }],
            mapping: { promptField: "q", answerField: "a" }
        });

        // 2. Add custom notes to the entry
        const entries = await db.customEntries.where('sourceId').equals(sourceId).toArray();
        const entryId = entries[0].id!;
        await db.customEntries.update(entryId, {
            customLayers: { notes: "My custom note" }
        });

        // 3. Freeze it
        const newSourceId = await freezeBundle(sourceId, "Frozen Version");

        // 4. Verify new source
        const newSource = await db.sources.get(newSourceId);
        expect(newSource).toBeDefined();
        expect(newSource?.name).toBe("Frozen Version");
        expect(newSource?.type).toBe("custom");

        // originalData should contain the merged fields
        const frozenData = newSource?.originalData as Array<Record<string, any>>;
        expect(frozenData).toHaveLength(1);
        expect(frozenData[0].prompt).toBe("Q1");
        expect(frozenData[0].answer).toBe("A1");
        expect(frozenData[0].notes).toBe("My custom note");
    });

    it('should allow creating a new bundle from a frozen source (recursivity)', async () => {
        // 1. Create a bundle and freeze it
        const s1 = await createBundle({
            name: "Baseline",
            type: "json",
            rawData: [{ q: "X", a: "Y" }],
            mapping: { promptField: "q", answerField: "a" }
        });
        await db.customEntries.where('sourceId').equals(s1).modify({
            customLayers: { notes: "Layer 1" }
        });

        const s2 = await freezeBundle(s1, "Frozen");

        // 2. Initialize a new bundle from the frozen source
        const frozenSource = await db.sources.get(s2);
        const s3 = await createBundle({
            name: "Active 2",
            type: "custom",
            rawData: frozenSource!.originalData as Array<Record<string, any>>,
            mapping: { promptField: "prompt", answerField: "answer" }
        });

        // 3. Verify the new bundle has the notes from the previous one
        const entries = await db.customEntries.where('sourceId').equals(s3).toArray();
        expect(entries).toHaveLength(1);
        expect(entries[0].customLayers.notes).toBe("Layer 1");
    });
});
