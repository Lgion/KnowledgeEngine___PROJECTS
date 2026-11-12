import { NextResponse } from "next/server";
import { z } from "zod";
import { GEMINI_MODELS, ThinkingLevel, generateStructuredJson, handleGeminiRouteError } from "@/lib/gemini";

const RefineResponseZod = z.object({
    improvedNotes: z.string(),
    improvedHint: z.string(),
    confusionPatterns: z.string().optional().default(""),
});

const REFINE_JSON_SCHEMA = {
    type: "object",
    properties: {
        improvedNotes: {
            type: "string",
            description: "Concise, vivid mnemonic or conceptual bridge helping memorize prompt -> answer.",
        },
        improvedHint: {
            type: "string",
            description: "Helpful clue shown before answering without giving away the answer directly.",
        },
        confusionPatterns: {
            type: "string",
            description: "Short warning describing common traps or lookalike items based on history.",
        },
    },
    required: ["improvedNotes", "improvedHint", "confusionPatterns"],
};

export async function POST(req: Request) {
    try {
        const { prompt, answer, notes, history } = await req.json();

        if (!prompt || !answer) {
            return NextResponse.json(
                { error: "Missing prompt or answer" },
                { status: 400 }
            );
        }

        const aiPrompt = `As an expert in cognitive science and spaced repetition (SRS), refine this quiz item to maximize retention.

ITEM DATA:
- Prompt: "${prompt}"
- Answer: "${answer}"
- Current Notes: "${notes || "None"}"
- Recent History (last 10 attempts; 1 = forgot, 5 = instant reflex): ${JSON.stringify(history || [])}

INSTRUCTIONS:
1. Analyze the link between prompt and answer and any repeated failures in the history.
2. Write "improvedNotes": a memorable, punchy mnemonic or explanation (preserving useful existing notes if any).
3. Write "improvedHint": a subtle clue that nudges recall without spoiling the answer.
4. Write "confusionPatterns": what similar concepts/terms could trap the learner here.`;

        const refinedData = await generateStructuredJson({
            model: GEMINI_MODELS.DEEP,
            contents: aiPrompt,
            jsonSchema: REFINE_JSON_SCHEMA,
            zodSchema: RefineResponseZod,
            thinkingLevel: ThinkingLevel.MEDIUM,
            temperature: 0.3,
        });

        return NextResponse.json(refinedData);
    } catch (error) {
        return handleGeminiRouteError("AI Refine Error", error);
    }
}
