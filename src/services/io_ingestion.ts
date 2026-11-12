import { RawItemSchema, type IngestionDiagnostic, type RawItem, KnowledgeBundleSchema, type KnowledgeBundle } from "../schemas/zod_models";
import { db } from "./db_client";

/**
 * Ingestion Service
 * Handles validation and transformation of external data sources
 */

/**
 * Helper to stringify an object with sorted keys for robust duplicate detection
 */
function stableStringify(obj: Record<string, unknown>): string {
    return JSON.stringify(obj, Object.keys(obj).sort());
}

/**
 * Validates a raw JSON object as a Knowledge Engine source
 * @param data The raw JSON data to validate
 * @returns An IngestionDiagnostic object
 */
export async function validateJsonSource(data: unknown): Promise<IngestionDiagnostic> {
    // 1. Check if it's a Knowledge Bundle (Full export)
    const bundleResult = KnowledgeBundleSchema.safeParse(data);
    if (bundleResult.success) {
        return {
            isValid: true,
            isBundle: true,
            totalItems: bundleResult.data.entries.length,
            validItems: bundleResult.data.entries.length,
            invalidItems: 0,
            errors: [],
            duplicateCount: 0,
            detectedFields: ["Bundle Format (Protected)"]
        };
    }

    // 2. Fallback to Raw Array validation
    let flattenedData: any[] = [];

    if (Array.isArray(data)) {
        flattenedData = data;
    } else if (typeof data === "object" && data !== null) {
        // Handle Dictionary/Map style: { "key1": { ... }, "key2": { ... } }
        // We transform this into: [ { _key: "key1", ... }, { _key: "key2", ... } ]

        // Check if it looks like a dictionary (values are objects)
        const entries = Object.entries(data);
        const firstValue = entries[0]?.[1];

        if (typeof firstValue === "object" && firstValue !== null) {
            flattenedData = entries.map(([key, value]) => ({
                _key: key,
                ...(value as object)
            }));
        } else {
            // Fallback for simple key-value pairs or unknowns -> treat as single item or error?
            // For now, let's treat the object itself as a single item if possible, or fail if it's unrelated
            // But wait, the previous logic returned error for non-array. 
            // Let's stick to: if it's a map of objects, flatten. Else, fail if not array.

            // Check if it was meant to be a bundle but failed
            const isLikelyBundle = "version" in data || "source" in data;
            if (isLikelyBundle && !bundleResult.success) {
                return {
                    isValid: false,
                    isBundle: true,
                    totalItems: 0,
                    validItems: 0,
                    invalidItems: 1,
                    errors: bundleResult.error.issues.map(issue => ({
                        index: 0,
                        message: `Bundle Validation Error: ${issue.path.join(".")} -> ${issue.message}`,
                        data: (data as any).entries
                    })),
                    duplicateCount: 0,
                    detectedFields: []
                };
            }

            return {
                isValid: false,
                isBundle: false,
                totalItems: 0,
                validItems: 0,
                invalidItems: 1,
                errors: [{ index: 0, message: "Input must be a JSON array OR a Dictionary of objects" }],
                duplicateCount: 0,
                detectedFields: []
            };
        }
    } else {
        return {
            isValid: false,
            isBundle: false,
            totalItems: 0,
            validItems: 0,
            invalidItems: 1,
            errors: [{ index: 0, message: "Input must be a JSON array or Object" }],
            duplicateCount: 0,
            detectedFields: []
        };
    }

    const totalItems = flattenedData.length;
    let validItems = 0;
    let invalidItems = 0;
    const errors: IngestionDiagnostic["errors"] = [];
    const detectedFieldsSet = new Set<string>();
    const seen = new Set<string>();
    let duplicateCount = 0;

    flattenedData.forEach((item, idx) => {
        const result = RawItemSchema.safeParse(item);

        if (!result.success) {
            invalidItems++;
            errors.push({
                index: idx,
                message: `Item at index ${idx}: ${result.error.issues[0].message}`,
                data: item
            });
        } else {
            validItems++;
            const validatedItem = result.data as RawItem;

            // Detect fields
            Object.keys(validatedItem).forEach(key => detectedFieldsSet.add(key));

            // Detect duplicates (stable)
            const str = stableStringify(validatedItem);
            if (seen.has(str)) {
                duplicateCount++;
            } else {
                seen.add(str);
            }
        }
    });

    return {
        isValid: errors.length === 0 && totalItems > 0,
        isBundle: false,
        totalItems,
        validItems,
        invalidItems,
        errors,
        duplicateCount,
        detectedFields: Array.from(detectedFieldsSet)
    };
}

/**
 * Imports a full knowledge bundle into the database
 * @param bundle The validated knowledge bundle
 */
export async function importKnowledgeBundle(bundle: KnowledgeBundle): Promise<string> {
    const { source, entries } = bundle;

    // 1. Check if source with same name already exists to avoid confusion
    const existingSource = await db.sources.where('name').equals(source.name).first();
    const sourceIdToUse = existingSource ? existingSource.id! : crypto.randomUUID();

    const updatedSource = {
        ...source,
        id: sourceIdToUse,
        updatedAt: new Date(),
    };

    // If source exists, we might want to clear old entries or just add new ones?
    // Let's replace entries for this source if it's a re-import of the same name.
    if (existingSource) {
        await db.customEntries.where('sourceId').equals(sourceIdToUse).delete();
    }

    const updatedEntries = entries.map(entry => ({
        ...entry,
        id: crypto.randomUUID(),
        sourceId: sourceIdToUse,
        // Preserve original timestamps if present, fallback to now
        createdAt: entry.createdAt || new Date(),
        updatedAt: new Date(),
    }));

    await db.transaction("rw", db.sources, db.customEntries, async () => {
        await db.sources.put(updatedSource);
        await db.customEntries.bulkAdd(updatedEntries);
    });

    return sourceIdToUse;
}
