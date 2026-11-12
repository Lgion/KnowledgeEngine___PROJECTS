import { NextResponse } from "next/server";
import { GEMINI_MODELS, ThinkingLevel, generatePlainText, handleGeminiRouteError } from "@/lib/gemini";

export async function POST(req: Request) {
    try {
        const { prompt, answer, userChoice, notes } = await req.json();

        if (!prompt || !answer) {
            return NextResponse.json(
                { error: "Missing prompt or answer" },
                { status: 400 }
            );
        }

        const aiPrompt = `Act as a concise pedagogical tutor for a learner who just made a mistake in a spaced-repetition quiz.

CONTEXT:
- Question/Prompt: "${prompt}"
- Correct Answer: "${answer}"
- Student's Wrong Choice: "${userChoice || "Unknown"}"
- Existing Notes: "${notes || "None"}"

TASK:
Provide a sharp, encouraging explanation (under 280 characters) in the same language as the learner's content/notes.
Explain WHY the correct answer fits and why their choice was a plausible trap—create an instant conceptual "click" without merely repeating the answer.`;

        const explanation = await generatePlainText({
            model: GEMINI_MODELS.FAST,
            contents: aiPrompt,
            thinkingLevel: ThinkingLevel.LOW,
            temperature: 0.4,
        });

        return NextResponse.json({ explanation });
    } catch (error) {
        return handleGeminiRouteError("AI Tutor Error", error);
    }
}
