import { db } from "./db_client";
import { type Source } from "../schemas/zod_models";

/**
 * Freeze Service
 * Handles promoting CustomEntries back to a new immutable Source
 */

/**
 * Creates a new Source from the current state of a bundle's CustomEntries
 * @param sourceId The ID of the current source/bundle
 * @param newName Name for the new frozen source
 * @returns The ID of the newly created source
 */
export async function freezeBundle(sourceId: string, newName: string): Promise<string> {
    // 1. Fetch current entries
    const entries = await db.customEntries
        .where('sourceId')
        .equals(sourceId)
        .toArray();

    if (entries.length === 0) {
        throw new Error("Cannot freeze an empty bundle.");
    }

    // 2. Consolidate data into RawItem format
    const frozenData = entries.map(entry => ({
        prompt: entry.prompt,
        answer: entry.answer,
        notes: (entry.customLayers?.notes as string) || "",
        // Isolate metadata to prevent overwriting keys
        metadata: {
            ...(entry.metadata || {})
        }
    }));

    // 3. Create new Source
    const newSourceId = crypto.randomUUID();
    const now = new Date();

    const newSource: Source = {
        id: newSourceId,
        name: newName,
        type: "custom",
        originalData: frozenData,
        metadata: {
            frozenFrom: sourceId,
            itemCount: frozenData.length,
            frozenDate: now
        },
        createdAt: now,
        updatedAt: now,
        isSystemSource: false
    };

    // 4. Persist
    await db.sources.add(newSource);

    return newSourceId;
}
