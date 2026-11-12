import { NextResponse } from "next/server";
import { z } from "zod";
import { GEMINI_MODELS, ThinkingLevel, generateStructuredJson, handleGeminiRouteError } from "@/lib/gemini";

const CandidateSchema = z.object({
    id: z.string(),
    prompt: z.string(),
    answer: z.string(),
});

const ConfusionResponseZod = z.object({
    confusions: z.array(
        z.object({
            id: z.string(),
            reason: z.string(),
        })
    ),
});

const CONFUSION_JSON_SCHEMA = {
    type: "object",
    properties: {
        confusions: {
            type: "array",
            description: "Up to 4 items from the candidate list most likely to be semantically confused with the target item.",
            items: {
                type: "object",
                properties: {
                    id: { type: "string", description: "Exact ID of a candidate from the list." },
                    reason: { type: "string", description: "Short explanation (<= 100 chars) of why learners confuse them." },
                },
                required: ["id", "reason"],
            },
        },
    },
    required: ["confusions"],
};

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const target = CandidateSchema.parse(body.target);
        const candidates = z.array(CandidateSchema).parse(body.candidates)
            .filter(c => c.id !== target.id)
            .slice(0, 150);

        if (candidates.length === 0) {
            return NextResponse.json({ confusions: [] });
        }

        const aiPrompt = `Identify up to 4 items from CANDIDATES that a learner is most likely to confuse with TARGET due to semantic similarity, false friends, overlapping concepts, phonetic closeness, or opposite/paired meanings.

TARGET:
${JSON.stringify(target)}

CANDIDATES:
${JSON.stringify(candidates)}

RULES:
- Only select IDs that exist verbatim in CANDIDATES.
- Prioritize genuine conceptual/semantic confusion over mere spelling overlap.
- If fewer than 4 are genuinely confusable, return fewer.`;

        const result = await generateStructuredJson({
            model: GEMINI_MODELS.FAST,
            contents: aiPrompt,
            jsonSchema: CONFUSION_JSON_SCHEMA,
            zodSchema: ConfusionResponseZod,
            thinkingLevel: ThinkingLevel.MEDIUM,
            temperature: 0.2,
        });

        const validIds = new Set(candidates.map(c => c.id));
        const filtered = result.confusions
            .filter(item => validIds.has(item.id) && item.id !== target.id)
            .slice(0, 4);

        return NextResponse.json({ confusions: filtered });
    } catch (error) {
        return handleGeminiRouteError("AI Confusions Error", error);
    }
}

