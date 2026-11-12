import { GoogleGenAI, ThinkingLevel, type Part } from "@google/genai";
import { NextResponse } from "next/server";
import { type z, type ZodTypeDef } from "zod";

/**
 * Canonical Gemini 4 model identifiers used across API routes.
 * - FAST (Hydrogen): low latency, structured extraction, batch tasks, live quiz tutor
 * - DEEP (Argon): deeper pedagogical reasoning for hard items & mnemonic design
 */
export const GEMINI_MODELS = {
    FAST: process.env.GEMINI_MODEL_FAST || "gemini-4-hydrogen",
    DEEP: process.env.GEMINI_MODEL_DEEP || "gemini-4-argon",
} as const;

export type GeminiModelId = typeof GEMINI_MODELS[keyof typeof GEMINI_MODELS];

export { ThinkingLevel };

export class GeminiConfigError extends Error {
    constructor(message = "GEMINI_API_KEY is not configured") {
        super(message);
        this.name = "GeminiConfigError";
    }
}

let cachedClient: GoogleGenAI | null = null;
let cachedApiKey: string | undefined;

/**
 * Returns a configured GoogleGenAI server client, throwing GeminiConfigError if key is absent.
 */
export function getGeminiClient(): GoogleGenAI {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
        throw new GeminiConfigError();
    }
    if (!cachedClient || cachedApiKey !== apiKey) {
        cachedClient = new GoogleGenAI({ apiKey });
        cachedApiKey = apiKey;
    }
    return cachedClient;
}

/**
 * Extracts raw JSON from a model response text, stripping optional markdown fences if present.
 */
export function parseJsonResponse(rawText: string): unknown {
    const trimmed = rawText.trim();
    if (!trimmed) {
        throw new Error("Empty response from AI");
    }

    try {
        return JSON.parse(trimmed);
    } catch {
        const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
        if (fenced?.[1]) {
            return JSON.parse(fenced[1].trim());
        }
        const objOrArr = trimmed.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
        if (objOrArr?.[1]) {
            return JSON.parse(objOrArr[1]);
        }
        throw new Error("Failed to parse AI response as JSON");
    }
}

interface StructuredJsonParams<T> {
    model: GeminiModelId;
    contents: string | Part[];
    jsonSchema: Record<string, unknown>;
    zodSchema: z.ZodType<T, ZodTypeDef, unknown>;
    thinkingLevel?: ThinkingLevel;
    temperature?: number;
    systemInstruction?: string;
    maxOutputTokens?: number;
}

/**
 * Generates structured JSON validated against both a Gemini responseJsonSchema and a Zod schema.
 */
export async function generateStructuredJson<T>({
    model,
    contents,
    jsonSchema,
    zodSchema,
    thinkingLevel,
    temperature,
    systemInstruction,
    maxOutputTokens,
}: StructuredJsonParams<T>): Promise<T> {
    const client = getGeminiClient();

    const response = await client.models.generateContent({
        model,
        contents: typeof contents === "string"
            ? [{ role: "user", parts: [{ text: contents }] }]
            : [{ role: "user", parts: contents }],
        config: {
            responseMimeType: "application/json",
            responseJsonSchema: jsonSchema,
            ...(thinkingLevel ? { thinkingConfig: { thinkingLevel } } : {}),
            ...(temperature !== undefined ? { temperature } : {}),
            ...(systemInstruction ? { systemInstruction } : {}),
            ...(maxOutputTokens !== undefined ? { maxOutputTokens } : {}),
        },
    });

    const rawText = response.text ?? "";
    const parsed = parseJsonResponse(rawText);
    return zodSchema.parse(parsed);
}

interface PlainTextParams {
    model: GeminiModelId;
    contents: string | Part[];
    thinkingLevel?: ThinkingLevel;
    temperature?: number;
    systemInstruction?: string;
    maxOutputTokens?: number;
}

/**
 * Generates plain text with Gemini 4.
 */
export async function generatePlainText({
    model,
    contents,
    thinkingLevel,
    temperature,
    systemInstruction,
    maxOutputTokens,
}: PlainTextParams): Promise<string> {
    const client = getGeminiClient();

    const response = await client.models.generateContent({
        model,
        contents: typeof contents === "string"
            ? [{ role: "user", parts: [{ text: contents }] }]
            : [{ role: "user", parts: contents }],
        config: {
            ...(thinkingLevel ? { thinkingConfig: { thinkingLevel } } : {}),
            ...(temperature !== undefined ? { temperature } : {}),
            ...(systemInstruction ? { systemInstruction } : {}),
            ...(maxOutputTokens !== undefined ? { maxOutputTokens } : {}),
        },
    });

    const text = response.text?.trim() ?? "";
    if (!text) {
        throw new Error("Empty response from AI");
    }
    return text;
}

/**
 * Maps AI route errors to consistent NextResponse payloads.
 */
export function handleGeminiRouteError(context: string, error: unknown): NextResponse {
    console.error(`${context}:`, error);

    if (error instanceof GeminiConfigError) {
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }

    const message = error instanceof Error ? error.message : "Unknown AI error";
    return NextResponse.json(
        { error: `${context} failed`, details: message },
        { status: 500 }
    );
}
