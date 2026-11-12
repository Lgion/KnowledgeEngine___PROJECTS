import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function POST(req: Request) {
    try {
        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: "GEMINI_API_KEY is not configured" }, { status: 500 });
        }

        const { items, instruction, mode } = await req.json();

        if (!items || !Array.isArray(items)) {
            return NextResponse.json({ error: "No items provided" }, { status: 400 });
        }

        let taskDescription = "";

        if (mode === "smart_swap") {
            taskDescription = `
            TASK: SWAP columns. The current "prompt" should become the "answer", and the current "answer" should become the "prompt".
            CRITICAL: If the new prompt (former answer) is just a keyword, turn it into a question or definition request.
            EXAMPLE:
            Input: { prompt: "What is the capital of France?", answer: "Paris" }
            Output: { prompt: "What city is the capital of France?", answer: "Paris" } -> WAIT, wrong direction.
            Correct Output for Swap: { prompt: "What country has Paris as its capital?", answer: "France" }
            `;
        } else {
            taskDescription = `
             TASK: Refine the following quiz items based on this instruction: "${instruction || "Improve clarity and correctness"}".
             Keep the same JSON structure.
             `;
        }

        const aiPrompt = `
      Act as an expert teacher and editor.
      
      ${taskDescription}

      INPUT ITEMS:
      ${JSON.stringify(items.slice(0, 50))} // Processing in batches of 50 to be safe
      
      OUTPUT FORMAT:
      Respond ONLY with a JSON array of objects:
      [
        {
          "prompt": "...",
          "answer": "...",
          "notes": "..."
        },
        ...
      ]
    `;

        const response = await client.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ role: "user", parts: [{ text: aiPrompt }] }]
        });

        const responseText = response.text ? response.text.trim() : "";

        if (!responseText) {
            throw new Error("Empty response from AI");
        }

        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        const newItems = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

        return NextResponse.json({ items: newItems });

    } catch (error: unknown) {
        console.error("AI Refine Error:", error);
        return NextResponse.json(
            { error: "Failed to refine items", details: (error as Error).message },
            { status: 500 }
        );
    }
}
