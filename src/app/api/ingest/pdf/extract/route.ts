import { NextResponse } from "next/server";
import pdf from "pdf-parse";

export const runtime = "nodejs";

export async function POST(req: Request) {
    console.log(">>> [API] Received PDF Extraction Request");
    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;

        if (!file) {
            console.error(">>> [API] PDF Extraction Error: No file provided");
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        console.log(`>>> [API] Extracting text from file: ${file.name} (${file.size} bytes)`);
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        console.log(">>> [API] Calling pdf-parse...");
        const pdfData = await pdf(buffer);
        console.log(">>> [API] pdf-parse successful. Pages:", pdfData.numpages);

        return NextResponse.json({
            text: pdfData.text,
            metadata: {
                pageCount: pdfData.numpages,
                info: pdfData.info
            }
        });
    } catch (error: unknown) {
        console.error(">>> [API] PDF Extraction Error:", error);
        return NextResponse.json(
            { error: "Failed to extract text from PDF", details: (error as Error).message },
            { status: 500 }
        );
    }
}
