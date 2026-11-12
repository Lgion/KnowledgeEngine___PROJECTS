import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import clientPromise from "@/lib/mongodb";
import { KnowledgeBundleSchema } from "@/schemas/zod_models";

/**
 * Marketplace API
 * GET: Fetch all public bundles
 * POST: Share a bundle to the community
 */

export async function GET() {
    try {
        const client = await clientPromise;
        const db = client.db(process.env.MONGODB_DB);
        const collection = db.collection("marketplace_bundles");

        // Fetch public bundles (limited to 50 for MVP)
        const bundles = await collection.find({ isPublic: true })
            .sort({ createdAt: -1 })
            .limit(50)
            .toArray();

        return NextResponse.json({ bundles });
    } catch (error) {
        console.error("Marketplace Fetch Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { bundle } = body;

        // Validate bundle structure
        const validatedData = KnowledgeBundleSchema.safeParse(bundle);
        if (!validatedData.success) {
            return NextResponse.json({ error: "Invalid bundle data" }, { status: 400 });
        }

        const client = await clientPromise;
        const db = client.db(process.env.MONGODB_DB);
        const collection = db.collection("marketplace_bundles");

        // Share/Update a bundle in the marketplace
        // We only share the Source and essential metadata for others to "clone"
        const marketplaceItem = {
            ...validatedData.data,
            userId,
            isPublic: true,
            sharedAt: new Date(),
            downloadCount: 0,
            likes: 0
        };

        const result = await collection.updateOne(
            { "source.id": bundle.source.id },
            { $set: marketplaceItem },
            { upsert: true }
        );

        return NextResponse.json({ success: true, result });
    } catch (error) {
        console.error("Marketplace Share Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
