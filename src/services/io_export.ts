import { db } from "./db_client";
import { type KnowledgeBundle } from "../schemas/zod_models";

/**
 * Export Service
 * Handles packaging and downloading full bundles
 */

/**
 * Exports a full bundle (Source + CustomEntries) as a JSON file
 * @param sourceId The ID of the source to export
 */
export async function exportBundle(sourceId: string): Promise<void> {
    // 1. Fetch Source
    const source = await db.sources.get(sourceId);
    if (!source) {
        throw new Error(`Source with ID ${sourceId} not found.`);
    }

    // 2. Fetch all linked CustomEntries
    const entries = await db.customEntries
        .where('sourceId')
        .equals(sourceId)
        .toArray();

    // 3. Package as Bundle
    const bundle: KnowledgeBundle = {
        version: "1.0",
        exportDate: new Date(),
        source,
        entries
    };

    // 4. Generate and trigger download
    try {
        const jsonString = JSON.stringify(bundle, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;

        // Clean filename: remove special chars and spaces
        const safeName = source.name
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Remove accents
            .replace(/[^a-z0-9]/gi, '_')
            .toLowerCase();
        link.download = `${safeName}_bundle.json`;

        document.body.appendChild(link);
        link.click();

        // Cleanup
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error("Export failed:", error);
        throw new Error("Could not generate export file.");
    }
}
