import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function POST(req: Request) {
    console.log("[API] AI complete-fields hit");
    try {
        const { items, targetFields, contextFields, targetLanguage } = await req.json();

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json(
                { error: "GEMINI_API_KEY is not configured" },
                { status: 500 }
            );
        }

        // EXPLANATION: 
        // - 'targetFields' corresponds to the properties marked with "Sparkles" in the UI.
        // - 'contextFields' is usually the prompt (e.g., the Kanji) to help the AI understand the item.
        // - 'targetLanguage' is the language chosen in the input field.
        console.log(`[AI] Processing ${items.length} items. Targets: ${targetFields.join(', ')} | Language: ${targetLanguage}`);

        const aiPrompt = `
      You are an expert data completion and translation assistant.
      
      TASK:
      1. For the specified TARGET FIELDS:
         - If empty: Infer the value from the context.
         - If not empty: Translate it into ${targetLanguage || 'the original language'}.
         - If it's an array: Translate each element.
      2. YOU MUST PRESERVE THE "_key" field for every item.

      TARGET FIELDS: ${targetFields.join(", ")}
      CONTEXT FIELDS: ${contextFields.join(", ")}
      ${targetLanguage ? `TARGET LANGUAGE: ${targetLanguage}` : ""}

      ITEMS:
      ${JSON.stringify(items, null, 2)}

      Return ONLY a JSON array of the updated objects. No markdown, no talk.
    `;

        const response = await client.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ role: "user", parts: [{ text: aiPrompt }] }]
        });

        const text = response.text;
        console.log(`[AI] Raw response received. Length: ${text?.length || 0} ___ ${text}`);
        console.log(text);

        if (!text) {
            throw new Error("Empty response from AI");
        }

        // Attempt to parse JSON from AI response (handling potential markdown wrapping)
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        const completedItems = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

        if (!completedItems) {
            console.error("[AI] Failed to parse response text:", text);
            throw new Error("Failed to parse AI response as JSON array");
        }

        console.log(`[AI] Successfully parsed ${completedItems.length} items.`);
        return NextResponse.json({ items: completedItems });
    } catch (error: any) {
        console.error("AI Complete Fields Error:", error);
        return NextResponse.json(
            { error: "Failed to complete fields", details: error.message },
            { status: 500 }
        );
    }
}
