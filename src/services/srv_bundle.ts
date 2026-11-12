import { db } from "./db_client";
import {
    type RawSource,
    type Source,
    type CustomEntry,
    type SRSStats
} from "../schemas/zod_models";

interface CreateBundleParams {
    name: string;
    type: "json" | "anki" | "custom";
    rawData: RawSource;
    mapping: {
        promptField: string;
        answerField: string[];
        tipFields?: string[];
    };
}

/**
 * Bundle Service
 * Coordinates the creation of Sources and their associated CustomEntries
 */

/**
 * Creates a new learning bundle in the database
 * @param params Configuration for the bundle creation
 * @returns The created source ID
 */
export async function createBundle(params: CreateBundleParams): Promise<string> {
    const { name, type, mapping } = params;
    let { rawData } = params;

    // Robust Flattening: If rawData is a dictionary/object, transform to array
    if (!Array.isArray(rawData) && typeof rawData === "object" && rawData !== null) {
        rawData = Object.entries(rawData).map(([key, value]) => ({
            _key: key,
            ...(value as object)
        }));
    }

    const sourceId = crypto.randomUUID();
    const now = new Date();

    // 1. Prepare Source record
    const source: Source = {
        id: sourceId,
        name,
        type,
        originalData: rawData,
        metadata: {
            mapping,
            itemCount: rawData.length
        },
        createdAt: now,
        updatedAt: now,
        isSystemSource: false
    };

    // 2. Prepare CustomEntries mapping
    const customEntries: CustomEntry[] = rawData.map((item, idx) => {
        const prompt = String(item[mapping.promptField] ?? "No Prompt");

        // Handle Answer (Multiple Fields)
        const answerParts = mapping.answerField.map(field => {
            const val = item[field];
            if (Array.isArray(val)) return val.join("\n"); // Handle arrays inside fields
            const strVal = String(val ?? "");
            // Filter out literal "undefined" or "null" strings that might come from bad data/AI
            const lowerVal = strVal.trim().toLowerCase();
            if (lowerVal === "undefined" || lowerVal === "null") return "";
            return strVal;
        }).filter(s => s.trim() !== "");

        const answer = answerParts.length > 0 ? answerParts.join("\n") : "Aucune valeur";

        const stats: SRSStats = {
            interval: 0,
            repetition: 0,
            efactor: 2.5,
            nextReview: now,
            history: [],
            isReflexVerified: false,
            createdAt: now,
            updatedAt: now
        };

        return {
            id: crypto.randomUUID(),
            sourceId,
            prompt,
            answer,
            stats,
            customLayers: {
                notes: item.notes || "",
                rawData: item // Store full flattened item for dynamic runtime mapping
            },
            metadata: {
                originalIndex: idx
            },
            createdAt: now,
            updatedAt: now
        };
    });

    // 3. Persist in transaction
    await db.transaction("rw", db.sources, db.customEntries, async () => {
        await db.sources.add(source);
        await db.customEntries.bulkAdd(customEntries);
    });

    return sourceId;
}
