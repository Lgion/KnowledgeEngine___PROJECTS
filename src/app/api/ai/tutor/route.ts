import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

const client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function POST(req: Request) {
    try {
        const { prompt, answer, userChoice, notes } = await req.json();

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json(
                { error: "GEMINI_API_KEY is not configured" },
                { status: 500 }
            );
        }

        const aiPrompt = `
      Act as a pedagogical tutor for a student learning a complex subject. 
      The student just made a mistake in a quiz.
      
      CONTEXT:
      - Question/Prompt: "${prompt}"
      - Correct Answer: "${answer}"
      - Student's Wrong Choice: "${userChoice || "Unknown"}"
      - Item Notes: "${notes || "None"}"

      TASK:
      Provide a concise (under 250 characters), encouraging, and pedagogical explanation. 
      Help the student understand WHY the correct answer is right and why their choice might have been a common mistake.
      Do not just repeat the answer. Give a conceptual "click".

      FORMAT:
      Return a plain text explanation.
    `;

        const response = await client.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ role: "user", parts: [{ text: aiPrompt }] }]
        });
        const text = response.text ? response.text.trim() : "";

        if (!text) {
            throw new Error("Empty response from AI");
        }

        return NextResponse.json({ explanation: text });
    } catch (error: any) {
        console.error("AI Tutor Error:", error);
        return NextResponse.json(
            { error: "Failed to generate explanation", details: error.message },
            { status: 500 }
        );
    }
}
