import { NextResponse } from "next/server";
import { z } from "zod";
import { GEMINI_MODELS, ThinkingLevel, generateStructuredJson, handleGeminiRouteError } from "@/lib/gemini";

const CompleteFieldsResponseZod = z.object({
    items: z.array(
        z.record(z.string(), z.unknown()).refine(
            (item) => item._key !== undefined && item._key !== null,
            { message: "Each item must preserve _key" }
        )
    ),
});

function buildCompleteFieldsSchema(targetFields: string[], contextFields: string[]): Record<string, unknown> {
    const itemProperties: Record<string, unknown> = {
        _key: { type: "string", description: "Original _key preserved verbatim." },
    };

    for (const field of contextFields) {
        itemProperties[field] = {
            anyOf: [
                { type: "string" },
                { type: "array", items: { type: "string" } },
            ],
        };
    }

    for (const field of targetFields) {
        itemProperties[field] = {
            anyOf: [
                { type: "string" },
                { type: "array", items: { type: "string" } },
            ],
        };
    }

    return {
        type: "object",
        properties: {
            items: {
                type: "array",
                items: {
                    type: "object",
                    properties: itemProperties,
                    required: ["_key", ...targetFields],
                },
            },
        },
        required: ["items"],
    };
}

export async function POST(req: Request) {
    try {
        const { items, targetFields, contextFields, targetLanguage } = await req.json();

        if (!Array.isArray(items) || !Array.isArray(targetFields) || targetFields.length === 0) {
            return NextResponse.json(
                { error: "items and targetFields arrays are required" },
                { status: 400 }
            );
        }

        const safeContextFields = Array.isArray(contextFields) ? contextFields : [];

        const aiPrompt = `You are a precision data completion and translation engine.

TASK:
For each item in ITEMS:
1. Preserve the "_key" string value EXACTLY as provided.
2. For each TARGET FIELD:
   - If empty/missing: infer the accurate value using the CONTEXT FIELDS.
   - If non-empty: translate/adapt it accurately into ${targetLanguage || "its original language"}.
   - If the field is an array of strings: preserve array structure and translate/complete each element.

TARGET FIELDS: ${targetFields.join(", ")}
CONTEXT FIELDS: ${safeContextFields.join(", ") || "None"}
${targetLanguage ? `TARGET LANGUAGE: ${targetLanguage}` : ""}

ITEMS:
${JSON.stringify(items)}`;

        const result = await generateStructuredJson({
            model: GEMINI_MODELS.FAST,
            contents: aiPrompt,
            jsonSchema: buildCompleteFieldsSchema(targetFields, safeContextFields),
            zodSchema: CompleteFieldsResponseZod,
            thinkingLevel: ThinkingLevel.LOW,
            temperature: 0.2,
        });

        return NextResponse.json({ items: result.items });
    } catch (error) {
        return handleGeminiRouteError("AI Complete Fields Error", error);
    }
}
