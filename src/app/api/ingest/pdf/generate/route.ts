import { NextResponse } from "next/server";
import { type Part } from "@google/genai";
import { z } from "zod";
import { GEMINI_MODELS, ThinkingLevel, generateStructuredJson, handleGeminiRouteError } from "@/lib/gemini";
import { enforcePdfIngestQuota } from "@/lib/rate_limit";

export const runtime = "nodejs";

const MAX_PDF_BYTES = 10 * 1024 * 1024; // 10 MB inline PDF limit
const MAX_TEXT_CHARS = 500_000; // Leverages Gemini 4's 1M-token context window

const GeneratedQuizSchema = z.object({
    items: z.array(
        z.object({
            prompt: z.string().min(1),
            answer: z.string().min(1),
            notes: z.string().optional().default(""),
        })
    ),
});

const GENERATED_QUIZ_JSON_SCHEMA = {
    type: "object",
    properties: {
        items: {
            type: "array",
            description: "High-quality flashcards / quiz items extracted from the document.",
            items: {
                type: "object",
                properties: {
                    prompt: { type: "string", description: "Clear question or cue." },
                    answer: { type: "string", description: "Concise, unambiguous answer." },
                    notes: { type: "string", description: "Brief explanation, context, or mnemonic." },
                },
                required: ["prompt", "answer", "notes"],
            },
        },
    },
    required: ["items"],
};

function buildInstructions(customPrompt?: string, targetLanguage?: string, isMultimodal = false): string {
    return `Act as an expert educator and knowledge architect.
Extract the core concepts, facts, formulas, vocabulary, or rules from the provided ${isMultimodal ? "PDF document (inspecting text, tables, diagrams, and visual content)" : "source text"} and convert them into a high-signal spaced-repetition quiz bundle.

USER INSTRUCTIONS:
${customPrompt?.trim() ? `Follow these custom instructions strictly: ${customPrompt.trim()}` : "Extract the most important concepts (typically 10-25 high-value items depending on document density)."}
${targetLanguage?.trim() ? `OUTPUT LANGUAGE: All fields (prompt, answer, notes) MUST be written in ${targetLanguage.trim()}.` : ""}

QUALITY RULES:
- Make each "prompt" self-contained and unambiguous.
- Keep "answer" concise and testable in a multiple-choice or recall quiz.
- Use "notes" for helpful context, nuance, or a quick mnemonic.`;
}

export async function POST(req: Request) {
    try {
        const quotaError = await enforcePdfIngestQuota();
        if (quotaError) return quotaError;

        const contentType = req.headers.get("content-type") || "";
        let contents: string | Part[];

        if (contentType.includes("multipart/form-data")) {
            const formData = await req.formData();
            const file = formData.get("file");
            const customPrompt = String(formData.get("customPrompt") ?? "");
            const targetLanguage = String(formData.get("targetLanguage") ?? "");

            if (!(file instanceof File)) {
                return NextResponse.json({ error: "No PDF file provided" }, { status: 400 });
            }
            if (file.size > MAX_PDF_BYTES) {
                return NextResponse.json(
                    { error: `PDF exceeds 10MB limit (${(file.size / 1024 / 1024).toFixed(2)} MB)` },
                    { status: 400 }
                );
            }

            const base64Pdf = Buffer.from(await file.arrayBuffer()).toString("base64");
            contents = [
                {
                    inlineData: {
                        data: base64Pdf,
                        mimeType: "application/pdf",
                    },
                },
                { text: buildInstructions(customPrompt, targetLanguage, true) },
            ];
        } else {
            const { text, customPrompt, targetLanguage } = await req.json();

            if (typeof text !== "string" || text.trim().length === 0) {
                return NextResponse.json({ error: "No text provided" }, { status: 400 });
            }

            contents = `${buildInstructions(customPrompt, targetLanguage, false)}

TEXT CONTENT:
${text.slice(0, MAX_TEXT_CHARS)}`;
        }

        const result = await generateStructuredJson({
            model: GEMINI_MODELS.FAST,
            contents,
            jsonSchema: GENERATED_QUIZ_JSON_SCHEMA,
            zodSchema: GeneratedQuizSchema,
            thinkingLevel: ThinkingLevel.HIGH,
            temperature: 0.3,
            maxOutputTokens: 8192,
        });

        return NextResponse.json({ items: result.items });
    } catch (error) {
        return handleGeminiRouteError("PDF AI Generation Error", error);
    }
}
