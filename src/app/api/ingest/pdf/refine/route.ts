import { NextResponse } from "next/server";
import { z } from "zod";
import { GEMINI_MODELS, ThinkingLevel, generateStructuredJson, handleGeminiRouteError } from "@/lib/gemini";
import { enforcePdfIngestQuota } from "@/lib/rate_limit";

const CHUNK_SIZE = 50;

const RefinedQuizSchema = z.object({
    items: z.array(
        z.object({
            prompt: z.string(),
            answer: z.string(),
            notes: z.string().optional().default(""),
        })
    ),
});

const REFINED_QUIZ_JSON_SCHEMA = {
    type: "object",
    properties: {
        items: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    prompt: { type: "string" },
                    answer: { type: "string" },
                    notes: { type: "string" },
                },
                required: ["prompt", "answer", "notes"],
            },
        },
    },
    required: ["items"],
};

export async function POST(req: Request) {
    try {
        const quotaError = await enforcePdfIngestQuota();
        if (quotaError) return quotaError;

        const { items, instruction, mode } = await req.json();

        if (!Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: "No items provided" }, { status: 400 });
        }

        const taskDescription = mode === "smart_swap"
            ? `TASK: SWAP columns intelligently. The current "prompt" should become the "answer", and the current "answer" should become the "prompt".
CRITICAL: If the new prompt (former answer) is only a bare keyword or phrase, rephrase it as a clear question or definition prompt so the card remains natural to answer.
EXAMPLE:
Input: { prompt: "What is the capital of France?", answer: "Paris" }
Output: { prompt: "What country has Paris as its capital?", answer: "France" }`
            : `TASK: Refine the following quiz items based on this instruction: "${instruction || "Improve clarity and correctness"}".
Preserve accuracy and keep all items aligned one-to-one.`;

        const allRefined: z.infer<typeof RefinedQuizSchema>["items"] = [];

        for (let i = 0; i < items.length; i += CHUNK_SIZE) {
            const batch = items.slice(i, i + CHUNK_SIZE);
            const aiPrompt = `Act as an expert teacher and curriculum editor.

${taskDescription}

INPUT ITEMS (${batch.length} items):
${JSON.stringify(batch)}`;

            const result = await generateStructuredJson({
                model: GEMINI_MODELS.FAST,
                contents: aiPrompt,
                jsonSchema: REFINED_QUIZ_JSON_SCHEMA,
                zodSchema: RefinedQuizSchema,
                thinkingLevel: ThinkingLevel.MEDIUM,
                temperature: 0.2,
                maxOutputTokens: 8192,
            });

            allRefined.push(...result.items);
        }

        return NextResponse.json({ items: allRefined });
    } catch (error) {
        return handleGeminiRouteError("PDF Refine Error", error);
    }
}
