import { z } from "zod";

/**
 * SRS Stats model
 */
export const SRSStatsSchema = z.object({
    interval: z.number().default(0),
    repetition: z.number().default(0),
    efactor: z.number().default(2.5),
    nextReview: z.coerce.date().default(() => new Date()),
    history: z.array(z.object({
        date: z.coerce.date(),
        quality: z.number(),
    })).default([]),
    isReflexVerified: z.boolean().default(false),
    createdAt: z.coerce.date().default(() => new Date()),
    updatedAt: z.coerce.date().default(() => new Date()),
});

export type SRSStats = z.infer<typeof SRSStatsSchema>;

/**
 * Source table schema
 * Represents the immutable original data
 */
export const SourceSchema = z.object({
    id: z.string().uuid().optional(),
    name: z.string(),
    type: z.enum(["json", "anki", "custom"]),
    originalData: z.unknown(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    isSystemSource: z.boolean().default(false),
    createdAt: z.coerce.date().default(() => new Date()),
    updatedAt: z.coerce.date().default(() => new Date()),
});

export type Source = z.infer<typeof SourceSchema>;

/**
 * CustomEntries table schema
 * Represents the mutable overlay with notes and SRS stats
 */
export const CustomEntrySchema = z.object({
    id: z.string().uuid().optional(),
    sourceId: z.string(), // Reference to Source.id
    prompt: z.string(),
    answer: z.string(),
    stats: SRSStatsSchema,
    customLayers: z.record(z.string(), z.unknown()).default({}),
    metadata: z.record(z.string(), z.unknown()).optional(),
    createdAt: z.coerce.date().default(() => new Date()),
    updatedAt: z.coerce.date().default(() => new Date()),
});

export type CustomEntry = z.infer<typeof CustomEntrySchema>;

/**
 * Ingestion Schemas
 */

// Format for raw JSON items before mapping
export const RawItemSchema = z.record(z.string(), z.unknown()).refine(
    (obj) => Object.keys(obj).length > 0,
    { message: "Item cannot be empty" }
);

// Format for flattened items (includes _key)
export const FlattenedItemSchema = z.record(z.string(), z.unknown());

export const RawSourceSchema = z.array(FlattenedItemSchema);

export type RawItem = z.infer<typeof RawItemSchema>;
export type RawSource = z.infer<typeof RawSourceSchema>;

// Diagnostic report for ingestion
export const IngestionDiagnosticSchema = z.object({
    isValid: z.boolean(),
    isBundle: z.boolean().default(false),
    totalItems: z.number(),
    validItems: z.number(),
    invalidItems: z.number(),
    errors: z.array(z.object({
        index: z.number(),
        message: z.string(),
        data: z.unknown().optional()
    })),
    duplicateCount: z.number().default(0),
    detectedFields: z.array(z.string())
});

export type IngestionDiagnostic = z.infer<typeof IngestionDiagnosticSchema>;

/**
 * Knowledge Bundle Schema
 * Format for exporting and importing full bundles with stats
 */
export const KnowledgeBundleSchema = z.object({
    version: z.string().default("1.0"),
    exportDate: z.coerce.date().default(() => new Date()),
    source: SourceSchema,
    entries: z.array(CustomEntrySchema),
});

export type KnowledgeBundle = z.infer<typeof KnowledgeBundleSchema>;
