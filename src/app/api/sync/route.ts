import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import clientPromise from "@/lib/mongodb";
import { KnowledgeBundleSchema } from "@/schemas/zod_models";

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
            return NextResponse.json({ error: "Invalid bundle data", details: validatedData.error }, { status: 400 });
        }

        const client = await clientPromise;
        const db = client.db(process.env.MONGODB_DB);
        const collection = db.collection("user_bundles");

        // Upsert the bundle for this user
        // We use the source ID as the unique identifier for the bundle in the cloud
        const result = await collection.updateOne(
            { userId, "source.id": bundle.source.id },
            {
                $set: {
                    ...validatedData.data,
                    userId,
                    syncedAt: new Date()
                }
            },
            { upsert: true }
        );

        return NextResponse.json({ success: true, result });
    } catch (error) {
        console.error("Sync Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const client = await clientPromise;
        const db = client.db(process.env.MONGODB_DB);
        const collection = db.collection("user_bundles");

        const bundles = await collection.find({ userId }).toArray();

        return NextResponse.json({ bundles });
    } catch (error) {
        console.error("Fetch Sync Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
