import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function POST(req: Request) {
    console.log(">>> [API] Received AI Generation Request");
    try {
        if (!process.env.GEMINI_API_KEY) {
            console.error(">>> [API] AI Generation Error: GEMINI_API_KEY is not configured");
            return NextResponse.json({ error: "GEMINI_API_KEY is not configured" }, { status: 500 });
        }

        const { text, customPrompt, targetLanguage } = await req.json();

        if (!text || text.trim().length === 0) {
            console.error(">>> [API] AI Generation Error: No text provided");
            return NextResponse.json({ error: "No text provided" }, { status: 400 });
        }

        console.log(`>>> [API] Generating items from text (length: ${text.length}). Language: ${targetLanguage || "Default"}`);

        const aiPrompt = `
      Act as an expert teacher. Extract key concepts from the following text and convert them into a quiz bundle.
      
      TEXT CONTENT:
      ${text.slice(0, 30000)}
      
      USER INSTRUCTIONS:
      ${customPrompt ? `Focus on: ${customPrompt}` : "Extract the most important information."}
      ${targetLanguage ? `OUTPUT LANGUAGE: All content (Prompt, Answer, Notes) MUST be in ${targetLanguage}.` : ""}
      
      TASK:
      Create 5-15 high-quality quiz items based on the most important information.
      Each item must have a "prompt" (question), "answer" (concise), and "notes" (brief explanation or mnemonic).
 
      OUTPUT FORMAT:
      Respond ONLY with a JSON array of objects:
      [
        {
          "prompt": "Question here?",
          "answer": "Answer here",
          "notes": "Context or mnemonic here"
        },
        ...
      ]
    `;

        console.log(">>> [API] Calling Gemini AI...");
        const response = await client.models.generateContent({
            model: "gemini-2.0-flash",
            contents: [{ role: "user", parts: [{ text: aiPrompt }] }]
        });
        console.log(">>> [API] Gemini AI response received.");

        const responseText = response.text ? response.text.trim() : "";

        if (!responseText) {
            console.error(">>> [API] AI Generation Error: Empty response from AI");
            throw new Error("Empty response from AI");
        }

        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        const items = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
        console.log(`>>> [API] Successfully parsed ${items.length} items.`);

        return NextResponse.json({ items });

    } catch (error: unknown) {
        console.error(">>> [API] AI Generation Error:", error);
        return NextResponse.json(
            { error: "Failed to generate items", details: (error as Error).message },
            { status: 500 }
        );
    }
}
