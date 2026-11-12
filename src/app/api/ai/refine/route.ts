import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function POST(req: Request) {
    try {
        const { prompt, answer, notes, history } = await req.json();

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json(
                { error: "GEMINI_API_KEY is not configured" },
                { status: 500 }
            );
        }

        const aiPrompt = `
      As a pedagogical expert in memory and SRS (Spaced Repetition System), your task is to refine a quiz item to make it easier to memorize.
      
      ITEM DATA:
      - Prompt: "${prompt}"
      - Answer: "${answer}"
      - Current Notes: "${notes || "None"}"
      - Recent History (last 10 attempts, 1=forgot/fail, 5=perfect/reflex): ${JSON.stringify(history)}

      INSTRUCTIONS:
      1. Analyze the relationship between the prompt and the answer.
      2. If there are recent failures (low scores in history), identify potential confusion patterns.
      3. Generate a "Mnemonic / Note" (short, punchy, helps bridge the gap).
      4. Generate a "Hint" (gives a clue without giving the answer).
      5. Identify "Confusion Patterns" (why might someone mistake this for something else?).

      Respond ONLY with a JSON object in this format:
      {
        "improvedNotes": "string (the mnemonic/explanation)",
        "improvedHint": "string (the clue)",
        "confusionPatterns": "string (optional: what to watch out for)"
      }
    `;

        const response = await client.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ role: "user", parts: [{ text: aiPrompt }] }]
        });
        const text = response.text;

        if (!text) {
            throw new Error("Empty response from AI");
        }

        // Attempt to parse JSON from AI response (handling potential markdown wrapping)
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const refinedData = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

        if (!refinedData) {
            throw new Error("Failed to parse AI response as JSON");
        }

        return NextResponse.json(refinedData);
    } catch (error: any) {
        console.error("AI Refine Error:", error);
        return NextResponse.json(
            { error: "Failed to refine item", details: error.message },
            { status: 500 }
        );
    }
}
