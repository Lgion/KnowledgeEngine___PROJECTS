import { db } from "./db_client";
import { type KnowledgeBundle } from "../schemas/zod_models";

/**
 * Sync Service
 * Handles pushing local Dexie data to the cloud and pulling updates.
 */

export async function pushAllToCloud(): Promise<{ success: number; failed: number }> {
    const sources = await db.sources.toArray();
    let successCount = 0;
    let failedCount = 0;

    for (const source of sources) {
        try {
            // 1. Reconstruct the full bundle
            const entries = await db.customEntries.where("sourceId").equals(source.id!).toArray();
            const bundle: KnowledgeBundle = {
                version: "1.0",
                exportDate: new Date(),
                source,
                entries
            };

            // 2. Push to API
            const response = await fetch("/api/sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ bundle })
            });

            if (response.ok) {
                successCount++;
            } else {
                console.error(`Failed to sync source ${source.id}:`, await response.text());
                failedCount++;
            }
        } catch (error) {
            console.error(`Sync error for source ${source.id}:`, error);
            failedCount++;
        }
    }

    return { success: successCount, failed: failedCount };
}

/**
 * Pulls all bundles from the cloud and merges them into the local database
 */
export async function pullFromCloud(): Promise<{ merged: number; created: number }> {
    const response = await fetch("/api/sync");
    if (!response.ok) {
        throw new Error("Failed to fetch cloud bundles");
    }

    const { bundles } = await response.json();
    let mergedCount = 0;
    let createdCount = 0;

    for (const remoteBundle of bundles) {
        const localSource = await db.sources.get(remoteBundle.source.id);

        if (!localSource) {
            // New bundle from cloud
            await db.transaction("rw", db.sources, db.customEntries, async () => {
                await db.sources.add(remoteBundle.source);
                await db.customEntries.bulkAdd(remoteBundle.entries);
            });
            createdCount++;
        } else {
            // Potential merge needed (Last Write Wins for simplicity in MVP)
            const remoteUpdateTime = new Date(remoteBundle.source.updatedAt).getTime();
            const localUpdateTime = new Date(localSource.updatedAt).getTime();

            if (remoteUpdateTime > localUpdateTime) {
                await db.transaction("rw", db.sources, db.customEntries, async () => {
                    await db.sources.put(remoteBundle.source);
                    // Bulk put for entries to update existing and add new
                    await db.customEntries.bulkPut(remoteBundle.entries);
                });
                mergedCount++;
            }
        }
    }

    return { merged: mergedCount, created: createdCount };
}
