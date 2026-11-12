import { NextResponse } from "next/server";
import { z } from "zod";
import { GEMINI_MODELS, ThinkingLevel, generateStructuredJson, handleGeminiRouteError } from "@/lib/gemini";

const SuggestMappingZod = z.object({
    promptField: z.string(),
    answerField: z.array(z.string()).min(1),
    tipFields: z.array(z.string()).default([]),
    reason: z.string(),
});

const SUGGEST_MAPPING_JSON_SCHEMA = {
    type: "object",
    properties: {
        promptField: {
            type: "string",
            description: "Best single field name from detectedFields to serve as the quiz question/cue.",
        },
        answerField: {
            type: "array",
            items: { type: "string" },
            description: "One or more field names from detectedFields representing the quiz answer(s).",
        },
        tipFields: {
            type: "array",
            items: { type: "string" },
            description: "Optional supporting fields from detectedFields suitable as hints (must not overlap promptField or answerField).",
        },
        reason: {
            type: "string",
            description: "Short explanation of why this mapping fits the dataset.",
        },
    },
    required: ["promptField", "answerField", "tipFields", "reason"],
};

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const detectedFields = z.array(z.string()).min(1).parse(body.detectedFields);
        const sampleItems = z.array(z.record(z.string(), z.unknown())).parse(body.sampleItems || []).slice(0, 5);
        const fileName = typeof body.fileName === "string" ? body.fileName : "";

        const aiPrompt = `Analyze this flashcard/dataset schema and propose the best quiz field mapping.

SOURCE FILE: "${fileName || "Unknown"}"
DETECTED FIELDS: ${JSON.stringify(detectedFields)}
SAMPLE ITEMS:
${JSON.stringify(sampleItems, null, 2)}

RULES:
- Use ONLY exact field names from DETECTED FIELDS.
- "promptField": the primary cue/word/question shown before answering.
- "answerField": 1 or more target fields the learner should recall.
- "tipFields": optional contextual/reading/example/part-of-speech fields useful as hints (must not include promptField or answerField).`;

        const result = await generateStructuredJson({
            model: GEMINI_MODELS.FAST,
            contents: aiPrompt,
            jsonSchema: SUGGEST_MAPPING_JSON_SCHEMA,
            zodSchema: SuggestMappingZod,
            thinkingLevel: ThinkingLevel.LOW,
            temperature: 0.1,
        });

        const allowed = new Set(detectedFields);
        const promptField = allowed.has(result.promptField) ? result.promptField : detectedFields[0];
        const answerField = result.answerField.filter(f => allowed.has(f) && f !== promptField);
        const finalAnswerField = answerField.length > 0
            ? answerField
            : [detectedFields.find(f => f !== promptField) ?? detectedFields[0]];
        const answerSet = new Set(finalAnswerField);
        const tipFields = (result.tipFields ?? []).filter(f => allowed.has(f) && f !== promptField && !answerSet.has(f));

        return NextResponse.json({
            promptField,
            answerField: finalAnswerField,
            tipFields,
            reason: result.reason,
        });
    } catch (error) {
        return handleGeminiRouteError("AI Suggest Mapping Error", error);
    }
}

