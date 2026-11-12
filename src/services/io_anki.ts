import JSZip from "jszip";
import { type IngestionDiagnostic, type RawSource } from "../schemas/zod_models";

/**
 * Anki Ingestion Service
 * Handles extraction and parsing of .apkg files
 */

// Cache for SQL.js instance to avoid redundant WASM loading
let sqlPromise: Promise<unknown> | null = null;

async function getSQL(): Promise<unknown> {
    if (typeof window === 'undefined') return null;

    if (!sqlPromise) {
        // Use global initSqlJs from CDN script
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const initSqlJs = (window as any).initSqlJs;
        if (!initSqlJs) {
            console.error("SQL.js global not found. Ensure script is loaded.");
            return null;
        }

        sqlPromise = initSqlJs({
            locateFile: (file: string) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.12.0/${file}`
        });
    }
    return sqlPromise;
}

/**
 * Parses an Anki .apkg file and returns its content as a RawSource
 * @param file The .apkg file as a Blob/File
 */
export async function validateAnkiSource(file: File): Promise<IngestionDiagnostic & { rawData?: RawSource }> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let db: any = null;
    try {
        const zip = await JSZip.loadAsync(file);

        // 1. Find the collection file (anki2 or anki21)
        const collectionFile = zip.file("collection.anki21") || zip.file("collection.anki2");
        if (!collectionFile) {
            throw new Error("No collection.anki2 or collection.anki21 found in the package.");
        }

        const collectionBuffer = await collectionFile.async("uint8array");

        // 2. Load SQLite (cached)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const SQL = await getSQL() as any;
        if (!SQL) throw new Error("SQL.js engine unavailable. Try refreshing the page.");

        db = new SQL.Database(collectionBuffer);

        // 3. Extract models (to get field names)
        const colResult = db.exec("SELECT models FROM col");
        if (colResult.length === 0) throw new Error("Invalid Anki collection: No metadata found.");

        const models = JSON.parse(colResult[0].values[0][0] as string);

        // 4. Extract notes
        const notesResult = db.exec("SELECT mid, flds FROM notes");
        if (notesResult.length === 0) throw new Error("No notes found in the Anki package.");

        const rawData: RawSource = [];
        const detectedFieldsSet = new Set<string>();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        notesResult[0].values.forEach((row: any[]) => {
            const mid = String(row[0]);
            const fldsStr = row[1] as string;
            const fields = fldsStr.split('\x1f');

            const model = models[mid];
            if (!model) return;

            const item: Record<string, string> = {};
            model.flds.forEach((fld: { name: string }, idx: number) => {
                const fieldName = fld.name;
                item[fieldName] = fields[idx] || "";
                detectedFieldsSet.add(fieldName);
            });

            rawData.push(item);
        });

        return {
            isValid: true,
            isBundle: false,
            totalItems: rawData.length,
            validItems: rawData.length,
            invalidItems: 0,
            errors: [],
            duplicateCount: 0,
            detectedFields: Array.from(detectedFieldsSet),
            rawData
        };

    } catch (error) {
        return {
            isValid: false,
            isBundle: false,
            totalItems: 0,
            validItems: 0,
            invalidItems: 1,
            errors: [{ index: 0, message: "Anki Import Failed: " + (error as Error).message }],
            detectedFields: [],
            duplicateCount: 0
        };
    } finally {
        if (db) {
            db.close();
        }
    }
}
